# 🧠 Intent Detection–Enhanced RAG-Based Chatbot  
### Store Product & Policy Information Assistant

This repository contains a complete pipeline for building a **Retrieval-Augmented Generation (RAG)** chatbot enhanced with **intent detection**. The system is designed for an e-commerce store and supports answering both **product-related** and **policy/FAQ-related** user queries.

---

## 📌 Project Components

### 1️⃣ Web Scraping  

Automated scrapers collect structured data from:

- **Products**  
  Source:  
  https://toprankleather.com/collections/personalized-leather-accessories  

  Extracted fields include:  
  - Title  
  - Leather Type & Color options  
  - Thread Color options  
  - Snap Button Color options  
  - Personalization information  
  - Brand logo option information  
  - Lifetime guarantee description  
  - Estimated delivery text  
  - Main description (features, dimensions, shipping)  
  - Alternative description blocks (if available)  
  - Product URL  

- **FAQ**  
  Source:  
  https://toprankleather.com/pages/faq  

  Each entry is stored as a **question–answer** pair.

Cleaned outputs are stored as:

- `data/products.json`  
- `data/faq.json`

---

### 2️⃣ RAG Preprocessing  

A preprocessing script prepares the data for RAG-based retrieval:

- Merges product and FAQ content  
- Cleans HTML and normalizes text  
- Concatenates important sections (description, features, shipping, guarantee, etc.)  
- Adds metadata such as:
  - `type: "product"`  
  - `type: "faq"`  
- Splits long text into ~1500-character chunks  
- Exports all chunks in **JSONL** format

Final RAG-ready document:

- `data/rag_data.jsonl`  

This file is suitable for building embeddings and indexing into a vector database (OpenAI, Pinecone, Qdrant, pgvector, etc.) or directly for OpenAI RAG workflows.

---

### 3️⃣ Intent Detection  

To route questions to the correct knowledge source, a simple **intent detection module** is included.

- Manually labeled dataset: `intent/intent_dataset.csv`  
- Classes:
  - `product_query` – questions about products, options, colors, sizes, etc.  
  - `policy_query` – questions about shipping, returns, guarantees, etc.  
  - `other` – small talk or non-domain queries  

A baseline model is trained using:

- **TF-IDF** for text representation  
- **Logistic Regression** for classification  

Trained artifacts:

- `intent/intent_vectorizer.joblib`  
- `intent/intent_model.joblib`  

At runtime, the pipeline is:

1. Take user query  
2. Run intent classifier → `product_query` / `policy_query` / `other`  
3. Use intent to choose which documents to retrieve:
   - `product_query` → only product chunks (`type: "product"`)  
   - `policy_query` → only FAQ chunks (`type: "faq"`)  
   - `other` → configurable fallback behavior  
4. Send retrieved context + user query to the LLM  
5. Generate the final answer

This intent-based routing improves:

- 🎯 Retrieval precision  
- ⚡ Latency  
- 💸 Token efficiency  
- 🧠 Robustness against hallucinations

---

### 4️⃣ System Flow (High-Level)

1. **User Query**  
2. **Intent Detection** (product / policy / other)  
3. **Vector DB Retrieval** filtered by metadata (`type`)  
4. **RAG Prompt Construction** (retrieved chunks + user query)  
5. **LLM Response Generation**

The design is modular and can be integrated into a backend API or chatbot frontend.

---

## 🗂️ Repository Structure

```text
scraping/
  product_scraper.py        # Scrapes all product details
  faq_scraper.py            # Scrapes FAQ question–answer pairs
  preprocess_rag.py         # Builds RAG-ready JSONL with chunks + metadata

data/
  products.json             # Cleaned product data
  faq.json                  # Cleaned FAQ data
  rag_data.jsonl            # Final RAG dataset (JSONL, chunked + tagged)

intent/
  intent_dataset.csv        # Hand-labeled intent dataset
  intent_vectorizer.joblib  # TF-IDF vectorizer
  intent_model.joblib       # Logistic Regression classifier

README.md
