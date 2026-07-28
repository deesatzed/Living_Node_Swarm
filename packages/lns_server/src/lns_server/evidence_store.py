"""Local SQLite persistence for typed source receipts and evidence claims."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from lns_kernel.contracts import EvidenceClaim, EvidenceClass, SourceReceipt, TargetContract
from lns_server.research_routing import ProviderRoutingReceipt
from lns_server.research_plan import ResearchCompletenessReport
from lns_server.research_review import ClaimReview
from lns_server.candidate_approval import CandidateApprovalProposal


class EvidenceStore:
    """Persists metadata/hashes only; retrieved body retention belongs to a separate policy."""

    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        self._connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS source_receipts (
                id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS target_contracts (
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
            CREATE TABLE IF NOT EXISTS provider_routing_receipts (
                id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS research_completeness_reports (
                id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS claim_reviews (
                target_contract_id TEXT NOT NULL,
                claim_id TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                PRIMARY KEY(target_contract_id, claim_id)
            );
            CREATE TABLE IF NOT EXISTS candidate_approval_proposals (
                id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL
            );
            """
        )
        self._connection.commit()

    def close(self) -> None:
        self._connection.close()

    def save_target_contract(self, target: TargetContract) -> None:
        self._connection.execute(
            """
            INSERT INTO target_contracts(id, payload_json) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json
            """,
            (target.id, target.model_dump_json()),
        )
        self._connection.commit()

    def get_target_contract(self, target_id: str) -> TargetContract | None:
        row = self._connection.execute(
            "SELECT payload_json FROM target_contracts WHERE id=?", (target_id,)
        ).fetchone()
        return None if row is None else TargetContract.model_validate_json(row["payload_json"])

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

    def save_routing_receipt(self, receipt: ProviderRoutingReceipt) -> None:
        self._connection.execute(
            """
            INSERT INTO provider_routing_receipts(id, payload_json) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json
            """,
            (receipt.id, receipt.model_dump_json()),
        )
        self._connection.commit()

    def get_routing_receipt(self, receipt_id: str) -> ProviderRoutingReceipt | None:
        row = self._connection.execute(
            "SELECT payload_json FROM provider_routing_receipts WHERE id=?", (receipt_id,)
        ).fetchone()
        return None if row is None else ProviderRoutingReceipt.model_validate_json(row["payload_json"])

    def save_research_completeness_report(self, report: ResearchCompletenessReport) -> None:
        self._connection.execute(
            """
            INSERT INTO research_completeness_reports(id, payload_json) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json
            """,
            (report.id, report.model_dump_json()),
        )
        self._connection.commit()

    def get_research_completeness_report(self, report_id: str) -> ResearchCompletenessReport | None:
        row = self._connection.execute(
            "SELECT payload_json FROM research_completeness_reports WHERE id=?", (report_id,)
        ).fetchone()
        return None if row is None else ResearchCompletenessReport.model_validate_json(row["payload_json"])

    def save_claim_review(self, review: ClaimReview) -> None:
        self._connection.execute(
            """
            INSERT INTO claim_reviews(target_contract_id, claim_id, payload_json) VALUES (?, ?, ?)
            ON CONFLICT(target_contract_id, claim_id) DO UPDATE SET payload_json=excluded.payload_json
            """,
            (review.target_contract_id, review.claim_id, review.model_dump_json()),
        )
        self._connection.commit()

    def get_claim_review(self, *, target_contract_id: str, claim_id: str) -> ClaimReview | None:
        row = self._connection.execute(
            "SELECT payload_json FROM claim_reviews WHERE target_contract_id=? AND claim_id=?",
            (target_contract_id, claim_id),
        ).fetchone()
        return None if row is None else ClaimReview.model_validate_json(row["payload_json"])

    def save_candidate_approval_proposal(self, proposal: CandidateApprovalProposal) -> None:
        self._connection.execute(
            "INSERT INTO candidate_approval_proposals(id, payload_json) VALUES (?, ?)",
            (proposal.id, proposal.model_dump_json()),
        )
        self._connection.commit()

    def get_candidate_approval_proposal(self, proposal_id: str) -> CandidateApprovalProposal | None:
        row = self._connection.execute(
            "SELECT payload_json FROM candidate_approval_proposals WHERE id=?", (proposal_id,)
        ).fetchone()
        return None if row is None else CandidateApprovalProposal.model_validate_json(row["payload_json"])
