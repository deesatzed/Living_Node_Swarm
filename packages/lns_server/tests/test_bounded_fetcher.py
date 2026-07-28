import socket

import httpx
import pytest

from lns_server.research_fetcher import ResearchFetchError, BoundedResearchFetcher
from lns_server.research_safety import UnsafeResearchUrl


def resolver(host: str, port: int, type: int):
    address = "10.0.0.8" if host == "internal.example" else "93.184.216.34"
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, port))]


def fetcher(handler, **kwargs):
    return BoundedResearchFetcher(
        transport=httpx.MockTransport(handler), resolver=resolver, max_bytes=16, timeout_seconds=1, **kwargs
    )


def test_fetches_allowed_small_html_with_final_receipt():
    client = fetcher(lambda request: httpx.Response(200, headers={"content-type": "text/html"}, content=b"<p>Nd</p>"))

    result = client.fetch("https://public.example/neodymium")

    assert result.final_url == "https://public.example/neodymium"
    assert result.content_type == "text/html"
    assert result.body == b"<p>Nd</p>"


def test_redirect_destination_is_revalidated_before_request():
    client = fetcher(
        lambda request: httpx.Response(302, headers={"location": "http://internal.example/metadata"})
    )

    with pytest.raises(UnsafeResearchUrl, match="non-public"):
        client.fetch("https://public.example/start")


def test_rejects_unsupported_content_type_and_oversized_body():
    unsupported = fetcher(
        lambda request: httpx.Response(200, headers={"content-type": "image/png"}, content=b"png")
    )
    with pytest.raises(ResearchFetchError, match="content type"):
        unsupported.fetch("https://public.example/image")

    oversized = fetcher(
        lambda request: httpx.Response(200, headers={"content-type": "text/plain"}, content=b"x" * 17)
    )
    with pytest.raises(ResearchFetchError, match="size limit"):
        oversized.fetch("https://public.example/large")


def test_rejects_missing_redirect_location_and_transport_timeout():
    missing_location = fetcher(lambda request: httpx.Response(301))
    with pytest.raises(ResearchFetchError, match="Location"):
        missing_location.fetch("https://public.example/start")

    timeout = fetcher(lambda request: (_ for _ in ()).throw(httpx.TimeoutException("slow")))
    with pytest.raises(ResearchFetchError, match="timed out"):
        timeout.fetch("https://public.example/slow")
