/* display ページの設定値。
   プロトタイプ段階の暫定値。本番では値を差し替える。 */
window.DISPLAY_CONFIG = {
  // データ取得方式: "dummy" = 内部ダミー / "api" = サーバー /api/flowers を呼ぶ
  source: "api",

  // サーバーAPIの基点（source = "api" のときに使用）
  apiBase: "https://hanasaku-api.onrender.com",

  // ポーリング間隔（ミリ秒）。本番は OTOMO の読込周期に合わせて検討。
  // プロトタイプは見栄え確認のため短めの 30秒。
  pollIntervalMs: 30 * 1000,

  // 初回ロード時、既存花を「咲きおえた状態」で並べるか（true）、
  // 全部 fresh bloom で見せるか（false）。本番は true 推奨（屋外でちらつかない）。
  initialBloomAsSettled: true,

  // 花の最大表示数（古いものから間引く）。性能保護。
  maxFlowers: 600,

  // デバッグ操作（F=花追加 / R=リセット / D=パネル切替）を有効にする
  debug: true,
};
