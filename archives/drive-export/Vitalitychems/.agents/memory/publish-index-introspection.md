---
name: Publish schema introspection quirks
description: Diagnose malformed publish-time schema diffs using the generated SQL, not just valid source migrations.
---
Long PostgreSQL index expressions can be truncated to 63 bytes by the publish schema introspector even though the development index is valid. A clean build and a non-destructive schema diff do not establish that the generated SQL is valid.

**Why:** Source migrations and generated deployment SQL are different artifacts. Introspection can shorten expression text at identifier-length boundaries, yielding malformed casts or missing parentheses. Valid development objects and duplicate-free production data do not rule out this failure.

**How to apply:** Inspect the unredacted structural SQL from the schema-diff callback and compare it to PostgreSQL's full index definition. Where an expression is truncated, preserve its exact semantics in a stored generated column and index the column directly; verify the generated-column expression survives the diff. Test the complete publish diff on isolated temporary tables matching production's column structure, inside a development transaction that is rolled back. Never remove uniqueness protection, normalize live payment records, or add startup/build DDL to bypass Publish.

PostgreSQL boolean shorthand constraints such as `CHECK (flag)` can also be
introspected as the invalid nested expression `CHECK (CHECK (flag))`.

**Why:** The development catalog correctly reports `CHECK (flag)`, but the
publish serializer can mistake the catalog's rendered `CHECK` wrapper for the
constraint expression and add a second wrapper.

**How to apply:** Prefer enforcing a boolean singleton through application
access patterns and an existing primary key when the extra truth-only check is
not essential. If the invariant is essential, use a schema shape that avoids
boolean shorthand and verify the exact generated publish SQL before retrying.