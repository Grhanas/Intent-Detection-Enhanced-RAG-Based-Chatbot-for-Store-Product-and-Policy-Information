const CHAT_API = "https://toprank-worker.fikirkocakagan.workers.dev/chat";

async function backendSor(mesaj) {
  const res = await fetch(CHAT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: mesaj }),
  });

  if (!res.ok) {
    throw new Error("API hata: " + res.status);
  }

  const data = await res.json();
  return data.reply;
}

// ----------------------------
// Shopify helpers (DOM'dan bağımsız)
// ----------------------------
function normalizeImgUrl(u) {
  if (!u) return null;
  if (u.startsWith("//")) return "https:" + u;
  return u;
}

function extractMarkdownLinks(text) {
  const re = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const links = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    links.push({ title: m[1], url: m[2] });
  }
  return links;
}

function extractProductHandle(productUrl) {
  try {
    const u = new URL(productUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("products");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return null;
  } catch {
    return null;
  }
}

async function fetchShopifyProductByUrl(productUrl) {
  const handle = extractProductHandle(productUrl);
  if (!handle) return null;

  const jsUrl = `https://toprankleather.com/products/${handle}.js`;
  const res = await fetch(jsUrl);
  if (!res.ok) return null;

  const data = await res.json();

  return {
    title: data.title || handle,
    image: normalizeImgUrl(data.featured_image || (data.images && data.images[0])),
    url: `https://toprankleather.com${data.url || `/products/${handle}`}`,
  };
}

// ----------------------------
// UI Bootstrap
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // iki kere yüklenmesin
  if (document.getElementById("chatbot-balon") || document.getElementById("chatbot-panel")) return;

  // Paneli oluştur
  const panel = document.createElement("div");
  panel.id = "chatbot-panel";
  panel.innerHTML = `
    <div id="chatbot-header">
      <div>Toprank Leather Assistant</div>
      <button id="chatbot-close" aria-label="Kapat">×</button>
    </div>
    <div id="chatbot-messages"></div>
    <div id="chatbot-inputbar">
      <input id="chatbot-input" placeholder="Write a message..." />
      <button id="chatbot-send">Send</button>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector("#chatbot-messages");
  const inputEl = panel.querySelector("#chatbot-input");
  const sendBtn = panel.querySelector("#chatbot-send");
  const closeBtn = panel.querySelector("#chatbot-close");

  // Balonu oluştur
  const balon = document.createElement("div");
  balon.id = "chatbot-balon";
  balon.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3C6.48 3 2 6.94 2 11.8c0 2.5 1.27 4.76 3.3 6.34L4 22l4.04-2.02c1.19.33 2.46.51 3.96.51 5.52 0 10-3.94 10-8.8S17.52 3 12 3z"/>
    </svg>
  `;
  document.body.appendChild(balon);

  // --------------------
  // Message helpers
  // --------------------
  function mesajEkleText(text, who) {
    const div = document.createElement("div");
    div.className = `chat-msg ${who}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function mesajEkleHtml(html, who) {
    const div = document.createElement("div");
    div.className = `chat-msg ${who}`;
    div.innerHTML = html; // sadece bizim ürettiğimiz HTML
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addProductCard({ title, image, url, desc }) {
    const wrap = document.createElement("div");
    wrap.className = "product-card";
    wrap.innerHTML = `
      <a href="${url}" target="_blank" rel="noopener">
        ${image ? `<img src="${image}" alt="${title}">` : ""}
        <div class="pc-body">
          <div class="pc-title">${title}</div>
          ${desc ? `<p class="pc-desc">${desc}</p>` : ""}
        </div>
      </a>
    `;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // --------------------
  // Typing UI
  // --------------------
  function typingEkle() {
    const div = document.createElement("div");
    div.className = "chat-msg bot typing";
    div.setAttribute("data-typing", "1");
    div.innerHTML = `
      <div class="typing-dots" aria-label="Assistant is typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function typingSil(typingEl) {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
  }

  // --------------------
  // Bot reply render (gömülü markdown link → kart)
  // --------------------
  async function botMesajRender(replyText) {
    const links = extractMarkdownLinks(replyText);

    if (links.length === 0) {
      mesajEkleText(replyText, "bot");
      return;
    }

    // Linkleri temizle (link başlığı kalsın)
    const cleaned = replyText.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, "$1");
    mesajEkleText(cleaned, "bot");

    for (const l of links) {
      const handle = extractProductHandle(l.url);

      // ürün değilse normal link olarak bas
      if (!handle) {
        mesajEkleHtml(`<a href="${l.url}" target="_blank" rel="noopener">${l.title}</a>`, "bot");
        continue;
      }

      let p = null;
      try {
        p = await fetchShopifyProductByUrl(l.url);
      } catch {}

      addProductCard({
        title: p?.title || l.title,
        image: p?.image || null,
        url: p?.url || l.url,
        desc: "", // istersen sonra backend açıklamasını buraya koyarız
      });
    }
  }

  // --------------------
  // Open / Close
  // --------------------
  balon.addEventListener("click", () => {
    panel.classList.toggle("is-open");
    setTimeout(() => inputEl.focus(), 50);
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.remove("is-open");
  });

  // İlk bot mesajı
  mesajEkleText("Hello 👋 Welcome to Toprank Leathers, how can I help you?", "bot");

  // --------------------
  // Send
  // --------------------
  async function gonder() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    mesajEkleText(text, "user");

    sendBtn.disabled = true;
    inputEl.disabled = true;

    const typingEl = typingEkle();

    try {
      const reply = await backendSor(text);
      typingSil(typingEl);
      await botMesajRender(reply);
    } catch (e) {
      typingSil(typingEl);
      mesajEkleText("Bağlantı hatası: " + e.message, "bot");
    } finally {
      sendBtn.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener("click", gonder);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") gonder();
  });
});
