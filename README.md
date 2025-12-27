# Intent-Enhanced RAG Chatbot for E-Commerce

This project is a lightweight **Intent Detection–Enhanced Retrieval-Augmented Generation (RAG)** chatbot designed for e-commerce websites.  
It answers customer questions about **products** and **store policies** (shipping, returns, promotions) using a local FAISS index and generates responses with the OpenAI GPT API.

The main goal is to provide **accurate, grounded answers** while remaining **sales-oriented** and **cost-efficient**.

---

## What This Chatbot Does

- Detects **user intent** before retrieval (product search, product Q&A, shipping, returns, price, small talk, handoff)
- Retrieves relevant information using **FAISS vector search**
- Filters retrieved documents based on detected intent
- Generates final responses using **GPT**, strictly grounded in retrieved context
- Avoids hallucinations by not inventing prices, policies, or stock information
- Runs fully **locally** except for the final GPT call

---

## High-Level Flow

User Query  
→ Intent Detection (local embeddings)  
→ Query Embedding (local)  
→ FAISS Search (`rag.index`)  
→ Metadata Lookup (`rag_meta.pkl`)  
→ Context Construction  
→ GPT Answer Generation  

---

## Project Structure

app_gradio.py  
Gradio-based UI entry point for local testing

intent.py  
Embedding-based intent detection logic

rag_store.py  
FAISS search, metadata filtering, and context construction

llm.py  
OpenAI GPT client wrapper with error handling

config.py  
Local configuration file (API key should NOT be committed)

requirements.txt  
Python dependencies

rag.index  
FAISS vector index (generated, not committed)

rag_meta.pkl  
Document metadata store (generated, not committed)

---

## Installation

Install dependencies:

pip install -r requirements.txt

---

## OpenAI API Key Setup

Do NOT hardcode secrets in the repository.

Recommended approach:

Set the API key as an environment variable.

PowerShell:
setx OPENAI_API_KEY "sk-YOUR_KEY"

Git Bash:
export OPENAI_API_KEY="sk-YOUR_KEY"

Restart the terminal after setting the key.

---

## Running the Chatbot Locally

Make sure the following files exist in the project directory:
- rag.index
- rag_meta.pkl

Then run:

python app_gradio.py

Open your browser at:
http://127.0.0.1:7860

---

## Notes on Cost Control

- Embeddings for intent detection and retrieval are computed locally
- GPT is called only once per user query
- Designed to stay within low monthly usage limits (e.g. <$10/month for testing)

---

## Security Notes

- API keys must never be committed to GitHub
- __pycache__ and *.pyc files must be ignored
- Generated artifacts (FAISS index, pickle files) should not be tracked

---

## Intended Use Cases

- E-commerce product recommendation
- Product specification questions
- Shipping and return policy clarification
- Promotion and price-related queries
- Customer support handoff routing

---

## Future Improvements

- Slot extraction (brand, category, price range)
- Advanced re-ranking
- Shopify integration
- Hosted backend deployment
- Analytics on user intent distribution
