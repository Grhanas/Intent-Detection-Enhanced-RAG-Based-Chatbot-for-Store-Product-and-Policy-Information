import os, pickle, time
import numpy as np
import faiss

class RAGStore:
    def __init__(self, embedder, index_path: str, meta_path: str):
        assert os.path.exists(index_path), f"{index_path} not found"
        assert os.path.exists(meta_path), f"{meta_path} not found"

        self.embedder = embedder
        self.index = faiss.read_index(index_path)
        self.docs = pickle.load(open(meta_path, "rb"))

    def embed_query(self, query: str):
        t0 = time.perf_counter()
        q_emb = self.embedder.encode([query], normalize_embeddings=True)
        ms = (time.perf_counter() - t0) * 1000
        return q_emb, ms

    def faiss_search(self, q_emb, top_k: int):
        t0 = time.perf_counter()
        D, I = self.index.search(np.array(q_emb, dtype=np.float32), top_k)
        ms = (time.perf_counter() - t0) * 1000
        hits = [self.docs[i] for i in I[0] if i != -1]
        return hits, ms

    def filter_hits(self, raw_hits, intent: str, top_k: int):
        t0 = time.perf_counter()
        if intent == "smalltalk":
            filtered = []
        else:
            filtered = []
            for h in raw_hits:
                md = h.get("metadata", {}) or {}
                t = md.get("type")

                if intent.startswith("policy_") and t != "faq":
                    continue
                if intent in ("product_search", "product_qa") and t != "product":
                    continue
                if intent == "promo_price" and t not in ("product", "faq"):
                    continue

                filtered.append(h)
                if len(filtered) >= top_k:
                    break

            if not filtered:
                filtered = raw_hits[:top_k]

        ms = (time.perf_counter() - t0) * 1000
        return filtered, ms

    @staticmethod
    def build_context(hits, max_chars_per_doc: int = 1500):
        t0 = time.perf_counter()
        parts = []
        for h in hits:
            md = h.get("metadata", {}) or {}
            title = md.get("title") or md.get("question") or h.get("id")
            url = md.get("url")
            dtype = md.get("type")

            header = f"[{dtype}] {title}"
            if url:
                header += f" | {url}"

            text = (h.get("text") or "").strip()
            if len(text) > max_chars_per_doc:
                text = text[:max_chars_per_doc] + "..."
            parts.append(header + "\n" + text)

        context = "\n\n---\n\n".join(parts)
        ms = (time.perf_counter() - t0) * 1000
        return context, ms

    @staticmethod
    def extract_sources(hits, max_sources: int = 6):
        urls = []
        for h in hits:
            md = h.get("metadata", {}) or {}
            u = md.get("url")
            if u:
                urls.append(u)
        seen = set()
        urls = [u for u in urls if not (u in seen or seen.add(u))]
        return urls[:max_sources]
