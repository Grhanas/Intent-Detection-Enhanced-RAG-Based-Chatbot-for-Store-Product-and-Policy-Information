MODEL_NAME = "BAAI/bge-small-en-v1.5"
INDEX_PATH = "rag.index"
META_PATH  = "rag_meta.pkl"

GPT_MODEL = "gpt-4.1-mini"

TOP_K = 6
CANDIDATES = 24
SHOW_DEBUG = True

import os

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GPT_MODEL = os.getenv("GPT_MODEL", "gpt-4o-mini")
