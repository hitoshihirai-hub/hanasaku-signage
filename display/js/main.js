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
        // 花を1個追加（dummyのみ）
        if (cfg.source === "dummy") {
          const f = FlowerAPI._dummy.add();
          Bloom.bloomNew([f]);
          Bloom.pruneTo(cfg.maxFlowers);
          state.sinceId = f.id;
          // 集計も即時更新
          setCounter("count-total", parseInt(document.getElementById("count-total").textContent || "0", 10) + 1);
          setCounter("count-today", parseInt(document.getElementById("count-today").textContent || "0", 10) + 1);
        }
      } else if (k === "r") {
        // リセット
        Bloom.clearAll();
        if (cfg.source === "dummy") FlowerAPI._dummy.reset();
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
    // ダミー: 初期に少量の花を仕込んでおく
    if (cfg.source === "dummy") {
      FlowerAPI._dummy.seed(18);
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
