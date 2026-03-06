# Production Readiness Engineering Review Prompt

**Prompt**

Act as a **Principal / Staff Software Engineer performing a Production Readiness Review**.

Your task is to conduct a **deep technical audit** of the analytics workflow and its surrounding system components, with a focus on identifying hidden risks, scaling bottlenecks, operational weaknesses, and architectural problems before they cause failures in production.

Some files/paths maybe you need: web/analytics app.

The goal is to determine whether this system is **safe, scalable, secure, and production-ready**.

Assume the system may run in a **serverless environment (e.g., Vercel) with a managed backend such as Supabase**, and may serve **real users at scale**.

Your review must focus on identifying **hidden risks, scaling bottlenecks, operational weaknesses, and architectural problems** before they cause failures in production.

After you finish the review, put the results in a markdown inside the `md_files/Results` folder.

Be **critical, thorough, and realistic**.
---

# Areas to Review

## 1. System Architecture

Evaluate the overall architecture and identify structural weaknesses.

Check for:

* Poor separation of concerns
* Tight coupling between services
* Business logic inside UI code
* Missing service or domain layers
* Fragile integrations between components
* Lack of modular boundaries
* Missing shared libraries across apps
* Code duplication across multiple apps or services

Suggest architectural improvements to increase:

* scalability
* maintainability
* reliability

---

## 2. Production Safety

Determine whether the system is safe to run in production.

Check for:

* operations that can corrupt data
* non-idempotent operations
* partial writes to the database
* inconsistent state across services
* unsafe retries
* duplicate processing risks
* missing transactional logic

Identify operations that **must be made idempotent**.

---

## 3. Serverless Constraints

Assume the code runs in **serverless environments such as Vercel**.

Review for issues such as:

* loading large datasets into memory
* fetching entire tables without pagination
* unbounded queries
* expensive synchronous work inside API handlers
* excessive cold-start cost
* long-running requests

Flag code that could cause:

* memory exhaustion
* function timeouts
* slow response times

---

## 4. Performance & Scalability

Identify performance risks including:

* N+1 database queries
* repeated external API calls
* inefficient loops
* redundant data fetching
* unnecessary data transformations
* large payloads sent to the client
* lack of caching strategies

Also analyze how the system behaves under:

* high concurrency
* high request rates
* growing datasets

---

## 5. Memory & Resource Usage

Look for potential **memory leaks or resource exhaustion**:

* loading large arrays into memory
* caching without eviction
* global mutable state
* unbounded queues or buffers
* holding large objects across requests
* inefficient object copying

Highlight risks that would affect **serverless runtimes**.

---

## 6. Rate Limiting & Abuse Protection

Review whether the system protects critical endpoints from abuse.

Check for:

* missing rate limiting
* brute-force attack vectors
* expensive endpoints exposed publicly
* webhook spam risks
* promo / login / signup abuse

Recommend strategies such as:

* IP rate limiting
* user-based throttling
* request quotas
* API gateway protections

---

## 7. Security Review

Audit the system for security risks:

* injection vulnerabilities
* authentication flaws
* authorization bypass
* insecure API endpoints
* sensitive data exposure
* improper secret handling
* missing webhook verification
* Supabase RLS policy weaknesses

Also check whether **least privilege access** is enforced.

---

## 8. Background Jobs & Async Workflows

Review background processes including:

* webhooks
* background sync
* scheduled jobs
* queue workers
* event processors

Look for:

* missing idempotency
* event duplication
* lost events
* retry logic problems
* race conditions
* inconsistent processing order

Ensure background workflows are **safe and fault tolerant**.

---

## 9. Edge Cases & Failure Modes

Evaluate how the system behaves under real-world failure conditions.

Check for:

* network failures
* partial database writes
* retries causing duplicates
* invalid user inputs
* expired sessions
* inconsistent state between services
* unexpected external API behavior

Highlight scenarios that could cause **data corruption or service outages**.

---

## 10. Observability & Debuggability

Determine whether the system can be debugged effectively in production.

Check for:

* structured logging
* error monitoring
* request tracing
* background job monitoring
* alerting mechanisms
* audit logs

Identify missing logs that would make production incidents difficult to diagnose.

---

## 11. Testing & Reliability

Review the current testing strategy.

Check for:

* missing unit tests
* missing integration tests
* missing API tests
* lack of failure simulation
* missing tests for edge cases

Recommend tests that should exist to ensure long-term stability.

---

# Output Format

For each issue identified, provide:

**Severity**
Critical / High / Medium / Low

**Location**
File name + function + line number or section

**Problem**
Clear explanation of the issue

**Impact**
Potential consequences in production

**Recommended Fix**
Specific technical solution or refactor

---

# Final Engineering Assessment

At the end of the review provide:

### 1. Top Critical Risks

The most important issues that must be fixed before production.

### 2. Architectural Improvements

Key design changes that would improve system stability and scalability.

### 3. Performance Improvements

Recommendations to reduce database load, memory usage, and latency.

### 4. Security Hardening

Additional safeguards that should be implemented.

### 5. Serverless Optimization

Specific improvements for **Vercel + Supabase environments**.

### 6. Refactoring Opportunities

Areas where code duplication or complexity should be reduced.

---

**Be strict and realistic.**

Assume this system will run in **production with real users, real money, and real data**.

The goal is to **identify risks early and prevent production failures.**
