SECURITY: Token and secret handling



\- Ingestion endpoint must require Authorization: Bearer <INGEST\_TOKEN>

\- Do not commit tokens to git

\- Rotate ingestion token every 30 days

\- Principle of least privilege: ingestion token should only allow ingest, not admin actions

\- Log request IDs for auditing (AI Gateway log IDs)



