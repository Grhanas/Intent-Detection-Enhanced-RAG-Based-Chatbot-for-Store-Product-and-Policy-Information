export default {

  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // Test endpoint
    if (url.pathname === "/") {
      return new Response("HELLO WORLD 👋 Worker çalışıyor!", {
        headers: { ...corsHeaders(), "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // CHAT endpoint
    if (url.pathname === "/chat") {
      if (request.method !== "POST") {
        return new Response("POST atmalısın", {
          status: 405,
          headers: { ...corsHeaders(), "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      const t0 = Date.now();

      let message = "";
      try {
        const body = await request.json();
        message = (body?.message ?? "").toString().trim();
      } catch {}

      if (!message) {
        return json({ reply: "Mesaj boş görünüyor. Bir şey yazar mısın?" }, t0);
      }
      if (message.length > 2000) {
        return json({ reply: "Mesaj çok uzun. Daha kısa yazar mısın?" }, t0);
      }

      try {
        const reply = await askOpenAI(env, message);
        return json({ reply }, t0);
      } catch (e) {
        return json({ reply: friendlyError(e) + "\n\nDEBUG: " + String(e?.message || e) }, t0);
      }
    }

    return new Response("404", {
      status: 404,
      headers: { ...corsHeaders(), "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

// --------------------
// Helpers
// --------------------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(obj, t0) {
  return new Response(JSON.stringify({ ...obj, _ms: Date.now() - t0 }), {
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
  });
}

function friendlyError(e) {
  const msg = String(e?.message || e);

  if (msg.includes("401") || msg.toLowerCase().includes("invalid api key")) {
    return "⚠️ OpenAI API key hatalı veya eksik.";
  }
  if (msg.toLowerCase().includes("insufficient_quota")) {
    return "⚠️ OpenAI quota/billing yetersiz.";
  }
  if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
    return "⚠️ Çok hızlı istek atıldı. Biraz sonra tekrar dener misin?";
  }
  if (msg.includes("timeout")) {
    return "⚠️ Zaman aşımı. Tekrar dener misin?";
  }
  return "⚠️ Şu an cevap üretilemedi.";
}

// --------------------
// RAG + OpenAI
// --------------------
async function askOpenAI(env, userText) {
  const userAug = `${userText}

  If you mention any product, include the product URL(s).`;
  if (!env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  // RAG context çek
  const rag = await retrieveContext(env, userText, 6);

  const system = [
    "You are Toprank Leathers' e-commerce assistant.",
    "Reply in English only.",
    "Be concise, helpful, and sales-oriented.",
    "Use ONLY the STORE CONTEXT as ground truth.",
    "Do not invent prices, stock, delivery promises, or policies.",
    "If the answer is not in the context, ask ONE short clarifying question.",
    "When you recommend or mention a product, ALWAYS include its URL if available in the context.",
    "If multiple relevant products exist, provide up to 3 options with their URLs.",
    "",
    "STORE CONTEXT:",
    rag.contextText || "(No relevant context found.)",
  ].join("\n");  

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort("timeout"), 20000);

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: ctrl.signal,
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      input: [
        { role: "system", content: system },
        { role: "user", content: userAug }
      ],
    }),
  }).finally(() => clearTimeout(timeout));

  const rawText = await res.text().catch(() => "");
  if (!res.ok) {
    console.log("OPENAI_HTTP_ERROR:", res.status, rawText);
    throw new Error(`OPENAI_HTTP_${res.status}: ${rawText}`);
  }

  let data = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.log("OPENAI_PARSE_ERROR:", rawText.slice(0, 300));
    throw new Error("OPENAI_PARSE_ERROR: response not JSON");
  }

  const direct = (data?.output_text || "").trim();
  if (direct) return direct;

  const extracted = extractTextFromResponses(data);
  if (extracted) return extracted;

  console.log("OPENAI_EMPTY_OUTPUT:", { id: data?.id, model: data?.model });
  return "Sorry—I'm having trouble generating a response right now.";
}

// Vectorize -> KV -> context string
async function retrieveContext(env, query, topK = 6) {
  if (!env.VECTORIZE_INDEX) throw new Error("Missing VECTORIZE_INDEX binding");
  if (!env.RAG_KV) throw new Error("Missing RAG_KV binding");

  const qVec = await embedOpenAI(env, query);

  const results = await env.VECTORIZE_INDEX.query(qVec, { topK });
  const matches = Array.isArray(results?.matches) ? results.matches : [];

  const chunks = [];
  for (const m of matches) {
    const id = m?.id;
    if (!id) continue;

    const raw = await env.RAG_KV.get(id);
    if (!raw) continue;

    let obj;
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = { text: raw, metadata: {} };
    }

    chunks.push(formatContextItem(obj));
  }

  return { contextText: chunks.join("\n\n").slice(0, 9000) };
}

function formatContextItem(obj) {
  const text = (obj?.text || "").trim();
  const md = obj?.metadata || {};
  const type = md?.type || "doc";

  if (type === "faq") {
    return `FAQ\nQ: ${md?.question || "Question"}\nA: ${text}`;
  }

  if (type === "product") {
    const url = md?.url || md?.link || "";
    return `PRODUCT
Name: ${md?.title || md?.name || "Product"}
URL: ${url}
Description: ${text}`;
  }

  return `DOC\n${text}`;
}

async function embedOpenAI(env, text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log("EMBED_ERROR:", res.status, JSON.stringify(data).slice(0, 800));
    throw new Error(`EMBED_${res.status}`);
  }

  const vec = data?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("EMBED_NO_VECTOR");
  return vec;
}

// Responses API çıktısından metin çıkarma (sağlam)
function extractTextFromResponses(data) {
  try {
    const out = data?.output;
    if (!Array.isArray(out)) return "";

    let buf = "";
    for (const item of out) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        if (typeof c?.text === "string") buf += c.text;
        if (typeof c?.value === "string") buf += c.value;
      }
    }
    return (buf || "").trim();
  } catch (e) {
    console.log("EXTRACT_ERROR:", String(e));
    return "";
  }
}
