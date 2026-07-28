"""Local SQLite persistence for typed source receipts and evidence claims."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from lns_kernel.contracts import EvidenceClaim, EvidenceClass, SourceReceipt


class EvidenceStore:
    """Persists metadata/hashes only; retrieved body retention belongs to a separate policy."""

    def __init__(self, path: Path) -> None:
        self._connection = sqlite3.connect(path)
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        self._connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS source_receipts (
                id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS evidence_claims (
                id TEXT PRIMARY KEY,
                source_receipt_id TEXT NULL,
                payload_json TEXT NOT NULL,
                FOREIGN KEY(source_receipt_id) REFERENCES source_receipts(id)
            );
            CREATE INDEX IF NOT EXISTS idx_evidence_claims_source
                ON evidence_claims(source_receipt_id);
            """
        )
        self._connection.commit()

    def close(self) -> None:
        self._connection.close()

    def save_source_receipt(self, receipt: SourceReceipt) -> None:
        self._connection.execute(
            """
            INSERT INTO source_receipts(id, payload_json) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json
            """,
            (receipt.id, receipt.model_dump_json()),
        )
        self._connection.commit()

    def get_source_receipt(self, receipt_id: str) -> SourceReceipt | None:
        row = self._connection.execute(
            "SELECT payload_json FROM source_receipts WHERE id=?", (receipt_id,)
        ).fetchone()
        return None if row is None else SourceReceipt.model_validate_json(row["payload_json"])

    def save_evidence_claim(self, claim: EvidenceClaim) -> None:
        if (
            claim.classification in {EvidenceClass.RETRIEVED, EvidenceClass.OBSERVATION}
            and self.get_source_receipt(claim.source_receipt_id or "") is None
        ):
            raise ValueError("retrieved claim references missing source receipt")
        self._connection.execute(
            """
            INSERT INTO evidence_claims(id, source_receipt_id, payload_json) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                source_receipt_id=excluded.source_receipt_id,
                payload_json=excluded.payload_json
            """,
            (claim.id, claim.source_receipt_id, claim.model_dump_json()),
        )
        self._connection.commit()

    def get_evidence_claim(self, claim_id: str) -> EvidenceClaim | None:
        row = self._connection.execute(
            "SELECT payload_json FROM evidence_claims WHERE id=?", (claim_id,)
        ).fetchone()
        return None if row is None else EvidenceClaim.model_validate_json(row["payload_json"])

    def list_evidence_claims(self, *, source_receipt_id: str | None = None) -> list[EvidenceClaim]:
        if source_receipt_id is None:
            rows = self._connection.execute("SELECT payload_json FROM evidence_claims ORDER BY id").fetchall()
        else:
            rows = self._connection.execute(
                "SELECT payload_json FROM evidence_claims WHERE source_receipt_id=? ORDER BY id",
                (source_receipt_id,),
            ).fetchall()
        return [EvidenceClaim.model_validate_json(row["payload_json"]) for row in rows]
