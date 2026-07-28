"""Explicit provider-routing preview and confirmation receipts for research content."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


class ProviderRoutingPreview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    provider: str
    model: str
    purpose: str
    data_scope: tuple[str, ...]
    source_content_hashes: tuple[str, ...]
    payload_character_count: int = Field(ge=0)
    created_at: datetime
    requires_confirmation: bool = True


class ProviderRoutingReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    preview_id: str
    provider: str
    model: str
    purpose: str
    data_scope: tuple[str, ...]
    source_content_hashes: tuple[str, ...]
    confirmed_by: str
    confirmed_at: datetime


def build_routing_preview(
    *,
    provider: str,
    model: str,
    purpose: str,
    source_content_hashes: tuple[str, ...],
    untrusted_source_text: str,
) -> ProviderRoutingPreview:
    """Describe exactly what scope would be routed without retaining routed source text."""

    for value in (provider, model, purpose):
        if not value.strip():
            raise ValueError("provider, model, and purpose must be non-empty")
    return ProviderRoutingPreview(
        id=str(uuid.uuid4()),
        provider=provider.strip(),
        model=model.strip(),
        purpose=purpose.strip(),
        data_scope=("fixed_extraction_instructions", "untrusted_source_text"),
        source_content_hashes=source_content_hashes,
        payload_character_count=len(untrusted_source_text),
        created_at=datetime.now(timezone.utc),
    )


def confirm_routing_preview(
    preview: ProviderRoutingPreview,
    *,
    confirmed_by: str,
    confirmed_at: datetime | None = None,
) -> ProviderRoutingReceipt:
    """Create a durable user-confirmation receipt before a provider call is authorized."""

    if not confirmed_by.strip():
        raise ValueError("confirmed_by must be non-empty")
    timestamp = confirmed_at or datetime.now(timezone.utc)
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("confirmed_at must be timezone-aware")
    return ProviderRoutingReceipt(
        id=str(uuid.uuid4()),
        preview_id=preview.id,
        provider=preview.provider,
        model=preview.model,
        purpose=preview.purpose,
        data_scope=preview.data_scope,
        source_content_hashes=preview.source_content_hashes,
        confirmed_by=confirmed_by.strip(),
        confirmed_at=timestamp,
    )
