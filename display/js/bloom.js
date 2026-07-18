/* 花の落下演出（rAF ベース）と初回静止配置。
   Scene.createFlowerNode が返す outer（位置g）を DOM に追加し、
   requestAnimationFrame で上から落下させる。
   落下完了後に inner（CSS アニメ対象g）へ .sway を付与する。 */
window.Bloom = (function () {

  const FLOWERS_ROOT_ID = "flowers-root";
  function root() { return document.getElementById(FLOWERS_ROOT_ID); }

  /**
   * rAF で1輪を落下アニメーション。
   * @param {SVGGElement} outer  位置専用 g（dataset.fx/fy/sc を持つ）
   * @param {SVGGElement} inner  CSS アニメ対象 g（.flower クラス付き）
   * @param {number}      delay  開始遅延（秒）
   */
  function animateFall(outer, inner, delay) {
    const fx       = parseFloat(outer.dataset.fx);
    const fy       = parseFloat(outer.dataset.fy);
    const sc       = parseFloat(outer.dataset.sc);
    const startY   = -160;                                 // SVG ビューポート上端の外側

    // 落下パラメータ（花ごとにランダム）
    const duration = 2400 + Math.random() * 1800;          // 2.4〜4.2秒
    const swayAmp  = 28 + Math.random() * 48;              // 左右揺れ幅（SVG単位）
    const swayFreq = 0.65 + Math.random() * 0.55;         // 揺れの周期

    // 落下開始位置にセット（DOM 追加直後に適用）
    outer.setAttribute("transform",
      `translate(${fx}, ${startY}) scale(${sc})`);
    inner.style.opacity = "0";

    let startTime = null;

    function step(ts) {
      if (!outer.isConnected) return;     // DOM から除去済みなら停止
      if (!startTime) startTime = ts;

      const elapsed = ts - startTime;
      const t = Math.min(elapsed / duration, 1);

      if (t < 1) {
        // smoothstep で自然な落下感（最初ゆっくり→中盤加速→着地は柔らかく）
        const easedT = t * t * (3 - 2 * t);
        const ty = startY + (fy - startY) * easedT;

        // 左右の揺れ：sin 波で徐々に収束
        const tx = fx + Math.sin(t * Math.PI * swayFreq * 2) * swayAmp * (1 - t * 0.55);

        // 透明度：最初の 25% で 0→1 へフェードイン
        const opacity = Math.min(1, t * 4);

        outer.setAttribute("transform",
          `translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${sc})`);
        inner.style.opacity = opacity.toFixed(3);

        requestAnimationFrame(step);

      } else {
        // 着地完了：最終位置に固定
        outer.setAttribute("transform",
          `translate(${fx}, ${fy}) scale(${sc})`);
        inner.style.opacity = "1";

        // 少し間を置いてゆらぎ開始
        // NOTE: sway は着地後ずっと動き続けるため、花数ぶんの CSS アニメが
        //       常時 GPU を焼く。非力な STB では落下より重い可能性がある。
        //       ?sway=0 で切り分けられるようにしてある。
        if (!(window.DISPLAY_CONFIG || {}).sway) return;
        setTimeout(() => {
          if (!inner.isConnected) return;
          inner.classList.add("sway");
          inner.style.setProperty(
            "--sway-delay",
            (Math.random() * 4).toFixed(2) + "s"
          );
        }, 120);
      }
    }

    // delay 秒後に rAF を開始
    if (delay <= 0) {
      requestAnimationFrame(step);
    } else {
      setTimeout(() => requestAnimationFrame(step), delay * 1000);
    }
  }

  // ──────────────────────────────────────────────────────────────

  /** 新規花を落下アニメ付きで追加 */
  function bloomNew(flowers) {
    const r = root();
    if (!r) return;

    // 1輪ごとの遅延。固定値（0.12秒）だと花数に比例してショーが伸び、
    // 600輪で72秒、2000輪なら4分かかってスロットに収まらなくなる。
    // showDurationMs 以内に降り終えるよう、花数で正規化して頭打ちにする。
    const cfg     = window.DISPLAY_CONFIG || {};
    const showSec = (cfg.showDurationMs || 60000) / 1000;
    const stagger = flowers.length > 1
      ? Math.min(0.12, showSec / flowers.length)
      : 0;

    flowers.forEach((f, i) => {
      const outer = Scene.createFlowerNode(f);
      const g     = outer._animated;
      const delay = i * stagger + Math.random() * 0.5;
      r.appendChild(outer);
      animateFall(outer, g, delay);
    });
  }

  /** 初回ロード時：着地済み状態で即表示（アニメなし） */
  function settle(flowers) {
    const r = root();
    if (!r) return;
    flowers.forEach(f => {
      const outer = Scene.createFlowerNode(f);
      const g     = outer._animated;
      g.classList.add("settled");
      r.appendChild(outer);
    });
  }

  /** 1輪を静かにフェードアウトさせてから DOM 除去し、座標スロットを解放する。
      「たまるとうっとうしい」対策。パッと消さず、そっと散らす。 */
  function fadeOutAndRemove(outer) {
    if (outer._fading) return;
    outer._fading = true;

    // 場所は即座に解放し、新しい花がすぐ同じ位置に咲けるようにする
    if (outer._occ && window.Scene) Scene.releasePosition(outer._occ);

    const inner = outer._animated || outer.querySelector(".flower");
    if (inner) {
      inner.style.transition = "opacity 1.4s ease";
      inner.style.opacity = "0";
    }
    setTimeout(() => {
      if (outer.parentNode) outer.parentNode.removeChild(outer);
    }, 1500);
  }

  /** 最大数を超えたぶん、古い花からフェードアウトさせて間引く。
      フェード中の花は二重に数えない（次回 prune で再指定しない）。 */
  function pruneTo(max) {
    const r = root();
    if (!r) return;
    const live = Array.prototype.filter.call(r.children, n => !n._fading);
    const over = live.length - max;
    for (let i = 0; i < over; i++) fadeOutAndRemove(live[i]);
  }

  /** 全花を消去して占有リストもリセット */
  function clearAll() {
    const r = root();
    if (!r) return;
    while (r.firstChild) r.removeChild(r.firstChild);
    Scene.clearOccupied();
  }

  return { bloomNew, settle, pruneTo, clearAll };
})();
