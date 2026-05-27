/* モバイルツアーページのルーティングと画面制御。
   URLクエリパラメータで画面を切り替える：
     ?          → HOME（スタンプ一覧）
     ?spot=1    → メインスポット（水の庭 など）
     ?spot=1-1  → サブページ（クイズ・詳細説明など）
     ?flower    → FLOWER（花選択・送信）
     ?thanks    → THANKS（送信完了・花プレビュー） */
(function () {

  const cfg = window.MOBILE_CONFIG || {};
  let spotsData = null;

  // ---- 画面切替 ----
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(el => {
      el.hidden = (el.id !== id);
    });
  }

  // ---- ルーター ----
  function route() {
    const params = new URLSearchParams(location.search);
    const spotId = params.get("spot");
    if      (params.has("thanks")) renderThanks();
    else if (params.has("flower")) renderFlower();
    else if (spotId)               renderSpot(spotId);
    else                           renderHome();
  }

  // ====================================================
  // HOME 画面
  // ====================================================
  function renderHome() {
    showScreen("screen-home");
    updateHomeStamps();
  }

  function updateHomeStamps() {
    if (!spotsData) return;
    const collected = Stamp.count();
    const total     = spotsData.spots.length;
    const unlockAt  = cfg.flowerUnlockAt || total;

    const pct = Math.min(collected / total * 100, 100);
    const bar = document.getElementById("stamp-progress-bar");
    if (bar) bar.style.width = pct + "%";
    const label = document.getElementById("stamp-progress-label");
    if (label) label.textContent = `${collected} / ${total} か所`;

    // スポットカード
    const list = document.getElementById("spot-list");
    if (!list) return;
    list.innerHTML = "";
    spotsData.spots.forEach(spot => {
      const done = Stamp.has(spot.id);
      const card = document.createElement("a");
      card.className = "spot-card" + (done ? " spot-card--done" : "");
      card.href = `?spot=${encodeURIComponent(spot.id)}`;
      card.style.setProperty("--spot-accent", spot.accentColor || "#8B5234");
      card.innerHTML = `
        <span class="spot-card__icon">${spot.icon}</span>
        <div class="spot-card__body">
          <div class="spot-card__no">スポット ${spot.signNo}</div>
          <div class="spot-card__name">${spot.name}</div>
          <div class="spot-card__sub">${spot.subtitle}</div>
        </div>
        <span class="spot-card__stamp">${done ? "✅" : "　"}</span>
      `;
      list.appendChild(card);
    });

    // 花送信ボタン
    const flowerBtn = document.getElementById("btn-to-flower");
    if (flowerBtn) {
      const unlocked = collected >= unlockAt;
      flowerBtn.disabled = !unlocked;
      flowerBtn.textContent = unlocked
        ? "🌸 花を選んで街に咲かせよう"
        : `あと ${unlockAt - collected} か所まわろう`;
    }
  }

  // ====================================================
  // SPOT 画面（メインスポット & サブページ共用）
  // ====================================================
  function renderSpot(spotId) {
    showScreen("screen-spot");
    const container = document.getElementById("spot-screen-content");
    if (!spotsData) {
      container.innerHTML = '<p class="error">データを読み込んでいます…</p>';
      return;
    }

    // サブページ（"1-1" のようにハイフン含む）
    if (spotId.includes("-")) {
      const sub    = spotsData.subPages[spotId];
      const parent = sub ? spotsData.spots.find(s => s.id === sub.parentId) : null;
      if (!sub) {
        container.innerHTML = '<p class="error">ページが見つかりません</p>';
        return;
      }
      container.innerHTML = buildSubPageHTML(sub, parent);
      return;
    }

    // メインスポット
    const spot = spotsData.spots.find(s => s.id === spotId);
    if (!spot) {
      container.innerHTML = '<p class="error">スポットが見つかりません</p>';
      return;
    }
    container.innerHTML = buildMainSpotHTML(spot);

    // スタンプボタンのイベント（innerHTML後にバインド）
    const stampBtn = document.getElementById("btn-stamp");
    const stampMsg = document.getElementById("stamp-msg-inline");
    if (Stamp.has(spotId)) {
      if (stampBtn) stampBtn.hidden = true;
      if (stampMsg) { stampMsg.textContent = "✅ スタンプ取得済みです"; stampMsg.hidden = false; }
    } else if (stampBtn) {
      stampBtn.onclick = () => {
        Stamp.collect(spotId);
        stampBtn.hidden = true;
        if (stampMsg) { stampMsg.textContent = "✅ スタンプをもらいました！"; stampMsg.hidden = false; }
        setTimeout(() => { location.href = "?"; }, 1400);
      };
    }
  }

  // ── メインスポット（01/02/03）のHTML生成 ──────────────────
  function buildMainSpotHTML(spot) {
    // サブページリンク
    const childrenHTML = (spot.children || []).map(cid => {
      const sub = spotsData.subPages[cid];
      if (!sub) return "";
      const typeLabel = { quiz: "クイズ", "quiz-answer": "クイズのこたえ", detail: "詳細説明", challenge: "体験" }[sub.type] || "";
      return `<a class="child-link" href="?spot=${cid}">
        <span class="child-link__badge">${typeLabel}</span>
        <span class="child-link__no">サイン ${sub.signNo}</span>
        <span class="child-link__title">${sub.title}</span>
        <span class="child-link__arrow">›</span>
      </a>`;
    }).join("");

    // 特徴カード
    const featuresHTML = (spot.features || []).map(f => `
      <div class="feature-card" style="border-left-color:${spot.accentColor}">
        <div class="feature-card__title" style="color:${spot.accentColor}">${f.title}</div>
        <p class="feature-card__text">${f.text}</p>
      </div>`).join("");

    const alreadyGot = Stamp.has(spot.id);
    const stampHTML = alreadyGot
      ? `<p class="stamp-msg-inline" id="stamp-msg-inline">✅ スタンプ取得済みです</p>`
      : `<button class="btn-stamp" id="btn-stamp">📍 ここでスタンプをもらう</button>
         <p class="stamp-msg-inline" id="stamp-msg-inline" hidden></p>`;

    return `
      <header class="page-header" style="background:${spot.accentColor}">
        <a class="page-header__back" href="?">←</a>
        <span class="page-header__title">${spot.name}</span>
      </header>

      <div class="main-spot-hero" style="background:${spot.headerColor}">
        <div class="main-spot-hero__signno">サイン ${spot.signNo}</div>
        <div class="main-spot-hero__icon">${spot.icon}</div>
        <div class="main-spot-hero__name" style="color:${spot.accentColor}">${spot.name}</div>
        <div class="main-spot-hero__sub">${spot.subtitle}</div>
      </div>

      <div class="main-spot-body">
        <p class="main-spot-lead">${spot.lead}</p>
        ${featuresHTML}
      </div>

      ${childrenHTML ? `
      <div class="child-links">
        <p class="child-links__label">このスポットのくわしい情報</p>
        ${childrenHTML}
      </div>` : ""}

      <div class="stamp-area">
        ${stampHTML}
      </div>

      <a class="btn-back-home" href="?">← 一覧に戻る</a>
    `;
  }

  // ── サブページのHTML生成 ────────────────────────────────
  function buildSubPageHTML(sub, parent) {
    const backHref  = parent ? `?spot=${parent.id}` : "?";
    const backLabel = parent ? parent.name : "一覧";
    let contentHTML = "";

    switch (sub.type) {
      case "quiz":        contentHTML = buildQuizHTML(sub);        break;
      case "quiz-answer": contentHTML = buildQuizAnswerHTML(sub);  break;
      case "challenge":   contentHTML = buildChallengeHTML(sub);   break;
      default:            contentHTML = buildDetailHTML(sub);      break;
    }

    return `
      <header class="page-header" style="background:${sub.headerBg || "#6B4226"}">
        <a class="page-header__back" href="${backHref}">←</a>
        <span class="page-header__title">サイン ${sub.signNo}</span>
      </header>
      ${contentHTML}
      <a class="btn-back-home" href="${backHref}">← ${backLabel}に戻る</a>
    `;
  }

  // ── 詳細説明（05/06/08/09/10） ────────────────────────────
  function buildDetailHTML(sub) {
    // signNo が 2桁の場合 img/sign{signNo}.jpg を使用
    const imgSrc = sub.signNo ? `img/sign${sub.signNo}.jpg` : null;
    const photoHTML = sub.photoCaption ? `
      <figure class="sign-detail__photo">
        ${imgSrc ? `<img src="${imgSrc}" alt="${sub.photoCaption}" class="sign-detail__photo-img" loading="lazy">` : ""}
        <figcaption class="sign-detail__photo-caption">▲ ${sub.photoCaption}</figcaption>
      </figure>` : "";
    return `
      <div class="sign-detail">
        <div class="sign-detail__titlebar" style="background:${sub.headerBg}">
          ${sub.title}
        </div>
        <div class="sign-detail__body" style="background:${sub.bodyBg || "#F5ECD7"}">
          ${photoHTML}
          <p class="sign-detail__text">${sub.body}</p>
        </div>
      </div>`;
  }

  // ── クイズ（04） ──────────────────────────────────────────
  function buildQuizHTML(sub) {
    const linesHTML = (sub.quizLines || [])
      .map(l => l === "" ? "<br>" : `<span>${l}</span><br>`)
      .join("");
    return `
      <div class="sign-quiz">
        <div class="sign-quiz__header" style="background:${sub.headerBg}">
          <span class="sign-quiz__badge">${sub.badgeLabel}</span>
          <div class="sign-quiz__title">${sub.title}</div>
        </div>
        <div class="sign-quiz__body">
          <p class="sign-quiz__question">${linesHTML}</p>
          <div class="sign-quiz__hint" style="background:${sub.hintBg || "#1E6FA8"}">
            ${sub.hint}
          </div>
        </div>
        ${sub.note ? `<p class="sign-note">${sub.note}</p>` : ""}
      </div>`;
  }

  // ── クイズのこたえ（11） ──────────────────────────────────
  function buildQuizAnswerHTML(sub) {
    const answerHTML = (sub.answerText || "").replace(/\n/g, "<br>");
    const expHTML = (sub.explanationLines || [])
      .map(l => `<p class="sign-quiz-answer__line">${l}</p>`).join("");
    return `
      <div class="sign-quiz">
        <div class="sign-quiz__header" style="background:${sub.headerBg}">
          <span class="sign-quiz__badge">${sub.badgeLabel}</span>
          <div class="sign-quiz__title">${sub.title}</div>
        </div>
        <div class="sign-quiz__body">
          <div class="sign-quiz-answer__answer" style="background:${sub.answerBg}">
            <p class="sign-quiz-answer__text">${answerHTML}</p>
          </div>
          <div class="sign-quiz-answer__explanation" style="background:${sub.answerBg}">
            ${expHTML}
          </div>
        </div>
        ${sub.note ? `<p class="sign-note">${sub.note}</p>` : ""}
      </div>`;
  }

  // ── チャレンジ（07 枯山水） ───────────────────────────────
  function buildChallengeHTML(sub) {
    const accentHTML = (sub.accentText || "").replace(/\n/g, "<br>");
    return `
      <div class="sign-challenge" style="background:${sub.bodyBg}">
        <div class="sign-challenge__titlebar" style="background:${sub.headerBg}">
          ${sub.title}
        </div>
        <div class="sign-challenge__body">
          <div class="sign-challenge__accent" style="background:${sub.accentBg}">
            ${accentHTML}
          </div>
          <p class="sign-challenge__text">${sub.body}</p>
        </div>
      </div>`;
  }

  // ====================================================
  // FLOWER 画面
  // ====================================================
  function renderFlower() {
    if (Stamp.count() < (cfg.flowerUnlockAt || 3)) {
      location.replace("?");
      return;
    }
    showScreen("screen-flower");
    setupFlowerSelect();
  }

  function setupFlowerSelect() {
    const colorMap = FlowerMobile.COLOR_MAP;
    const kindMap  = FlowerMobile.KIND_MAP;
    let selectedColor = "pink";
    let selectedKind  = "a";

    // 色ボタン
    const colorWrap = document.getElementById("color-buttons");
    colorWrap.innerHTML = "";
    Object.entries(colorMap).forEach(([key, c]) => {
      const btn = document.createElement("button");
      btn.className = "color-btn" + (key === selectedColor ? " selected" : "");
      btn.dataset.color = key;
      btn.type = "button";
      btn.style.background = c.petal;
      btn.style.borderColor = c.petalDark;
      btn.setAttribute("aria-label", c.label);
      btn.innerHTML = `<span class="color-btn__label">${c.label}</span>`;
      btn.onclick = () => {
        selectedColor = key;
        colorWrap.querySelectorAll(".color-btn").forEach(b =>
          b.classList.toggle("selected", b.dataset.color === key));
        refreshPreview();
      };
      colorWrap.appendChild(btn);
    });

    // 種類ボタン
    const kindWrap = document.getElementById("kind-buttons");
    kindWrap.innerHTML = "";
    Object.entries(kindMap).forEach(([key, k]) => {
      const btn = document.createElement("button");
      btn.className = "kind-btn" + (key === selectedKind ? " selected" : "");
      btn.dataset.kind = key;
      btn.type = "button";
      btn.innerHTML = `<span class="kind-btn__emoji">${k.emoji}</span><span class="kind-btn__label">${k.label}</span>`;
      btn.onclick = () => {
        selectedKind = key;
        kindWrap.querySelectorAll(".kind-btn").forEach(b =>
          b.classList.toggle("selected", b.dataset.kind === key));
        refreshPreview();
      };
      kindWrap.appendChild(btn);
    });

    function refreshPreview() {
      const wrap = document.getElementById("flower-preview");
      wrap.innerHTML = "";
      wrap.appendChild(FlowerMobile.buildPreviewSVG(selectedColor, selectedKind));
    }
    refreshPreview();

    // 送信
    const form = document.getElementById("flower-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const msg = (document.getElementById("flower-message").value || "").trim();
      const submitBtn = document.getElementById("btn-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "送信中…";

      const result = await FlowerMobile.submitFlower(selectedColor, selectedKind, msg);

      if (result.ok) {
        sessionStorage.setItem("my_flower", JSON.stringify({
          color: selectedColor, kind: selectedKind, message: msg,
        }));
        location.href = "?thanks";
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "花を送る 🌸";
        const errEl = document.getElementById("submit-error");
        errEl.textContent = "送信に失敗しました。もう一度お試しください。";
        errEl.hidden = false;
        console.error("[flower] submit error:", result.error);
      }
    };
  }

  // ====================================================
  // THANKS 画面
  // ====================================================
  function renderThanks() {
    showScreen("screen-thanks");
    let flower = { color: "pink", kind: "a", message: "" };
    try {
      const saved = sessionStorage.getItem("my_flower");
      if (saved) flower = JSON.parse(saved);
    } catch {}

    const wrap = document.getElementById("thanks-flower");
    wrap.innerHTML = "";
    wrap.appendChild(FlowerMobile.buildPreviewSVG(flower.color, flower.kind));

    if (flower.message) {
      const msgEl = document.getElementById("thanks-message");
      if (msgEl) { msgEl.textContent = `「${flower.message}」`; msgEl.hidden = false; }
    }

    const again = document.getElementById("btn-again");
    if (again) again.onclick = () => {
      sessionStorage.removeItem("my_flower");
      location.href = "?";
    };
  }

  // ====================================================
  // 初期化
  // ====================================================
  async function init() {
    try {
      const res = await fetch(cfg.spotsDataPath || "data/spots.json");
      spotsData = await res.json();
    } catch (e) {
      console.error("[app] spots.json load failed:", e);
    }

    const flowerBtn = document.getElementById("btn-to-flower");
    if (flowerBtn) {
      flowerBtn.addEventListener("click", () => { location.href = "?flower"; });
    }

    route();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
