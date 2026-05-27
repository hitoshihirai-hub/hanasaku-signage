"""Pydantic スキーマ定義。"""
from typing import Optional, List
from pydantic import BaseModel, field_validator

ALLOWED_COLORS = {"pink", "yellow", "white", "purple", "red"}
ALLOWED_KINDS  = {"a", "b", "c"}


class FlowerIn(BaseModel):
    color:   str
    kind:    str
    message: Optional[str] = ""

    @field_validator("color")
    @classmethod
    def check_color(cls, v: str) -> str:
        if v not in ALLOWED_COLORS:
            raise ValueError(f"color は {sorted(ALLOWED_COLORS)} のいずれかにしてください")
        return v

    @field_validator("kind")
    @classmethod
    def check_kind(cls, v: str) -> str:
        if v not in ALLOWED_KINDS:
            raise ValueError(f"kind は {sorted(ALLOWED_KINDS)} のいずれかにしてください")
        return v


class FlowerOut(BaseModel):
    id:         int
    color:      str
    kind:       str
    message:    str
    created_at: str


class FlowersResponse(BaseModel):
    flowers:   List[FlowerOut]
    total:     int
    today:     int
    latest_id: int


class StatsResponse(BaseModel):
    total: int
    today: int
