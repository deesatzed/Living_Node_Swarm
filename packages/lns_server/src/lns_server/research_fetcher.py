"""Bounded, redirect-safe HTTP retrieval for consented research only."""

from __future__ import annotations

import socket
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urljoin

import httpx

from lns_server.research_safety import CheckedResearchUrl, Resolver, validate_public_research_url


class ResearchFetchError(RuntimeError):
    """A bounded research retrieval failed without yielding usable content."""


@dataclass(frozen=True)
class FetchedResearchDocument:
    requested_url: str
    final_url: str
    status_code: int
    content_type: str
    body: bytes
    redirect_count: int


class BoundedResearchFetcher:
    """HTTP client that validates every destination and never follows redirects implicitly."""

    def __init__(
        self,
        *,
        resolver: Resolver = socket.getaddrinfo,
        transport: httpx.BaseTransport | None = None,
        timeout_seconds: float = 10.0,
        max_bytes: int = 1_000_000,
        max_redirects: int = 3,
        allowed_content_types: Iterable[str] = ("text/html", "text/plain", "application/xhtml+xml"),
    ) -> None:
        if timeout_seconds <= 0 or max_bytes <= 0 or max_redirects < 0:
            raise ValueError("timeout_seconds/max_bytes must be positive and max_redirects non-negative")
        self.resolver = resolver
        self.transport = transport
        self.timeout_seconds = timeout_seconds
        self.max_bytes = max_bytes
        self.max_redirects = max_redirects
        self.allowed_content_types = frozenset(content_type.lower() for content_type in allowed_content_types)

    def fetch(self, requested_url: str) -> FetchedResearchDocument:
        current: CheckedResearchUrl = validate_public_research_url(requested_url, resolver=self.resolver)
        redirects = 0
        try:
            with httpx.Client(
                follow_redirects=False,
                timeout=self.timeout_seconds,
                transport=self.transport,
            ) as client:
                while True:
                    with client.stream("GET", current.url) as response:
                        if response.is_redirect:
                            location = response.headers.get("location")
                            if not location:
                                raise ResearchFetchError("redirect response is missing Location")
                            if redirects >= self.max_redirects:
                                raise ResearchFetchError("research redirect limit exceeded")
                            redirects += 1
                            current = validate_public_research_url(
                                urljoin(current.url, location), resolver=self.resolver
                            )
                            continue
                        return self._document(requested_url, current, response, redirects)
        except httpx.TimeoutException as exc:
            raise ResearchFetchError("research request timed out") from exc
        except httpx.HTTPError as exc:
            raise ResearchFetchError("research request failed") from exc

    def _document(
        self,
        requested_url: str,
        checked_url: CheckedResearchUrl,
        response: httpx.Response,
        redirects: int,
    ) -> FetchedResearchDocument:
        if response.status_code < 200 or response.status_code >= 300:
            raise ResearchFetchError(f"research response status {response.status_code} is not successful")
        content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if content_type not in self.allowed_content_types:
            raise ResearchFetchError("research response content type is not allowed")
        content_length = response.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self.max_bytes:
                    raise ResearchFetchError("research response exceeds size limit")
            except ValueError as exc:
                raise ResearchFetchError("research response has invalid Content-Length") from exc
        chunks = bytearray()
        for chunk in response.iter_bytes():
            chunks.extend(chunk)
            if len(chunks) > self.max_bytes:
                raise ResearchFetchError("research response exceeds size limit")
        body = bytes(chunks)
        return FetchedResearchDocument(
            requested_url=requested_url,
            final_url=checked_url.url,
            status_code=response.status_code,
            content_type=content_type,
            body=body,
            redirect_count=redirects,
        )
