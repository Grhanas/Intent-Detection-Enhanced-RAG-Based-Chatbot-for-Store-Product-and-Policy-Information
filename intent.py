import numpy as np

INTENTS = {
  "product_search": [
    "recommend me a product", "I am looking for", "suggest alternatives", "best option for",
    "which one should I buy", "help me choose"
  ],
  "product_qa": [
    "does this product have", "what are the specs", "is it compatible", "how does it work",
    "what is the capacity", "what comes in the box"
  ],
  "policy_shipping": [
    "shipping time", "delivery details", "how long does shipping take", "shipping cost",
    "when will it arrive"
  ],
  "policy_returns": [
    "return policy", "refund", "can I return", "exchange policy", "how to return"
  ],
  "promo_price": [
    "discount", "coupon", "promotion", "price", "price drop", "deal"
  ],
  "smalltalk": [
    "hello", "hi", "how are you", "thanks", "good morning"
  ],
  "handoff": [
    "talk to an agent", "customer support", "representative", "human help"
  ]
}

class IntentDetector:
    def __init__(self, embedder):
        self.embedder = embedder
        self.intent_names = list(INTENTS.keys())
        self.intent_texts = [" | ".join(INTENTS[k]) for k in self.intent_names]
        self.intent_embs = self.embedder.encode(self.intent_texts, normalize_embeddings=True)

    def detect(self, query: str):
        q = self.embedder.encode([query], normalize_embeddings=True)[0]
        sims = self.intent_embs @ q
        best = int(np.argmax(sims))
        return self.intent_names[best], float(sims[best])
