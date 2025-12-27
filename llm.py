import time, traceback
from openai import OpenAI

def friendly_openai_error(e: Exception) -> str:
    msg = str(e)
    low = msg.lower()
    if "invalid_api_key" in low or "incorrect api key" in low:
        return "⚠️ Invalid API key. config.py içindeki OPENAI_API_KEY doğru mu?"
    if "insufficient_quota" in msg or "insufficient quota" in low:
        return "⚠️ OpenAI API quota/billing yetersiz. Billing ekleyip tekrar dene."
    if "rate limit" in low:
        return "⚠️ Rate limit: çok hızlı istek attın. 10-20 sn sonra tekrar dene."
    if "timeout" in low:
        return "⚠️ Timeout/connection sorunu. İnterneti kontrol edip tekrar dene."
    return f"⚠️ OpenAI hatası: {msg}"

class LLMClient:
    def __init__(self, api_key: str, model: str):
        if not api_key or not api_key.strip().startswith("sk-"):
            raise RuntimeError("OPENAI_API_KEY missing/invalid (check config.py).")
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def answer(self, user_query: str, intent: str, context: str):
        system = (
            "You are an e-commerce assistant.\n"
            "Goals: be correct, concise, and sales-oriented.\n"
            "Rules:\n"
            "- Use ONLY the provided context for factual claims.\n"
            "- If context is insufficient, ask 1 short clarifying question.\n"
            "- When recommending, provide 2-3 options and include links if available.\n"
            "- Do not invent prices, stock, delivery promises, or policies.\n"
        )

        user_msg = f"""User query: {user_query}
Detected intent: {intent}

Context:
{context}
"""

        t0 = time.perf_counter()
        try:
            resp = self.client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
            )
            ms = (time.perf_counter() - t0) * 1000
            return resp.output_text, ms, None
        except Exception as e:
            ms = (time.perf_counter() - t0) * 1000
            traceback.print_exc()
            return "", ms, friendly_openai_error(e)
