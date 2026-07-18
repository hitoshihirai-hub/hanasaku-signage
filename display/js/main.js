/* 起動・タイマー・状態管理。
   - 初回ロード時に既存花を「settled」で並べる
   - 以降は pollIntervalMs ごとに差分取得→ bloomNew
   - エラー時は静かに次回まで待つ（屋外無人運用想定） */
(function () {
  const cfg = window.DISPLAY_CONFIG;

  const state = {
    sinceId: 0,
    isFirstLoad: true,
    lastPollAt: null,
    timer: null,
    loadedAt: Date.now(),   // 診断オーバーレイの「経過」「読込」用
    pollCount: 0,
  };

  // ---- カウンタ更新 ----
  function setCounter(idEl, value) {
    const el = document.getElementById(idEl);
    if (!el) return;
    const cur = parseInt(el.textContent || "0", 10);
    if (cur === value) return;
    el.textContent = String(value);
    el.classList.remove("pop");
    // reflow して再アニメさせる
    void el.offsetWidth;
    el.classList.add("pop");
    setTimeout(() => el.classList.remove("pop"), 500);
  }

  // ---- デバッグパネル ----
  function refreshDebug() {
    if (!cfg.debug) return;
    const panel = document.getElementById("debug-panel");
    if (!panel || panel.hidden) return;
    document.getElementById("debug-mode").textContent  = cfg.source;
    document.getElementById("debug-last").textContent  = state.lastPollAt
      ? new Date(state.lastPollAt).toLocaleTimeString() : "-";
    document.getElementById("debug-since").textContent = String(state.sinceId);
  }

  // ══════════════════════════════════════════════════════════════
  // 診断オーバーレイ（7/23 STB実機テスト用）
  //
  // STB にはキーボードが無く D キーを押せないため、操作不要で常時表示し、
  // 画面を撮影するだけで全項目が記録に残るようにする。
  // ══════════════════════════════════════════════════════════════

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  function hhmmss(d) {
    const p = n => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function flowerCount() {
    const r = document.getElementById("flowers-root");
    return r ? r.children.length : 0;
  }

  function startDiag() {
    if (!cfg.diag) return;
    const panel = document.getElementById("diag");
    if (!panel) return;
    panel.hidden = false;

    // 起動時に一度だけ確定する項目
    setText("diag-loaded", hhmmss(new Date(state.loadedAt)));
    setText("diag-ua", navigator.userAgent);
    setText("diag-cfg",
      `${cfg.source} / style=${cfg.style} / sway=${cfg.sway ? "on" : "off"}` +
      ` / fx=${cfg.bgEffects ? "on" : "off"} / n=${cfg.seedCount} / max=${cfg.maxFlowers}`);

    const scr = () => {
      const w = window.innerWidth, h = window.innerHeight;
      // OTOMO屋外モデルは縦置き(1080x1920)。STBが横出力だと縦コンテンツが
      // 横倒しになるため、向きを明示して一目で判別できるようにする。
      const orient = h >= w ? "縦OK" : "⚠横！";
      setText("diag-screen",
        `${orient}  viewport ${w}x${h}` +
        ` / screen ${screen.width}x${screen.height}` +
        ` / dpr ${window.devicePixelRatio}`);
    };
    scr();
    window.addEventListener("resize", scr);

    // FPS：直近1秒の描画フレーム数
    let frames = 0;
    let fpsWindowStart = performance.now();
    (function tick(ts) {
      frames++;
      if (ts - fpsWindowStart >= 1000) {
        setText("diag-fps", String(Math.round(frames * 1000 / (ts - fpsWindowStart))));
        frames = 0;
        fpsWindowStart = ts;
      }
      requestAnimationFrame(tick);
    })(performance.now());

    // 経過秒数・時刻・花数（0.1秒ごと）
    // 「経過」が 0 に戻れば STB が完全リロードした決定的な証拠になり、
    // その周期も画面を見ているだけで実測できる。
    setInterval(() => {
      setText("diag-elapsed", ((Date.now() - state.loadedAt) / 1000).toFixed(1) + "s");
      setText("diag-clock", hhmmss(new Date()));
      setText("diag-count", String(flowerCount()));
    }, 100);
  }

  /** 背景マップ画像（方法B＝淡く敷く）を scene に挿入する。
      - 読み込み成功 → マップに城/塔が含まれるので自作ランドマークを隠す
      - 読み込み失敗（未購入でファイル無し等） → 線画のまま（公開URLで安全側）
      画像は花レイヤーより背面に入るため、花の視認性は保たれる。 */
  function applyBgImage() {
    const src = cfg.bgImage;
    if (!src) return;
    const scene = document.querySelector("svg.scene");
    if (!scene) return;
    const NS = "http://www.w3.org/2000/svg";
    const img = document.createElementNS(NS, "image");
    img.setAttribute("href", src);
    img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", src);
    img.setAttribute("x", "0");
    img.setAttribute("y", "0");
    img.setAttribute("width", "1080");
    img.setAttribute("height", "1920");
    // 右側を見せる（xMax）＋はみ出しは slice で切る＝カバー表示
    img.setAttribute("preserveAspectRatio", (cfg.bgAlign || "xMaxYMid") + " slice");
    img.setAttribute("opacity", String(cfg.bgOpacity != null ? cfg.bgOpacity : 0.3));

    img.addEventListener("load", () => {
      // マップにはランドマーク・街並みが含まれるので、白背景と画像以外の
      // 線画背景（太陽・街並み・城・塔・地平線）を全部隠す。
      Array.prototype.forEach.call(scene.children, el => {
        if (el === img) return;
        if (el.tagName && el.tagName.toLowerCase() === "rect") return; // 白背景は残す
        el.style.display = "none";
      });
    });
    // 失敗時は何もしない（線画背景が残る＝公開URLで安全側）

    // 白背景 rect の直後（線画より背面）に挿入
    const rect = scene.querySelector("rect");
    if (rect && rect.nextSibling) scene.insertBefore(img, rect.nextSibling);
    else scene.appendChild(img);
  }

  /** ?fx=0 のとき、背景の feTurbulence フィルタを全部外す。
      feTurbulence はピクセル単位でノイズを生成する重いフィルタで、
      全画面 1080x1920 ＋ 8 箇所に掛かっている。非力な STB では花より
      背景のほうが致命的な可能性があるため、切り分けられるようにする。 */
  function applyBgEffects() {
    if (cfg.bgEffects) return;
    document.querySelectorAll(".scene [filter]").forEach(el => {
      el.removeAttribute("filter");
    });
  }

  // ---- 1回分のポーリング ----
  async function pollOnce() {
    try {
      const data = await FlowerAPI.fetchFlowers(state.sinceId);

      if (state.isFirstLoad && cfg.initialBloomAsSettled) {
        // 初回：既にある花は静かに並べるだけ
        Bloom.settle(data.newFlowers);
      } else {
        // 通常：新規花だけ一斉開花
        Bloom.bloomNew(data.newFlowers);
      }
      Bloom.pruneTo(cfg.maxFlowers);

      setCounter("count-today", data.today);
      setCounter("count-total", data.total);

      state.sinceId    = data.latestId || state.sinceId;
      state.isFirstLoad = false;
      state.lastPollAt = Date.now();
      state.pollCount++;
      setText("diag-poll", String(state.pollCount));
    } catch (err) {
      // エラー時はサイレント。次回ポーリングまで待つ。
      console.warn("[display] poll failed:", err);
    } finally {
      refreshDebug();
    }
  }

  // ---- デバッグ操作 ----
  function setupDebugKeys() {
    if (!cfg.debug) return;
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "f") {
        // デバッグ用：ソースを問わずローカルで花を1個追加
        {
          const f = FlowerAPI._dummy.add();
          Bloom.bloomNew([f]);
          Bloom.pruneTo(cfg.maxFlowers);
          // 集計も即時更新
          setCounter("count-total", parseInt(document.getElementById("count-total").textContent || "0", 10) + 1);
          setCounter("count-today", parseInt(document.getElementById("count-today").textContent || "0", 10) + 1);
        }
      } else if (k === "r") {
        // デバッグ用リセット（表示のみ。api モードでは次回ポーリングで復元される）
        Bloom.clearAll();
        FlowerAPI._dummy.reset();
        state.sinceId = 0;
        state.isFirstLoad = true;
        setCounter("count-total", 0);
        setCounter("count-today", 0);
        refreshDebug();
      } else if (k === "d") {
        const p = document.getElementById("debug-panel");
        if (p) p.hidden = !p.hidden;
        refreshDebug();
      }
    });
  }

  // ---- 起動 ----
  function start() {
    applyBgImage();
    applyBgEffects();
    startDiag();

    // ダミー: 初期に花を仕込んでおく（?n= で数を変えて FPS 上限を実測する）
    if (cfg.source === "dummy") {
      FlowerAPI._dummy.seed(cfg.seedCount);
    }

    pollOnce();
    state.timer = setInterval(pollOnce, cfg.pollIntervalMs);

    setupDebugKeys();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
