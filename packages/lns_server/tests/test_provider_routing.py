from datetime import datetime, timezone
from pathlib import Path
import tempfile

from lns_server.evidence_store import EvidenceStore
from lns_server.research_routing import build_routing_preview, confirm_routing_preview


def test_preview_exposes_provider_model_and_scope_without_source_text():
    preview = build_routing_preview(
        provider="openrouter",
        model="example/reasoning-model",
        purpose="extract candidate evidence claims",
        source_content_hashes=("a" * 64,),
        untrusted_source_text="private source text that must not appear in the preview",
    )

    assert preview.requires_confirmation is True
    assert preview.data_scope == ("fixed_extraction_instructions", "untrusted_source_text")
    assert preview.source_content_hashes == ("a" * 64,)
    assert "private source text" not in preview.model_dump_json()


def test_confirmed_routing_receipt_persists_for_auditing():
    preview = build_routing_preview(
        provider="openrouter",
        model="example/reasoning-model",
        purpose="extract candidate evidence claims",
        source_content_hashes=("b" * 64,),
        untrusted_source_text="source text",
    )
    receipt = confirm_routing_preview(
        preview,
        confirmed_by="human",
        confirmed_at=datetime(2026, 7, 27, tzinfo=timezone.utc),
    )

    with tempfile.TemporaryDirectory() as td:
        store = EvidenceStore(Path(td) / "evidence.db")
        store.save_routing_receipt(receipt)
        restored = store.get_routing_receipt(receipt.id)

        assert restored == receipt
        store.close()
