\# EdgeRAG Helpdesk (Cloudflare Workers AI + Vectorize + AI Gateway)



\*\*Author:\*\* Ruthvik Uttarala  



Live demo: https://edge-rag-helpdesk.ruthvik-edge-rag.workers.dev



\## What it does

\- Ingests documents into a Vectorize index (embeddings: `@cf/baai/bge-small-en-v1.5`)

\- Answers questions using retrieval + generation (chat model: `@cf/meta/llama-3.1-8b-instruct`)

\- Uses AI Gateway for observability/log IDs and cost controls



\## API

\### Health

GET /api/health



\### Ingest (protected)

POST /api/ingest  

Auth: `Authorization: Bearer <INGEST\_TOKEN>`



\### Chat

POST /api/chat

Body:

```json

{ "question": "…", "tenant": "public", "topK": 6 }



