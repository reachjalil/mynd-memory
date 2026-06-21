"""Minimal bounded HydraDB v2 lifecycle example.

Prerequisites:
    pip install "hydradb-sdk>=2,<3"
    export HYDRA_DB_API_KEY="..."

Use a non-production tenant ID for this example.
"""

from __future__ import annotations

import json
import os
import time
from collections.abc import Callable
from typing import TypeVar

from hydra_db import HydraDB

T = TypeVar("T")


def wait_until(
    operation: Callable[[], T | None],
    *,
    timeout_seconds: float,
    interval_seconds: float,
    description: str,
) -> T:
    """Poll until operation returns a non-None result or the deadline expires."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        result = operation()
        if result is not None:
            return result
        time.sleep(interval_seconds)
    raise TimeoutError(f"Timed out waiting for {description}")


def main() -> None:
    token = os.environ.get("HYDRA_DB_API_KEY")
    if not token:
        raise RuntimeError("HYDRA_DB_API_KEY is not configured")

    tenant_id = os.environ.get("HYDRA_TENANT_ID", "hydradb_skill_demo")
    sub_tenant_id = os.environ.get("HYDRA_SUB_TENANT_ID", "user_demo")
    memory_id = "user_demo_answer_style"

    client = HydraDB(token=token)

    # For repeated runs, reconcile an existing tenant according to your app's
    # desired-state logic rather than swallowing every create error.
    client.tenants.create(tenant_id=tenant_id)

    def tenant_ready() -> bool | None:
        response = client.tenants.status(tenant_id=tenant_id)
        return True if response.data.infra.ready_for_ingestion else None

    wait_until(
        tenant_ready,
        timeout_seconds=300,
        interval_seconds=5,
        description=f"tenant {tenant_id!r} to become ready",
    )

    ingest = client.context.ingest(
        type="memory",
        tenant_id=tenant_id,
        sub_tenant_id=sub_tenant_id,
        memories=json.dumps(
            [
                {
                    "id": memory_id,
                    "title": "Answer style",
                    "text": "The user prefers concise answers with concrete examples.",
                    "infer": False,
                    "additional_metadata": {"source": "hydradb-skill-demo"},
                }
            ]
        ),
    )
    context_id = ingest.data.results[0].id

    def context_searchable() -> str | None:
        item = client.context.status(
            tenant_id=tenant_id,
            sub_tenant_id=sub_tenant_id,
            ids=[context_id],
        ).data.statuses[0]
        state = item.indexing_status
        if state in {"graph_creation", "completed"}:
            return state
        if state in {"errored", "failed"}:
            detail = item.error_message or "HydraDB indexing failed"
            raise RuntimeError(f"Context {context_id!r} failed: {detail}")
        return None

    state = wait_until(
        context_searchable,
        timeout_seconds=300,
        interval_seconds=2,
        description=f"context {context_id!r} to become searchable",
    )

    result = client.query(
        tenant_id=tenant_id,
        sub_tenant_id=sub_tenant_id,
        query="How should responses be written for this user?",
        type="memory",
        query_by="hybrid",
        mode="thinking",
        max_results=5,
    )

    print(f"Context state: {state}")
    for chunk in result.data.chunks:
        print(f"- {chunk.chunk_content}")


if __name__ == "__main__":
    main()
