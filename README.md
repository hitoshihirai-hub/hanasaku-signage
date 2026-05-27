# みんなで咲かす未来の街

GREEN×EXPO 2027 大阪府ブース向け参加型サイネージのプロトタイプ。

## 構成

```
display/   花が咲く街の表示ページ（サイネージ用・静的HTML）
server/    FastAPI + SQLite バックエンド
mobile/    来場者スマホ向けツアーページ（未実装）
```

---

## ローカルで動かす（開発用）

### 1. サーバーを起動

```bash
cd server
python -m venv .venv
source .venv/Scripts/activate   # Git Bash
pip install -r requirements.txt
uvicorn app:app --reload
```

→ `http://localhost:8000/docs` で Swagger UI が開く

### 2. 表示ページを開く

```bash
cd display
python -m http.server 8080
```

→ `http://localhost:8080/` をブラウザで開く

ローカル確認時は `display/config.js` の `source` を `"dummy"` にしておく（初期値）。

---

## Render.com へのデプロイ（デモ公開用）

### 前提

- GitHub アカウント（無料）
- Render.com アカウント（無料）

### 手順

**① GitHub にプッシュ**

```bash
# リポジトリのルートで
git init
git add .
git commit -m "initial commit"
```

GitHub で新しいリポジトリを作り（例: `hanasaku-signage`）、プッシュ：

```bash
git remote add origin https://github.com/ユーザー名/hanasaku-signage.git
git branch -M main
git push -u origin main
```

**② Render でデプロイ**

1. [render.com](https://render.com) にログイン
2. `New +` → `Blueprint`
3. GitHub リポジトリを選択 → `Connect`
4. `render.yaml` が自動検出され、サービスが作成される
5. しばらく待つとデプロイ完了 →  
   `https://hanasaku-api.onrender.com` のような URL が発行される

**③ display をAPI連携モードに切り替え**

`display/config.js` を編集：

```js
source:  "api",
apiBase: "https://hanasaku-api.onrender.com",  // ← 発行されたURLに変える
```

**④ デモ前の花の補充**

Render 無料プランは再起動でデータがリセットされる。  
デモ前にブラウザで以下を開いて花を投入する：

```
https://hanasaku-api.onrender.com/api/demo/seed?n=30
```

または Swagger UI（`/docs`）から `POST /api/demo/seed` を実行。

---

## 注意事項

| 項目 | 内容 |
|------|------|
| スリープ | 無料プランは15分アクセスがないとスリープ。最初のリクエストに約30秒かかる |
| データ永続性 | 無料プランはサービス再起動でSQLiteがリセットされる。デモ前に seed すること |
| CORS | 現在 `allow_origins=["*"]`（全許可）。本番前に制限すること |
| DEMO_MODE | `render.yaml` の `DEMO_MODE=1` を削除すると seed エンドポイントが無効化される |
