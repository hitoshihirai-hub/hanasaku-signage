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

  // 画面に同時に咲かせる最大数。超えたら古い花から静かにフェードアウトする。
  // NOTE: この値は2つの制約の小さい方で決まる:
  //   (1) 美観 … Sakana調の余白を保つには少なめが良い（密集するとうっとうしい）
  //   (2) 性能 … STB が耐える上限。7/23 のテストで実測して確定する。
  // 既定は美観優先の暫定値。?n= で上書きして性能上限を測る。
  maxFlowers: 90,

  // 開花ショーの目安尺（ミリ秒）。花数によらずこの時間内に降り終える。
  showDurationMs: 60 * 1000,

  // 背景マップ画像（方法B＝淡く敷く）。
  // ファイルが読み込めたら自作の線画ランドマークは隠す（マップに城/塔が
  // 含まれるため）。読み込めなければ線画のまま（＝公開URLでは安全側）。
  // NOTE: 画像は .gitignore 済み。購入・ライセンス確認が済むまで公開しない。
  // 背景画像。bgMode で置き方が変わる。
  //   "band"  … 横長のスカイラインを画面下部に帯として敷く（線画向き）
  //   "cover" … 全面を覆って淡く敷く（水彩マップ向き）
  // 画像は .gitignore 済み。購入・ライセンス確認が済むまで公開しない。
  bgImage:   "assets/bg-skyline.png",
  bgMode:    "band",
  bgOpacity: 0.85,           // 線画なので薄めすぎない
  bgAlign:   "xMaxYMid",     // cover のとき、画像のどこを見せるか
  bgBandBottomY: 1700,       // band のとき、帯の下端をこのY座標に合わせる
  bgBandWidth:   1.0,        // band のとき、画面幅に対する倍率

  // 花の「積み上がり」範囲。
  // 背景スカイラインの足元(pileGroundY)から下に溜まり始め、
  // 花が増えるほど上へ伸びる。満杯でも pileTopY までしか上がらないので、
  // よほど溜まらない限り背景の街は隠れない。
  pileGroundY: 1700,         // 溜まり始める高さ（＝スカイラインの足元）
  pileBottomY: 1895,         // 画面下端側の限界
  pileTopY:    1360,         // 満杯のときに届く一番上
  pileCurve:   1.25,         // >1 で「序盤は低いまま、増えてから上がる」

  // デバッグ操作（F=花追加 / R=リセット / D=パネル切替）を有効にする
  debug: true,

  // ── 以下、7/23 STB実機テスト用の既定値（URLクエリで上書きする） ──
  seedCount: 18,     // dummy モードの初期投入数
  style:     "flat", // 花の描画: "flat"=Sakana調の線画＋フラット塗り（既定） / "rich"=旧グラデ
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

  // 背景マップの淡さをその場で試す（例 ?bgop=0.45）。0〜1 にクランプ。
  const bgop = parseFloat(q.get("bgop"));
  if (Number.isFinite(bgop)) {
    c.bgOpacity = Math.max(0, Math.min(1, bgop));
    touched = true;
  }

  // ?diag=0 なら、他のテスト用パラメータが付いていても診断表示を出さない
  // （全体のデザインを邪魔なく確認したいとき用）
  c.diag = (q.get("diag") === "0") ? false : touched;
})();
