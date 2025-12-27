import time, traceback
import gradio as gr
from sentence_transformers import SentenceTransformer

import config
from intent import IntentDetector
from rag_store import RAGStore
from llm import LLMClient

# -------- init --------
embedder = SentenceTransformer(config.MODEL_NAME)
intent_detector = IntentDetector(embedder)
store = RAGStore(embedder, config.INDEX_PATH, config.META_PATH)
llm = LLMClient(config.OPENAI_API_KEY, config.GPT_MODEL)

def fmt(ms):
    return "NA" if ms is None else f"{ms:.1f}ms"

def chat_fn(message, history):
    overall_t0 = time.perf_counter()
    message = (message or "").strip()
    if not message:
        return "", history

    history = history or []  # MESSAGES FORMAT (dict list) for your gradio
    timings = {
        "intent_ms": None,
        "q_embed_ms": None,
        "faiss_ms": None,
        "filter_ms": None,
        "context_ms": None,
        "gpt_ms": None,
        "total_ms": None,
    }

    intent, score = "unknown", 0.0
    hits = []
    answer = ""

    # append user message (messages format)
    history.append({"role": "user", "content": message})

    try:
        # 1) intent
        t0 = time.perf_counter()
        intent, score = intent_detector.detect(message)
        timings["intent_ms"] = (time.perf_counter() - t0) * 1000

        # handoff shortcut
        if intent == "handoff":
            answer = "Sure — I can help. What do you need help with (order, return, shipping, product question)?"
            raise RuntimeError("__DONE__")

        # 2) query embed
        q_emb, q_ms = store.embed_query(message)
        timings["q_embed_ms"] = q_ms

        # 3) faiss
        raw_hits, faiss_ms = store.faiss_search(q_emb, config.CANDIDATES)
        timings["faiss_ms"] = faiss_ms

        # 4) filter
        hits, f_ms = store.filter_hits(raw_hits, intent, config.TOP_K)
        timings["filter_ms"] = f_ms

        # 5) context
        context, c_ms = store.build_context(hits)
        timings["context_ms"] = c_ms

        # 6) gpt
        gpt_text, gpt_ms, err = llm.answer(message, intent, context)
        timings["gpt_ms"] = gpt_ms
        answer = err if err else gpt_text

        if not err:
            sources = store.extract_sources(hits)
            if sources:
                answer += "\n\nSources:\n- " + "\n- ".join(sources)
        else:
            # show top matches even if GPT fails
            if hits:
                preview = []
                for h in hits[:3]:
                    md = h.get("metadata", {}) or {}
                    preview.append(md.get("title") or md.get("question") or h.get("id"))
                answer += "\n\nTop matches:\n- " + "\n- ".join(preview)

    except RuntimeError as e:
        if str(e) != "__DONE__":
            traceback.print_exc()
            answer = f"⚠️ Runtime error: {e}"
    except Exception as e:
        traceback.print_exc()
        answer = f"⚠️ Unexpected error: {e}"
    finally:
        timings["total_ms"] = (time.perf_counter() - overall_t0) * 1000
        if config.SHOW_DEBUG:
            answer += (
                f"\n\n(intent={intent}, score={score:.2f})"
                f"\n⏱ intent={fmt(timings['intent_ms'])}"
                f" | q_embed={fmt(timings['q_embed_ms'])}"
                f" | faiss={fmt(timings['faiss_ms'])}"
                f" | filter={fmt(timings['filter_ms'])}"
                f" | context={fmt(timings['context_ms'])}"
                f" | gpt={fmt(timings['gpt_ms'])}"
                f" | total={timings['total_ms']:.1f}ms"
            )

        history.append({"role": "assistant", "content": answer})

    return "", history

with gr.Blocks() as demo:
    gr.Markdown("# Intent-Enhanced E-commerce RAG Chatbot (Local, Modular)")
    gr.Markdown("Files needed: `rag.index`, `rag_meta.pkl` • Retrieval: FAISS • Answer: OpenAI GPT")

    chatbot = gr.Chatbot(height=520)  # no type=... to avoid your version mismatch
    msg = gr.Textbox(placeholder="Ask about products, shipping, returns...")
    clear = gr.Button("Clear")

    msg.submit(chat_fn, inputs=[msg, chatbot], outputs=[msg, chatbot])
    clear.click(lambda: ("", []), outputs=[msg, chatbot])

demo.launch(share=False, server_name="127.0.0.1", server_port=7860)
