# server — バックエンド API

FastAPI + SQLite による軽量 API。
花を受け取って保存し、表示ページ（display）に渡す。

## セットアップ

```bash
cd server

# 仮想環境（推奨）
python -m venv .venv
source .venv/Scripts/activate   # Git Bash の場合
# .venv\Scripts\activate        # PowerShell の場合

pip install -r requirements.txt
```

## 起動

```bash
uvicorn app:app --reload
```

起動後、<http://localhost:8000/docs> で Swagger UI が開く。

## エンドポイント一覧

| メソッド | パス | 役割 |
|---------|------|------|
| POST | `/api/flowers` | 花を1件登録 |
| GET  | `/api/flowers?since=0` | since より後の花リスト + 集計 |
| GET  | `/api/stats` | 集計のみ（軽量） |

### POST `/api/flowers` リクエスト例

```json
{
  "color":   "pink",
  "kind":    "a",
  "message": "また来たい"
}
```

- `color` : `pink` / `yellow` / `white` / `purple` / `red`
- `kind`  : `a`（デイジー）/ `b`（チューリップ）/ `c`（ポピー）
- `message`: 任意、最大 50 文字、NGワードフィルタあり

### GET `/api/flowers` レスポンス例

```json
{
  "flowers": [
    { "id": 1, "color": "pink", "kind": "a", "message": "きれい", "created_at": "2026-05-27T..." }
  ],
  "total":     42,
  "today":     12,
  "latest_id": 1
}
```

`latest_id` を次回の `since` に渡すと差分だけ取得できる。

## display ページとの連携（API モードに切り替える方法）

`display/config.js` を以下のように変更する：

```js
source:  "api",
apiBase: "http://localhost:8000",
```

## ファイル構成

```
server/
├─ app.py           FastAPI エントリ・ルーティング
├─ db.py            SQLite 初期化・クエリ
├─ models.py        Pydantic スキーマ
├─ filters.py       NGワード・文字数チェック
├─ requirements.txt
└─ data/
   └─ flowers.db    ← 起動時に自動生成（.gitignore 対象）
```

## 既知の制約・本番までの宿題

- CORS は `allow_origins=["*"]` で全開。本番前に展示URLに絞ること（`app.py` の TODO コメント参照）
- NGワードリストは最低限（`filters.py`）。本番前に拡充またはサービス連携を検討
- message の表示前承認フローは未実装（SPEC §5 参照）
- SQLite は単一ファイル・単一プロセス前提。並列書き込み負荷が高い場合は PostgreSQL 等を検討
