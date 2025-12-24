COST CONTROLS (LLM + Vector DB)



\- Limit topK to 6 by default to control retrieval cost and context size

\- Cap context length (MAX\_CONTEXT\_CHARS) to prevent expensive prompts

\- Use AI Gateway for caching and rate limiting

\- Prefer smaller embedding model unless quality requires larger

\- Monitor: requests/day, latency p95, error rate, and token usage



