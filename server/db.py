"""SQLite 操作層。sqlite3（標準ライブラリ）のみ使用。"""
import sqlite3
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "data" / "flowers.db"


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """起動時に呼ぶ。DB とテーブルを作成（存在する場合はスキップ）。"""
    DB_PATH.parent.mkdir(exist_ok=True)
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS flowers (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                color      TEXT NOT NULL,
                kind       TEXT NOT NULL,
                message    TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()


def insert_flower(color: str, kind: str, message: str) -> dict[str, Any]:
    """花を1件登録して、登録済みのレコードを返す。"""
    created_at = datetime.now(timezone.utc).isoformat()
    with _get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO flowers (color, kind, message, created_at) VALUES (?, ?, ?, ?)",
            (color, kind, message, created_at),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM flowers WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return dict(row)


def get_flowers_since(since: int) -> list[dict[str, Any]]:
    """since（花のID）より後のレコードを昇順で返す。"""
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM flowers WHERE id > ? ORDER BY id ASC",
            (since,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_stats() -> tuple[int, int]:
    """(total件数, 本日の件数) を返す。"""
    today_prefix = date.today().isoformat()  # "YYYY-MM-DD"
    with _get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM flowers").fetchone()[0]
        today = conn.execute(
            "SELECT COUNT(*) FROM flowers WHERE created_at LIKE ?",
            (today_prefix + "%",),
        ).fetchone()[0]
    return total, today
