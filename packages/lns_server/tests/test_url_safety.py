import socket

import pytest

from lns_server.research_safety import UnsafeResearchUrl, validate_public_research_url


def resolver_for(*addresses: str):
    def resolve(host: str, port: int, type: int):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, port)) for address in addresses]

    return resolve


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.com/data",
        "http://127.0.0.1:8000/",
        "http://[::1]/",
        "http://169.254.169.254/latest/meta-data/",
        "https://user:password@example.com/private",
    ],
)
def test_blocks_unsafe_scheme_literal_or_credentials(url):
    with pytest.raises(UnsafeResearchUrl):
        validate_public_research_url(url, resolver=resolver_for("93.184.216.34"))


def test_blocks_private_destination_after_dns_resolution():
    with pytest.raises(UnsafeResearchUrl, match="non-public"):
        validate_public_research_url("https://research.example/factors", resolver=resolver_for("10.0.0.8"))


def test_accepts_http_url_only_when_all_resolved_addresses_are_public():
    checked = validate_public_research_url(
        "https://research.example/factors?topic=neodymium",
        resolver=resolver_for("93.184.216.34", "1.1.1.1"),
    )

    assert checked.host == "research.example"
    assert checked.port == 443
    assert checked.url == "https://research.example/factors?topic=neodymium"
