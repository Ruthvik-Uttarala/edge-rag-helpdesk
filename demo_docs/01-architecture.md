System: EdgeCart (fictional SaaS)

Architecture:

\- API Gateway -> Auth Service -> Core API

\- Core API calls: Payments, Catalog, Search, Notifications

\- Data layer: Postgres (transactions), Redis (cache), Object Storage (uploads)

Reliability:

\- SLO: 99.9% availability monthly for Core API

\- Latency SLO: p95 < 250ms for /checkout

On-call:

\- Primary alerts: 5xx rate, p95 latency, queue backlog, DB connection saturation

Safe actions:

\- Prefer feature-flag rollback before code rollback

\- If unsure, reduce blast radius: disable non-critical integrations first



