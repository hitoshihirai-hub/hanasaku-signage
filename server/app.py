"""みんなで咲かす未来の街 — バックエンド API (FastAPI + SQLite)

起動:
    uvicorn app:app --reload

エンドポイント:
    POST /api/flowers        花を1件登録
    GET  /api/flowers?since= since より後の花リスト + 集計
    GET  /api/stats          集計のみ（軽量）
    POST /api/demo/seed      デモ用サンプルデータ投入（DEMO_MODE=1 のときのみ有効）
"""
import os
import random
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import db
import filters
from models import FlowerIn, FlowerOut, FlowersResponse, StatsResponse

# デモモード: 環境変数 DEMO_MODE=1 のときだけ /api/demo/seed が有効になる
DEMO_MODE: bool = os.getenv("DEMO_MODE", "0") == "1"


# ---- アプリ起動 / 終了フック ----------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="みんなで咲かす未来の街 API", lifespan=lifespan)


# ---- CORS ----------------------------------------------------------------
# 開発中は全オリジンを許可。
# TODO: 本番前に allow_origins を展示用URLに限定すること。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---- エンドポイント -------------------------------------------------------

@app.post("/api/flowers", response_model=FlowerOut, status_code=201)
def post_flower(body: FlowerIn):
    """花を1件登録する。

    - color / kind のバリデーションは Pydantic が担当（422 を自動返却）。
    - message の NGワード・文字数チェックはここで実施。

    NOTE: 本番では message を管理者が確認してから表示する仕組みを検討すること。
    """
    try:
        filters.validate_message(body.message or "")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    flower = db.insert_flower(body.color, body.kind, body.message or "")
    return flower


@app.get("/api/flowers", response_model=FlowersResponse)
def get_flowers(since: int = Query(default=0, ge=0)):
    """since（花のID）より後の花リストと集計を返す。

    表示ページが「前回どこまで描いたか」を since に渡す。
    差分だけ受け取って一斉開花できる。
    since=0（省略時）は全件を返す。
    """
    flowers = db.get_flowers_since(since)
    total, today = db.get_stats()
    latest_id = flowers[-1]["id"] if flowers else since
    return FlowersResponse(
        flowers=flowers,
        total=total,
        today=today,
        latest_id=latest_id,
    )


@app.get("/api/stats", response_model=StatsResponse)
def get_stats():
    """累計・本日の件数のみを返す軽量エンドポイント（任意）。"""
    total, today = db.get_stats()
    return StatsResponse(total=total, today=today)


# ---- デモ用エンドポイント（DEMO_MODE=1 のときのみ） --------------------

@app.post("/api/demo/seed", status_code=201)
def demo_seed(n: int = Query(default=30, ge=1, le=200)):
    """デモ用サンプルデータを n 件投入する。

    Render 無料プランは再起動で SQLite がリセットされるため、
    デモ前にこのエンドポイントを叩いて花を補充する。

    DEMO_MODE=1 のときのみ有効。本番では環境変数を設定しないこと。
    """
    if not DEMO_MODE:
        raise HTTPException(status_code=404, detail="Not found")

    colors  = ["pink", "yellow", "white", "purple", "red"]
    kinds   = ["a", "b", "c"]
    messages = ["", "", "", "", "きれい", "また来たい", "ありがとう", "わくわく"]

    inserted = 0
    for _ in range(n):
        db.insert_flower(
            color   = random.choice(colors),
            kind    = random.choice(kinds),
            message = random.choice(messages),
        )
        inserted += 1

    return {"seeded": inserted}
