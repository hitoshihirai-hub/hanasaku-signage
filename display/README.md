# display — 「花が咲く街」表示ページ

縦型サイネージ（43インチ / 9:16）向け表示ページ。
プロトタイプ段階。ダミーデータで単体動作する。

## 起動方法

このフォルダ内で簡易HTTPサーバーを立てて、ブラウザで開く。

```bash
# Python が入っているなら一番手軽
python -m http.server 8080
```

ブラウザで <http://localhost:8080/> を開く。
（`file://` で直接開いても動作するが、推奨は HTTP 経由。）

## 表示の見え方

- 縦長 9:16 のステージが、画面いっぱいに内接表示される
- 初回ロード：既存花が静かに咲きそろった状態で表示される
- 以降 30秒ごとに「新しい花が一斉に咲く」演出が走る（dummy モード時）
- 上部にカウンタ（本日・累計）

## デバッグ操作（debug=true のとき）

| キー | 動作 |
|------|------|
| F    | 花を1個、その場で咲かせる（dummy 時のみ） |
| R    | 全リセット（花を消して再スタート） |
| D    | デバッグパネル表示／非表示 |

## 設定ファイル

`config.js` でモード・ポーリング間隔・最大表示数などを変更できる。

| キー | 内容 | 既定値 |
|------|------|--------|
| `source` | `"dummy"` または `"api"` | `"dummy"` |
| `apiBase` | API のベースURL | `http://localhost:8000` |
| `pollIntervalMs` | ポーリング間隔（ms） | `30000` |
| `initialBloomAsSettled` | 初回花を「咲き終わり状態」で並べるか | `true` |
| `maxFlowers` | 同時表示の最大花数 | `600` |
| `debug` | デバッグ操作を有効化 | `true` |

## ファイル構成

```
display/
├─ index.html           ステージ全体（背景の街・カウンタ・花レイヤー）
├─ config.js            動作設定
├─ css/display.css      レイアウト・色・bloom アニメ
├─ js/api.js            データ取得（dummy / api 切替）
├─ js/scene.js          花SVG生成・配置（重なり回避）
├─ js/bloom.js          一斉開花演出
└─ js/main.js           起動・タイマー・状態管理
```

## 既知の制約・本番までの宿題

- OTOMO 実機の Web 表示挙動（リロード方式・周期）は未確認のため、暫定動作
- ブラウザはモダンを前提（SVG filter `feTurbulence` / `feDisplacementMap` 使用）
- メッセージ表示・NGワード対応は未実装（mobile + server 側で対応予定）
