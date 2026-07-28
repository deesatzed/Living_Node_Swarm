# Pre-approval Map candidate revisions

## Problem

The current `candidate-revisions` API is deliberately bound to an approved
active graph. Map has a persisted review graph with an active target but no
active graph version, so browser-session refinement cannot honestly reuse that
endpoint.

## Decision

Add a separate, typed Map candidate-revision record bound to:

- project ID, retained review graph ID, and exact review graph version;
- target contract ID;
- the complete candidate factor snapshot and relationship snapshot;
- revision ID and creation time.

The snapshot represents proposed/excluded candidate state, removals, additions,
and branch extensions. It is never an active graph, simulation input, or
approval receipt.

## Server boundary

The server will accept a Map revision only when the project is in Map, has no
active graph version, and its retained graph/version matches the request. It
will validate factor IDs and relationship endpoints against the fixture target
plus declared candidate additions, persist the exact snapshot, and return an
explicit `active_graph_mutated: false` receipt. Restart listing must reproduce
the stored payload.

## UI boundary

Map saves only a complete displayed revision snapshot. A saved revision remains
visible as a non-active receipt and can be replayed into browser staging. Exact
structural approval continues to require a freshly server-issued structural
proposal and comparison; revision saving cannot approve, activate, or advance
the lifecycle.

## Proof

API tests will cover version/project mismatch rejection, restart persistence,
and no graph mutation. Component and canonical browser tests will save and
replay a revision containing a removal, exclusion, and extension, while proving
the active graph remains unchanged.
