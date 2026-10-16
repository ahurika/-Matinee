# ADR-007: Database Connection Pooling & Allocation Rationale

## Context
PostgreSQL allocates a dedicated OS process for every active connection, consuming memory and compute resources. Uncontrolled client connection spikes quickly exhaust server limits (default 100 on standard tiers), causing dropped connections and service crashes.

## Decision
We enforce strict connection pooling rules across API and worker instances using PgBouncer transaction pooling semantics:
1. **API Process Pool:** `max: 10`, `connectionTimeoutMillis: 3000`, `idleTimeoutMillis: 30000`.
2. **Worker Process Pool:** `max: 5`, `connectionTimeoutMillis: 5000`.
3. **Capacity Formula:**
   $$\text{Total Connections} = (\text{API Instances} \times 10) + (\text{Workers} \times 5) + 20 \text{ (Admin/Migration Reserve)}$$
   For a standard deployment of 2 API servers and 1 background worker:
   $$2 \times 10 + 1 \times 5 + 20 = 45 \text{ connections}$$
   This guarantees 55% headroom below the 100-connection provider threshold.
4. **Fast Failure Strategy:** If a connection cannot be acquired within 3,000 ms, the request fails fast with `HTTP 503 Service Unavailable` and header `Retry-After: 3`, preventing cascading thread deadlocks.

## Consequences
- The database connection pool is immune to sudden HTTP traffic bursts.
- Transient connection contention is handled gracefully via client-side exponential backoff.
- Administrative maintenance and schema migrations retain dedicated connection reserves.
