"""Dependency graph utilities: cycles and downstream closure."""

from __future__ import annotations

from lns_kernel.models import Node
from lns_kernel.validation import ValidationError


def detect_cycle(nodes: dict[str, Node]) -> list[str] | None:
    """Return a cycle path if one exists, else None."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {nid: WHITE for nid in nodes}
    parent: dict[str, str | None] = {nid: None for nid in nodes}

    def dfs(u: str) -> list[str] | None:
        color[u] = GRAY
        for v in nodes[u].depends_on:
            if v not in nodes:
                continue
            if color[v] == GRAY:
                # reconstruct cycle
                cycle = [v, u]
                cur = u
                while parent[cur] is not None and parent[cur] != v:
                    cur = parent[cur]  # type: ignore[assignment]
                    cycle.append(cur)
                cycle.append(v)
                cycle.reverse()
                return cycle
            if color[v] == WHITE:
                parent[v] = u
                found = dfs(v)
                if found:
                    return found
        color[u] = BLACK
        return None

    for nid in nodes:
        if color[nid] == WHITE:
            found = dfs(nid)
            if found:
                return found
    return None


def assert_acyclic(nodes: dict[str, Node]) -> None:
    cycle = detect_cycle(nodes)
    if cycle:
        raise ValidationError(f"Cycle detected: {' -> '.join(cycle)}")


def topological_order(nodes: dict[str, Node]) -> list[str]:
    """Kahn topological order; raises if cyclic."""
    assert_acyclic(nodes)
    indeg = {nid: 0 for nid in nodes}
    children: dict[str, list[str]] = {nid: [] for nid in nodes}
    for nid, node in nodes.items():
        for p in node.depends_on:
            if p in nodes:
                indeg[nid] += 1
                children[p].append(nid)
    queue = [nid for nid, d in indeg.items() if d == 0]
    order: list[str] = []
    while queue:
        u = queue.pop(0)
        order.append(u)
        for v in children[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    if len(order) != len(nodes):
        raise ValidationError("Cycle detected during topological sort")
    return order


def downstream(nodes: dict[str, Node], start_id: str) -> set[str]:
    """All nodes reachable as dependents of start_id (not including start)."""
    children: dict[str, list[str]] = {nid: [] for nid in nodes}
    for nid, node in nodes.items():
        for p in node.depends_on:
            if p in nodes:
                children[p].append(nid)
    seen: set[str] = set()
    stack = list(children.get(start_id, []))
    while stack:
        u = stack.pop()
        if u in seen:
            continue
        seen.add(u)
        stack.extend(children.get(u, []))
    return seen
