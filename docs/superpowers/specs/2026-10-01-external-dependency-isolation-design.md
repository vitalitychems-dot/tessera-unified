# External Dependency Isolation and Agent Identity

**Status:** Draft for user review  
**Date:** 2026-10-01  
**Scope:** External AI/API providers, public data sources, and third-party packages used for research or reverse engineering.

## Goal

Treat external services and candidate code as untrusted inputs. Allow Tessera to conduct bounded research under its own identity, without giving external systems or research code access to the operator's identity, production secrets, project files, database, or privileged capabilities. Verified findings may improve Tessera only through the existing evidence and authorization paths.

## Identity

- Research runs as a distinct Tessera agent/service principal, not as the operator.
- It must not reuse or present the operator's admin key, session, account, or credentials.
- Each request and resulting finding records the agent identity and provenance.
- The agent's permissions are explicit and purpose-scoped. "Autonomous" does not mean unrestricted access to secrets, the host, or the network.

## Isolation boundary

All external provider/API traffic and all execution of experimental or reverse-engineered packages must pass through a dedicated, ephemeral research worker with a verifiable isolation boundary.

The worker:

- receives only the minimum public research input required for a task;
- has no project-tree mount, production database connection, user session, or production secrets;
- has no write path back to the app, canon, memory, configuration, or deployment;
- has outbound network access only to explicitly allowed destinations and only for the declared research purpose;
- has enforced CPU, memory, time, and output-size limits;
- returns structured results and provenance, not executable instructions or direct filesystem changes.

The existing Modal code is a compute prototype, not evidence that a secure research VM already exists. The chosen worker platform and its isolation guarantees must be verified before it is used for sensitive or production-connected work. Do not describe a Node VM, ordinary child process, or fetch wrapper as a VM security boundary.

### Network and SSRF controls

- Use an explicit destination allowlist; reject arbitrary public destinations by default.
- Resolve and validate addresses before connecting; reject loopback, private, link-local, multicast, and reserved addresses.
- Pin or otherwise bind the validated address to the connection to prevent DNS rebinding.
- Follow redirects manually and revalidate every destination before making the next request.
- Apply protocol, method, timeout, response-size, and content-type limits.
- Audit allow/deny outcomes with minimal metadata; never log credentials or full sensitive payloads.

## Provider credentials and live features

- No provider request may bypass the isolated boundary.
- Do not copy existing Replit AI integration credentials, operator keys, or production secrets into a research worker.
- A provider call remains disabled in live paths until the isolated route is available and verified. If that route or its required authorization is not configured, fail closed and report the capability as unavailable; do not silently use the old direct client or fabricate a result.
- Any future worker-specific provider credential requires a separately approved, least-privilege credential channel. This design does not authorize creating or transferring credentials.
- Once enabled, external answers may be surfaced only with clear external/unverified provenance. They are observations, not trusted Tessera facts.

## Third-party package handling

- Experimental, downloaded, or reverse-engineered packages and code are never imported or executed in the API server.
- Analyze and execute candidates only in the research worker. The worker returns findings, hashes, and proposed changes; it cannot write to the repository.
- Essential runtime dependencies remain an explicit exception: the application needs them in its runtime. Pin them in the lockfile, inventory and scan them, and do not mistake those controls for VM isolation.
- New runtime dependencies require review of their provenance and install/runtime behavior. Do not run candidate package lifecycle scripts as part of research in the application environment.

## Quarantine and promotion

- Every external response and research finding carries source, timestamp, content hash, purpose, and an untrusted status.
- Sanitization, pattern matching, or an LLM judgment alone does not make content trusted.
- Quarantined content cannot directly update training data, memory, canon, capabilities, configuration, code, or deployments.
- Promotion requires a reproducible claim, independent validation appropriate to that claim, and the existing project authorization path. Any Grand Council decision must use the production sovereign vote engine and report its actual ballots and tallies.
- Preserve rejected or failed findings as non-authoritative audit evidence; do not silently convert them into lessons.

## Rollout

1. Inventory outbound provider/API paths and runtime dependencies; identify direct paths that bypass existing wrappers.
2. Add fail-closed routing and security checks before moving any external calls.
3. Stand up and verify the isolated research worker without access to production secrets, data, or project files.
4. Test denial cases, including private-IP access, redirect-to-private, DNS rebinding, over-limit responses, unauthorized provider use, and attempted access to operator identity.
5. Keep provider calls disabled until the worker boundary passes those checks and any required credential channel has separate approval.
6. Route research-only provider calls and candidate-package experiments through the worker; quarantine outputs.
7. Promote only validated findings through existing authorization paths. Keep the operator's identity separate throughout.

## Acceptance criteria

- No direct external provider/API path remains in live code outside the approved gateway.
- The gateway fails closed for unapproved hosts, unsafe resolved addresses, unsafe redirects, unsupported methods, and exceeded resource limits.
- No research worker can read project files, production databases, user/session credentials, or production secrets.
- Provider calls are unavailable until the isolated path is verified; missing configuration produces an explicit error/status, not a fallback.
- Candidate third-party code cannot execute in the API server as part of research.
- External content cannot be promoted to trusted knowledge, training, code, or configuration by sanitization alone.
- Audit records distinguish the Tessera agent from the operator and omit secrets and unnecessary personal data.
- Existing user-facing behavior and any feature loss are documented; no external credential is added or transferred without explicit approval.

## Open implementation decisions

- Select a worker mechanism only after confirming its actual isolation guarantees and network controls.
- Determine whether an approved, dedicated provider credential can be used by that worker. Until separately authorized, provider research remains disabled.
- Define which existing verification and ratification path applies to each class of proposed learning; do not invent or simulate a council vote.