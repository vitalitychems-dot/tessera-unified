---
name: Manager AI provider routing
description: Which OpenAI-compatible endpoint the Manager uses for ordinary JSON work versus web-search research.
---

The Manager sends ordinary structured JSON prompts through Chat Completions and keeps Responses for requests that use web search and citation extraction.

**Why:** The Replit OpenAI integration supports both APIs, but the deployed base URL can reject `/responses` for ordinary calls with a 404. Using the compatible route prevents chat, audits, and content generation from failing while preserving verified web-search evidence.

**How to apply:** If the provider contract changes, update both the endpoint-specific request body and its parser together. Do not move web-search calls to Chat Completions unless citation verification is redesigned.