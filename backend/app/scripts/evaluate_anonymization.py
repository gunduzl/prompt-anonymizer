#!/usr/bin/env python3
"""Evaluate DLP detection and anonymization on the synthetic dataset."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from app.dlp.client import PresidioClient
from app.dlp.placeholder import PlaceholderManager
from app.dlp.policy import DlpPolicy


ROOT = Path(__file__).resolve().parents[3]
DATASET_PATH = ROOT / "docs" / "reports" / "synthetic_pii_dataset.json"
RESULTS_PATH = ROOT / "docs" / "reports" / "synthetic_pii_evaluation_results.json"

TYPE_ALIASES = {
    "EMAIL_ADDRESS": "EMAIL",
    "PHONE_NUMBER": "PHONE",
    "NATIONAL_ID_TR": "TR_TCKN",
    "IBAN_CODE": "IBAN",
    "CREDIT_CARD_CVV": "SEC_CODE",
    "IP_ADDRESS": "IPV4",
}


def normalize_type(entity_type: str) -> str:
    return TYPE_ALIASES.get(entity_type, entity_type)


def entity_key(entity: dict[str, Any]) -> tuple[str, int, int]:
    return (normalize_type(entity["entity_type"]), int(entity["start"]), int(entity["end"]))


def round_metric(value: float) -> float:
    return round(value, 4)


async def evaluate() -> dict[str, Any]:
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    client = PresidioClient()
    policy = DlpPolicy()
    placeholder_manager = PlaceholderManager()

    total_expected = 0
    total_predicted = 0
    true_positive = 0
    record_correct = 0
    clean_true_negative = 0
    per_record: list[dict[str, Any]] = []
    anonymization_failures: list[dict[str, Any]] = []

    for record in dataset:
        text = record["text"]
        expected = {entity_key(entity) for entity in record["entities"]}
        raw_predictions = await client.analyze(text)
        predictions = {entity_key(entity) for entity in raw_predictions}

        tp = len(expected & predictions)
        fp = len(predictions - expected)
        fn = len(expected - predictions)

        total_expected += len(expected)
        total_predicted += len(predictions)
        true_positive += tp

        expected_has_pii = bool(expected)
        predicted_has_pii = bool(predictions)
        if expected_has_pii == predicted_has_pii:
            record_correct += 1
        if not expected_has_pii and not predicted_has_pii:
            clean_true_negative += 1

        action, flags = policy.decide(raw_predictions)
        masked_text = await client.anonymize(text, raw_predictions, mode="mask") if raw_predictions else text
        placeholder_text, mappings = placeholder_manager.anonymize_with_placeholders(text, raw_predictions)

        leaked_expected_values = [
            entity["text"]
            for entity in record["entities"]
            if entity["text"] in masked_text or entity["text"] in placeholder_text
        ]
        if leaked_expected_values:
            anonymization_failures.append(
                {
                    "id": record["id"],
                    "leaked_values": leaked_expected_values,
                    "masked_text": masked_text,
                    "placeholder_text": placeholder_text,
                }
            )

        per_record.append(
            {
                "id": record["id"],
                "expected_count": len(expected),
                "predicted_count": len(predictions),
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "action": action,
                "flags": [normalize_type(flag) for flag in flags],
                "masked_text": masked_text,
                "placeholder_text": placeholder_text,
                "placeholder_count": len(mappings),
                "expected_entities": sorted([list(item) for item in expected]),
                "predicted_entities": sorted([list(item) for item in predictions]),
            }
        )

    false_positive = total_predicted - true_positive
    false_negative = total_expected - true_positive

    precision = true_positive / total_predicted if total_predicted else 0.0
    recall = true_positive / total_expected if total_expected else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    record_accuracy = record_correct / len(dataset) if dataset else 0.0
    entity_accuracy = (
        (true_positive + clean_true_negative)
        / (true_positive + false_positive + false_negative + clean_true_negative)
        if (true_positive + false_positive + false_negative + clean_true_negative)
        else 0.0
    )
    anonymization_success_rate = (
        (len(dataset) - len(anonymization_failures)) / len(dataset) if dataset else 0.0
    )

    results = {
        "dataset_path": str(DATASET_PATH.relative_to(ROOT)),
        "record_count": len(dataset),
        "pii_record_count": sum(1 for record in dataset if record["entities"]),
        "clean_record_count": sum(1 for record in dataset if not record["entities"]),
        "entity_count": total_expected,
        "confusion": {
            "true_positive": true_positive,
            "false_positive": false_positive,
            "false_negative": false_negative,
            "clean_true_negative_records": clean_true_negative,
        },
        "metrics": {
            "precision": round_metric(precision),
            "recall": round_metric(recall),
            "f1": round_metric(f1),
            "record_accuracy": round_metric(record_accuracy),
            "entity_accuracy_with_clean_tn": round_metric(entity_accuracy),
            "anonymization_success_rate": round_metric(anonymization_success_rate),
        },
        "per_record": per_record,
        "anonymization_failures": anonymization_failures,
    }

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    return results


def main() -> None:
    results = asyncio.run(evaluate())
    print(json.dumps(results["metrics"], ensure_ascii=False, indent=2))
    print(f"Wrote evaluation results to {RESULTS_PATH}")


if __name__ == "__main__":
    main()
