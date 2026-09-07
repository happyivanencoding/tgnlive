"""Back up the existing production SQLite and verify logical data preservation.

Usage: python scripts/sqlite-release-snapshot.py capture <new-private-directory>
       python scripts/sqlite-release-snapshot.py verify <private-snapshot.json>
No schema, save, request, or trace is modified. Receipts contain counts/hashes,
not row contents. Run before deployment and immediately after read-only checks.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / "data" / "tgn-live.sqlite"
TABLES = ("games", "worlds", "game_worlds", "turns", "requests", "canon_ledger", "story_plans", "traces")

def connect_readonly(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise FileNotFoundError(path)
    return sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True, timeout=20)

def fingerprint(connection: sqlite3.Connection) -> dict:
    result = {}
    for table in TABLES:
        columns = connection.execute(f'PRAGMA table_info("{table}")').fetchall()
        if not columns:
            raise RuntimeError(f"Expected production table is absent: {table}")
        primary = [row[1] for row in sorted(columns, key=lambda row: row[5]) if row[5]]
        order = ",".join('"' + name.replace('"', '""') + '"' for name in primary) or "rowid"
        cursor = connection.execute(f'SELECT * FROM "{table}" ORDER BY {order}')
        digest, count = hashlib.sha256(), 0
        for row in cursor:
            payload = json.dumps(row, ensure_ascii=False, separators=(",", ":"),
                                 default=lambda value: {"bytes": value.hex()}).encode("utf-8")
            digest.update(len(payload).to_bytes(8, "big")); digest.update(payload); count += 1
        result[table] = {"rows": count, "sha256": digest.hexdigest()}
    return result

def integrity(connection: sqlite3.Connection) -> dict:
    return {"integrity": [row[0] for row in connection.execute("PRAGMA integrity_check")],
            "foreignKeyViolations": len(connection.execute("PRAGMA foreign_key_check").fetchall()),
            "pendingRequests": connection.execute("SELECT count(*) FROM requests WHERE status IN ('running','pending')").fetchone()[0]}

def private_path(raw: str) -> Path:
    path = Path(raw)
    if not path.is_absolute():
        path = ROOT / path
    path = path.resolve()
    if not path.is_relative_to((ROOT / ".runtime").resolve()):
        raise ValueError("Backup and private receipts must remain under this project's .runtime")
    return path

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("capture", "verify"))
    parser.add_argument("path")
    args = parser.parse_args()
    target = private_path(args.path)
    now = datetime.now(timezone.utc).isoformat()
    if args.action == "capture":
        target.mkdir(parents=True, exist_ok=False)
        with connect_readonly(DATABASE) as source:
            checks = integrity(source)
            if checks["pendingRequests"]:
                raise RuntimeError("Active/pending production requests exist; do not deploy")
            with sqlite3.connect(target / "tgn-live.sqlite") as destination:
                source.backup(destination, pages=256, sleep=0.025)
        with connect_readonly(target / "tgn-live.sqlite") as snapshot:
            checks, tables = integrity(snapshot), fingerprint(snapshot)
        if checks["integrity"] != ["ok"] or checks["foreignKeyViolations"] or checks["pendingRequests"]:
            raise RuntimeError("Snapshot requires review; production was not changed")
        receipt = {"capturedAt": now, "backup": str(target / "tgn-live.sqlite"), "checks": checks, "tables": tables}
        (target / "snapshot.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
        print(json.dumps({"snapshot": str(target / "snapshot.json"), "checks": checks,
                          "rowCounts": {name: value["rows"] for name, value in tables.items()}}, indent=2))
    else:
        receipt = json.loads(target.read_text(encoding="utf-8"))
        with connect_readonly(DATABASE) as current:
            current.execute("BEGIN")
            checks, tables = integrity(current), fingerprint(current)
        same = {name: tables[name] == receipt["tables"][name] for name in TABLES}
        passed = all(same.values()) and checks["integrity"] == ["ok"] and not checks["foreignKeyViolations"] and not checks["pendingRequests"]
        report = {"verifiedAt": now, "passed": passed, "snapshot": str(target), "checks": checks,
                  "sameTables": same, "before": receipt["tables"], "after": tables}
        output = target.parent / ("verified-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json")
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps({"passed": passed, "report": str(output), "sameTables": same, "checks": checks}, indent=2))
        if not passed:
            raise SystemExit(2)

if __name__ == "__main__":
    main()
