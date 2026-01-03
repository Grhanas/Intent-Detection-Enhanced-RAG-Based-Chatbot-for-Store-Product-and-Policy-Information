# 🛒 Shopify AI Chatbot
Intent Detection–Enhanced RAG-Based Chatbot powered by Cloudflare Workers

A production-ready AI chatbot system designed for Shopify stores.
The project consists of a Shopify frontend widget and a Cloudflare Workers backend,
enabling fast, scalable, and secure AI-powered customer support.

---

## Project Structure Overview

### chatbot.js — Frontend Logic (Shopify)
Handles all chatbot behavior on the Shopify storefront.

Responsibilities:
- Injects the chatbot UI into the Shopify storefront
- Manages open / close actions and user interactions
- Sends user messages to the Cloudflare backend (/chat endpoint)
- Renders AI responses dynamically
- Designed to support rich responses (links, product cards, images)

---

### chatbot.css — Chatbot UI Styling
Defines the visual appearance of the chatbot widget.

Responsibilities:
- Fixed-position chat bubble (modern chatbot layout)
- User vs assistant message styling
- Responsive design compatible with all Shopify themes
- Clean and minimal UI for conversion-oriented use

---

### index.js — Cloudflare Worker (Backend API)
Acts as a serverless AI backend running on Cloudflare Workers.

Responsibilities:
- Exposes REST endpoints (/, /chat)
- Handles CORS securely for Shopify domains
- Performs Intent Detection
- Executes Retrieval-Augmented Generation (RAG)
- Communicates with the LLM API
- Returns structured JSON responses
- Includes error handling and safe fallback messages

---

## Architecture Workflow

1. The user opens the Shopify store and interacts with the chatbot UI.
2. The chatbot interface (chatbot.js) captures the user message.
3. The message is sent to the Cloudflare Worker via an HTTP POST request.
4. The Cloudflare Worker processes the request:
   - Detects the user intent
   - Retrieves relevant knowledge using RAG
   - Generates a response using the LLM
5. The backend returns a structured JSON response.
6. The chatbot UI renders the response to the user.

---

## Core Features

- AI-powered customer support for Shopify stores
- Intent Detection to route queries correctly
- Retrieval-Augmented Generation grounded in real store data
- Fully serverless architecture with Cloudflare Workers
- Secure handling of API keys and configuration

---

## Tech Stack

- Frontend: Vanilla JavaScript and CSS
- Backend: Cloudflare Workers
- AI: LLM API (GPT, DeepSeek, or compatible models)
- Architecture: Intent Detection + RAG
- Hosting: Serverless

---

## Installation and Setup

### Cloudflare Worker
- Install dependencies
- Deploy using Wrangler
- Configure environment variables such as LLM_API_KEY and MODEL_NAME

### Shopify Integration
- Upload chatbot.js and chatbot.css to the Shopify theme
- Reference them inside theme.liquid

---

## Use Cases

- E-commerce customer support automation
- Product and pricing inquiries
- Shipping and return policy questions
- Conversion-oriented AI chat experiences

---

## Roadmap

- Product cards with images and clickable links
- Advanced intent routing
- Conversation analytics
- Multi-language support
- Order tracking integration

---

## License
MIT License

---

## Contact
Developed by Kağan Fıkırkoca
AI / Computer Vision Engineer
