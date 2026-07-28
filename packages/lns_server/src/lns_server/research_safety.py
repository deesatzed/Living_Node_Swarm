"""Fail-closed URL validation for consented research retrieval."""

from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass
from typing import Callable
from urllib.parse import SplitResult, urlsplit, urlunsplit


class UnsafeResearchUrl(ValueError):
    """Raised before any connection to an unsafe research destination."""


@dataclass(frozen=True)
class CheckedResearchUrl:
    url: str
    host: str
    port: int
    resolved_addresses: tuple[str, ...]


Resolver = Callable[..., list[tuple[object, object, object, object, tuple[object, ...]]]]


def _is_public_address(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return ip.is_global and not (
        ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_private
        or ip.is_reserved
        or ip.is_unspecified
    )


def _reject_literal_or_local_host(host: str) -> None:
    if host.lower() == "localhost" or host.lower().endswith(".localhost"):
        raise UnsafeResearchUrl("localhost destinations are not permitted for research retrieval")
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        return
    if not _is_public_address(str(literal)):
        raise UnsafeResearchUrl("non-public literal IP destinations are not permitted")


def validate_public_research_url(url: str, *, resolver: Resolver = socket.getaddrinfo) -> CheckedResearchUrl:
    """Validate scheme/authority and DNS-resolved addresses before a request is issued."""

    try:
        parsed: SplitResult = urlsplit(url)
    except ValueError as exc:
        raise UnsafeResearchUrl("invalid research URL") from exc
    if parsed.scheme not in {"http", "https"}:
        raise UnsafeResearchUrl("research retrieval accepts HTTP(S) URLs only")
    if not parsed.hostname:
        raise UnsafeResearchUrl("research URL must include a hostname")
    if parsed.username is not None or parsed.password is not None:
        raise UnsafeResearchUrl("research URL must not contain credentials")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise UnsafeResearchUrl("research URL has an invalid port") from exc
    host = parsed.hostname
    _reject_literal_or_local_host(host)
    try:
        records = resolver(host, port, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise UnsafeResearchUrl("research hostname could not be resolved") from exc
    addresses = tuple(sorted({str(record[4][0]) for record in records if record[4]}))
    if not addresses:
        raise UnsafeResearchUrl("research hostname resolved to no addresses")
    if any(not _is_public_address(address) for address in addresses):
        raise UnsafeResearchUrl("research hostname resolved to a non-public destination")
    normalized = urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, ""))
    return CheckedResearchUrl(normalized, host, port, addresses)
