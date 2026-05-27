/* API レイヤ。
   - source: "dummy" のときは、ブラウザ内のフェイクサーバーから差分を返す
   - source: "api"   のときは、FastAPI 側に GET /api/flowers?since=ID
   いずれも形は同じ { newFlowers: [...], total, today, latestId } を返す。

   花オブジェクト: { id, color, kind, message, created_at }
*/
window.FlowerAPI = (function () {
  const COLORS = ["pink", "yellow", "white", "purple", "red"];
  const KINDS  = ["a", "b", "c"];
  const SAMPLE_MESSAGES = [
    "", "", "", "",
    "また来たい", "きれい", "ありがとう", "わくわく",
    "おじいちゃんへ", "未来がたのしみ",
  ];

  // ---- dummy server state ----
  const dummyState = {
    flowers: [],
    nextId: 1,
  };

  function seedDummy(count) {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      dummyState.flowers.push({
        id: dummyState.nextId++,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        kind:  KINDS [Math.floor(Math.random() * KINDS.length)],
        message: "",
        // 過去にばらつかせる
        created_at: new Date(now - Math.random() * 3600 * 1000 * 6).toISOString(),
      });
    }
  }

  function addDummyFlower(opts) {
    const f = {
      id: dummyState.nextId++,
      color: opts && opts.color || COLORS[Math.floor(Math.random() * COLORS.length)],
      kind:  opts && opts.kind  || KINDS [Math.floor(Math.random() * KINDS.length)],
      message: (opts && opts.message) || SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)],
      created_at: new Date().toISOString(),
    };
    dummyState.flowers.push(f);
    return f;
  }

  function resetDummy() {
    dummyState.flowers = [];
    dummyState.nextId = 1;
  }

  function todayCount(flowers) {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    return flowers.filter(f => {
      const c = new Date(f.created_at);
      return c.getFullYear() === y && c.getMonth() === m && c.getDate() === day;
    }).length;
  }

  // ---- 公開 API ----

  // 差分取得。since 以降の花と、集計を返す。
  async function fetchFlowers(since) {
    since = since || 0;
    const cfg = window.DISPLAY_CONFIG;

    if (cfg.source === "dummy") {
      // 毎回のポーリングで 1〜4個の新しい花を追加（来場者の送信を模擬）
      const burst = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < burst; i++) addDummyFlower();

      const newFlowers = dummyState.flowers.filter(f => f.id > since);
      return {
        newFlowers,
        total: dummyState.flowers.length,
        today: todayCount(dummyState.flowers),
        latestId: dummyState.flowers.length
          ? dummyState.flowers[dummyState.flowers.length - 1].id
          : since,
      };
    }

    // 実 API 呼び出し
    const url = cfg.apiBase.replace(/\/$/, "") + "/api/flowers?since=" + encodeURIComponent(since);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("api error " + res.status);
    const data = await res.json();
    // サーバーレスポンス形： { flowers: [...], total, today }
    const newFlowers = data.flowers || [];
    return {
      newFlowers,
      total: data.total || 0,
      today: data.today || 0,
      latestId: newFlowers.length
        ? newFlowers[newFlowers.length - 1].id
        : since,
    };
  }

  return {
    fetchFlowers,
    // デバッグ用フック
    _dummy: {
      seed: seedDummy,
      add: addDummyFlower,
      reset: resetDummy,
    },
    COLORS, KINDS,
  };
})();
