from datetime import datetime, timezone
from pathlib import Path
import tempfile

import pytest

from lns_kernel.contracts import EvidenceClaim, EvidenceClass, SourceReceipt
from lns_server.evidence_store import EvidenceStore


def receipt() -> SourceReceipt:
    return SourceReceipt(
        id="source-nd-retail",
        canonical_url="https://strategicmetalsinvest.com/neodymium-prices/",
        publisher="Strategic Metals Invest",
        retrieved_at=datetime(2026, 7, 27, tzinfo=timezone.utc),
        content_hash="a" * 64,
        source_type="web_page",
        commercial_interest="sells physical rare-earth products",
    )


def claim() -> EvidenceClaim:
    return EvidenceClaim(
        id="claim-nd-retail-basis",
        classification=EvidenceClass.RETRIEVED,
        claim_text="The displayed value is a private-investor retail series.",
        source_receipt_id="source-nd-retail",
        conflicts_with_claim_ids=("claim-bulk-price-basis",),
    )


def test_source_and_claim_survive_restart_with_hash_and_conflict_metadata():
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "evidence.db"
        store = EvidenceStore(path)
        store.save_source_receipt(receipt())
        store.save_evidence_claim(claim())
        store.close()

        reopened = EvidenceStore(path)
        restored_source = reopened.get_source_receipt("source-nd-retail")
        restored_claim = reopened.get_evidence_claim("claim-nd-retail-basis")

        assert restored_source is not None
        assert restored_source.content_hash == "a" * 64
        assert restored_source.commercial_interest == "sells physical rare-earth products"
        assert restored_claim is not None
        assert restored_claim.conflicts_with_claim_ids == ("claim-bulk-price-basis",)
        reopened.close()


def test_retrieved_claim_cannot_reference_missing_source_receipt():
    with tempfile.TemporaryDirectory() as td:
        store = EvidenceStore(Path(td) / "evidence.db")
        with pytest.raises(ValueError, match="missing source receipt"):
            store.save_evidence_claim(claim())
        store.close()
