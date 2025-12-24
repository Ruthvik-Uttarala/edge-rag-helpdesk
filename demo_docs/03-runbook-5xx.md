RUNBOOK: Elevated 5xx (error rate > 1%)



Triage:

\- Identify top failing route and error code

\- Check recent deploys and feature flag changes



Fast mitigations:

\- Roll back last deploy OR disable new feature flag

\- If DB errors: increase pool size carefully; restart one instance at a time

\- If dependency errors: circuit-break the dependency (return degraded response)



Communication:

\- Update status page if customer impact > 5 minutes

\- Provide ETA only after mitigation is in place



Do not:

\- Restart everything at once

\- Change multiple variables simultaneously



