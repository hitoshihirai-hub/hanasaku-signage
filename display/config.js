/* display ページの設定値。
   プロトタイプ段階の暫定値。本番では値を差し替える。 */
window.DISPLAY_CONFIG = {
  // データ取得方式: "dummy" = 内部ダミー / "api" = サーバー /api/flowers を呼ぶ
  source: "api",

  // サーバーAPIの基点（source = "api" のときに使用）
  apiBase: "https://hanasaku-api.onrender.com",

  // ポーリング間隔（ミリ秒）。本番は OTOMO の読込周期に合わせて検討。
  pollIntervalMs: 30 * 1000,

  // 初回ロード時、既存花を「咲きおえた状態」で並べるか（true）、
  // 全部 fresh bloom で見せるか（false）。
  // NOTE: OTOMO はスケジュールで出たり消えたりするため、登場のたびに
  //       まっさらな新規ロードになる。本番は false（登場＝毎回フル開花
  //       ショー）が正しい。true のままだと「無言で花が並ぶだけ」になり、
  //       開花アニメが誰にも見られない。7/23 のテスト後に確定する。
  initialBloomAsSettled: true,

  // 花の最大表示数（古いものから間引く）。性能保護。
  // NOTE: 実機での上限は 7/23 の STB テストで実測して確定する。
  maxFlowers: 600,

  // 開花ショーの目安尺（ミリ秒）。花数によらずこの時間内に降り終える。
  showDurationMs: 60 * 1000,

  // デバッグ操作（F=花追加 / R=リセット / D=パネル切替）を有効にする
  debug: true,

  // ── 以下、7/23 STB実機テスト用の既定値（URLクエリで上書きする） ──
  seedCount: 18,     // dummy モードの初期投入数
  style:     "rich", // 花の描画: "rich"=グラデ有り / "flat"=フラット塗り
  sway:      true,   // 着地後の永続ゆらぎ
  bgEffects: true,   // 背景の feTurbulence フィルタ
  diag:      false,  // 診断オーバーレイ
};

/* ── URLクエリによる上書き（7/23 STB実機テスト用） ────────────────────
     ?demo=1      dummyモード。APIに依存せず花が降る（描画能力の純粋テスト）
     ?n=300       花の数。FPS上限の実測用
     ?style=flat  簡素描画（flat=グラデ無し・1花1<use> / rich=現行）
     ?sway=0      着地後の永続ゆらぎを止める（常時GPU負荷の切り分け）
     ?fx=0        背景の feTurbulence フィルタを無効化（背景コストの切り分け）
     ?diag=1      診断オーバーレイのみ表示（apiモードのまま）

   テスト用パラメータが1つでも付いていれば、診断オーバーレイを表示する。
   OTOMO の STB にはキーボードが無く D キーを押せないため、
   操作不要で常時表示する必要がある。

   本番では、クエリ無しの素の URL を登録すれば従来どおり動く。
──────────────────────────────────────────────────────────────── */
(function applyQueryOverrides() {
  const q = new URLSearchParams(location.search);
  const c = window.DISPLAY_CONFIG;
  let touched = false;

  if (q.get("demo") === "1") {
    c.source = "dummy";
    c.initialBloomAsSettled = false; // 登場＝毎回フル開花ショー
    c.pollIntervalMs = 8 * 1000;     // 保持フェーズのライブ感を確認しやすく
    touched = true;
  }

  const n = parseInt(q.get("n"), 10);
  if (Number.isFinite(n) && n > 0) {
    c.seedCount  = n;
    c.maxFlowers = n; // 測りたい数ちょうどを描く
    touched = true;
  }

  const style = q.get("style");
  if (style === "flat" || style === "rich") { c.style = style; touched = true; }

  if (q.get("sway") === "0") { c.sway      = false; touched = true; }
  if (q.get("fx")   === "0") { c.bgEffects = false; touched = true; }
  if (q.get("diag") === "1") { touched = true; }

  c.diag = touched;
})();
