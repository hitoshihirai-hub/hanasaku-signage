"""メッセージのバリデーション（文字数・NGワード）。

プロトタイプ用の簡易実装。
本番ではNGワードリストを外部ファイル化し、管理者による
表示前承認フローの導入を強く推奨する（SPEC §5 参照）。
"""

MESSAGE_MAX_LENGTH = 50

# 簡易NGワードリスト（最低限）。本番前に専門サービスか辞書に差し替えること。
_NG_WORDS: list[str] = [
    "死", "殺", "fuck", "shit", "bitch", "ass",
]


def validate_message(text: str) -> None:
    """問題があれば ValueError を送出。呼び出し元で HTTPException に変換する。"""
    if len(text) > MESSAGE_MAX_LENGTH:
        raise ValueError(f"メッセージは{MESSAGE_MAX_LENGTH}文字以内にしてください")
    lower = text.lower()
    for word in _NG_WORDS:
        if word.lower() in lower:
            raise ValueError("メッセージに使用できない表現が含まれています")
