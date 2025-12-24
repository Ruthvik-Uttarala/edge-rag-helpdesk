RUNBOOK: High latency (p95 > 250ms) on /checkout



Symptoms:

\- p95 latency alert firing

\- Customer reports “checkout spinning”



Step 1: Confirm scope

\- Check if only /checkout is impacted or all endpoints

\- Compare by region and tenant



Step 2: Common causes

\- Cache miss spike (Redis evictions)

\- DB connection pool saturation

\- Downstream dependency slowness (Payments)



Step 3: Immediate mitigations

\- Enable “checkout-lite” feature flag (skips recommendations)

\- Increase cache TTL for cart reads

\- Temporarily rate limit non-critical endpoints



Step 4: Validate recovery

\- p95 back under 250ms for 10 minutes

\- 5xx not increasing



Post-incident

\- Add dashboard for cache hit rate + pool saturation

\- Add load test for checkout peak



