#!/usr/bin/env python3
"""Generate a deterministic synthetic PII dataset for DLP evaluation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT = ROOT / "docs" / "reports" / "synthetic_pii_dataset.json"


def span(text: str, entity_type: str, value: str) -> dict[str, Any]:
    start = text.index(value)
    return {
        "entity_type": entity_type,
        "start": start,
        "end": start + len(value),
        "text": value,
    }


def make_record(record_id: str, text: str, entities: list[tuple[str, str]]) -> dict[str, Any]:
    return {
        "id": record_id,
        "text": text,
        "entities": [span(text, entity_type, value) for entity_type, value in entities],
    }


def build_dataset() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = [
        make_record(
            "synthetic-001",
            "Customer Ahmet Yilmaz can be reached at ahmet.yilmaz@example.com.",
            [("PERSON", "Ahmet Yilmaz"), ("EMAIL", "ahmet.yilmaz@example.com")],
        ),
        make_record(
            "synthetic-002",
            "Support callback number is +90 532 456 78 90 for the incident.",
            [("PHONE", "+90 532 456 78 90")],
        ),
        make_record(
            "synthetic-003",
            "National identity value 12345678901 was pasted into the prompt.",
            [("TR_TCKN", "12345678901")],
        ),
        make_record(
            "synthetic-004",
            "Payment card 4580 8765 4321 9012 expires on 08/27 and CVC is 123.",
            [("CREDIT_CARD", "4580 8765 4321 9012"), ("DATE", "08/27"), ("SEC_CODE", "123")],
        ),
        make_record(
            "synthetic-005",
            "Transfer target IBAN is TR45 0006 2000 1234 5678 9000 12.",
            [("IBAN", "TR45 0006 2000 1234 5678 9000 12")],
        ),
        make_record(
            "synthetic-006",
            "Device telemetry shows IPv4 192.168.1.45 and MAC AA:BB:CC:DD:EE:FF.",
            [("IPV4", "192.168.1.45"), ("MAC", "AA:BB:CC:DD:EE:FF")],
        ),
        make_record(
            "synthetic-007",
            "IPv6 address 2001:0db8:85a3:0000:0000:8a2e:0370:7334 appeared in logs.",
            [("IPV6", "2001:0db8:85a3:0000:0000:8a2e:0370:7334")],
        ),
        make_record(
            "synthetic-008",
            "Vehicle plate 34 ABC 123 and driver license B98765432 are attached.",
            [("LICENSE_PLATE_TR", "34 ABC 123"), ("DRIVER_LICENSE", "B98765432")],
        ),
        make_record(
            "synthetic-009",
            "Passport U12345678 was included in the uploaded travel note.",
            [("PASSPORT", "U12345678")],
        ),
        make_record(
            "synthetic-010",
            "Company tax VKN 1234567890 and SGK 12-34567890-1 were shared.",
            [("VKN", "1234567890"), ("SGK", "12-34567890-1")],
        ),
        make_record(
            "synthetic-011",
            "Patient MRN 55667788 was referenced in the triage summary.",
            [("MRN", "55667788")],
        ),
        make_record(
            "synthetic-012",
            "Coordinates 41.0082, 28.9784 and geo URI geo:41.0082,28.9784 were present.",
            [("GEO_COORDS", "41.0082, 28.9784"), ("GEO_URI", "geo:41.0082,28.9784")],
        ),
        make_record(
            "synthetic-013",
            "IMEI 490154203237518 and Android ID a1b2c3d4e5f6a7b8 identify the device.",
            [("IMEI", "490154203237518"), ("ANDROID_ID", "a1b2c3d4e5f6a7b8")],
        ),
        make_record(
            "synthetic-014",
            "Session UUID 550e8400-e29b-41d4-a716-446655440000 was copied.",
            [("UUID", "550e8400-e29b-41d4-a716-446655440000")],
        ),
        make_record(
            "synthetic-015",
            "Meeting with Elif Demir is planned for 2025-10-12 15:30 in Levent/Istanbul.",
            [("PERSON", "Elif Demir"), ("DATETIME", "2025-10-12 15:30"), ("LOCATION", "Levent/Istanbul")],
        ),
        make_record(
            "synthetic-016",
            "Bank account 10984722 uses SWIFT TGBATRISXXX for customer 00451234.",
            [("ACCOUNT_NO", "10984722"), ("SWIFT_BIC", "TGBATRISXXX"), ("CUSTOMER_ID", "00451234")],
        ),
        make_record(
            "synthetic-017",
            "Address Camlica Mah. Yasemin Sk. No:12 Uskudar/Istanbul was entered.",
            [("ADDRESS", "Camlica Mah. Yasemin Sk. No:12 Uskudar/Istanbul")],
        ),
        make_record(
            "synthetic-018",
            "Plain operational note: retry the batch after the maintenance window.",
            [],
        ),
        make_record(
            "synthetic-019",
            "No personal data here; only aggregate usage counts and generic status.",
            [],
        ),
        make_record(
            "synthetic-020",
            "Release checklist mentions staging, rollback, and cache warmup.",
            [],
        ),
    ]
    return records


def main() -> None:
    DEFAULT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    dataset = build_dataset()
    DEFAULT_OUTPUT.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(dataset)} records to {DEFAULT_OUTPUT}")


if __name__ == "__main__":
    main()
