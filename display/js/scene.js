/* 花の SVG 生成と座標配置（重なりすぎない分散）

   構造：
     outer <g transform="translate(x,y) scale(s)">  ← 位置専用。CSS transform なし。
       inner <g class="flower">                      ← アニメ専用。SVG transform なし。
         stem / leaf / head ...

   SVG transform属性 と CSS transform プロパティを同一要素に混在させると
   ブラウザによって上書き・干渉が起きるため、役割を分離している。

   花の種類:
     a = コスモス（8枚の細長い花びら）
     b = チューリップ（カップ型3枚）
     c = 桜（5枚・先端にV字ノッチ）
*/
window.Scene = (function () {

  const FIELD = { x0: 80, y0: 380, x1: 1000, y1: 1860 };
  const MIN_DIST = 150;
  const MAX_TRIES = 24;
  const occupied = [];

  function pickPosition() {
    for (let i = 0; i < MAX_TRIES; i++) {
      const x = FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0);
      const t = Math.pow(Math.random(), 0.7);
      const y = FIELD.y0 + t * (FIELD.y1 - FIELD.y0);
      if (!collides(x, y)) {
        occupied.push({ x, y });
        return { x, y };
      }
    }
    const x = FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0);
    const y = FIELD.y0 + Math.random() * (FIELD.y1 - FIELD.y0);
    occupied.push({ x, y });
    return { x, y };
  }

  function collides(x, y) {
    for (const p of occupied) {
      const dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return true;
    }
    return false;
  }

  function clearOccupied() { occupied.length = 0; }

  // 色ごとの補助色（線・影）。花びら本体は SVG グラデーション url(#fg-<key>) を使う
  const COLOR_MAP = {
    pink:   { petalDark: "#B85C7E", center: "#FFE9A8", centerDark: "#C28F2D" },
    yellow: { petalDark: "#C68A1A", center: "#FFF5D0", centerDark: "#A05010" },
    white:  { petalDark: "#B89A60", center: "#F5BE5A", centerDark: "#A56A1E" },
    purple: { petalDark: "#7B519C", center: "#FFE5A8", centerDark: "#C28F2D" },
    red:    { petalDark: "#A0382C", center: "#FFD78A", centerDark: "#A56A1E" },
  };

  /**
   * 1個の花を生成する。
   * 戻り値は outer <g>（位置指定済み）。
   * outer._animated に CSS アニメーション対象の inner <g> への参照を持つ。
   * outer.dataset.fx / .fy / .sc に落下アニメの最終座標とスケールを保持する。
   */
  function createFlowerNode(flower) {
    const SVG = "http://www.w3.org/2000/svg";
    const colorKey = flower.color in COLOR_MAP ? flower.color : "pink";
    const c = COLOR_MAP[colorKey];
    const pos = pickPosition();
    const rot = (Math.random() * 50 - 25).toFixed(1);
    const scale = 0.95 + Math.random() * 0.25;

    // ── outer g：位置のみ（CSS transform は付けない） ──────────
    const outer = document.createElementNS(SVG, "g");
    outer.setAttribute(
      "transform",
      `translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) scale(${scale.toFixed(3)})`
    );
    // bloom.js が落下アニメで使う最終座標・スケール
    outer.dataset.fx = pos.x.toFixed(1);
    outer.dataset.fy = pos.y.toFixed(1);
    outer.dataset.sc = scale.toFixed(3);

    // ── inner g：CSS アニメーション対象（SVG transform は付けない） ─
    const g = document.createElementNS(SVG, "g");
    g.setAttribute("class", "flower");
    g.style.setProperty("--seed-rot", rot + "deg");
    g.setAttribute("data-id", flower.id);

    // 茎（緩やかな曲線）
    const stem = document.createElementNS(SVG, "path");
    const sw = (Math.random() * 10 - 5).toFixed(1);
    stem.setAttribute("d", `M0,30 q${sw},36 0,76`);
    stem.setAttribute("stroke", "#5C8A3A");
    stem.setAttribute("stroke-width", "7");
    stem.setAttribute("stroke-linecap", "round");
    stem.setAttribute("fill", "none");
    g.appendChild(stem);

    // 葉（左右ランダム）
    const leaf = document.createElementNS(SVG, "path");
    const side = Math.random() < 0.5 ? -1 : 1;
    leaf.setAttribute("d",
      `M0,56 q${side * 22},-4 ${side * 34},16 q${-side * 10},10 ${-side * 34},-16 Z`);
    leaf.setAttribute("fill", "#7FA84A");
    leaf.setAttribute("stroke", "#4F7A2A");
    leaf.setAttribute("stroke-width", "2");
    leaf.setAttribute("stroke-linejoin", "round");
    g.appendChild(leaf);

    // 花本体
    g.appendChild(createHead(SVG, flower.kind, c, colorKey));

    outer.appendChild(g);

    // bloom.js がアクセスするためのショートカット
    outer._animated = g;

    return outer;
  }

  // ────── 花びら形状の生成 ─────────────────────────────────────────

  function createHead(SVG, kind, c, colorKey) {
    const head = document.createElementNS(SVG, "g");

    if (kind === "a") {
      // ── コスモス：8枚の細長い花びら ────────────────────────────
      // 花びら1枚（上方向。回転で8方向に配置）
      const PD = "M0,4 C-7,0 -11,-20 -6,-42 Q0,-55 6,-42 C11,-20 7,0 0,4";
      for (let i = 0; i < 8; i++) {
        const petal = document.createElementNS(SVG, "path");
        petal.setAttribute("d", PD);
        petal.setAttribute("fill", `url(#fg-${colorKey})`);
        petal.setAttribute("stroke", c.petalDark);
        petal.setAttribute("stroke-width", "1.5");
        petal.setAttribute("stroke-linejoin", "round");
        petal.setAttribute("transform", `rotate(${i * 45})`);
        head.appendChild(petal);
      }
      // 花芯（外リング）
      const ctrRing = document.createElementNS(SVG, "circle");
      ctrRing.setAttribute("r", "14");
      ctrRing.setAttribute("fill", "url(#fg-center)");
      ctrRing.setAttribute("stroke", c.centerDark);
      ctrRing.setAttribute("stroke-width", "2");
      head.appendChild(ctrRing);
      // 花芯の小粒
      for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 / 7) * i;
        const dot = document.createElementNS(SVG, "circle");
        dot.setAttribute("cx", (Math.cos(a) * 6.5).toFixed(1));
        dot.setAttribute("cy", (Math.sin(a) * 6.5).toFixed(1));
        dot.setAttribute("r", "2.2");
        dot.setAttribute("fill", c.centerDark);
        head.appendChild(dot);
      }
      // 中心点
      const ctrDot = document.createElementNS(SVG, "circle");
      ctrDot.setAttribute("r", "4");
      ctrDot.setAttribute("fill", c.centerDark);
      head.appendChild(ctrDot);

    } else if (kind === "b") {
      // ── チューリップ：カップ型3枚花びら ──────────────────────────
      // 奥の2枚（左・右、やや暗め）
      [-1, 1].forEach(s => {
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("d",
          `M0,8 q${s * 28},-12 ${s * 30},-44 q${-s * 16},-14 ${-s * 30},10 Z`);
        p.setAttribute("fill", c.petalDark);
        p.setAttribute("stroke", c.petalDark);
        p.setAttribute("stroke-width", "2");
        p.setAttribute("stroke-linejoin", "round");
        p.setAttribute("opacity", "0.82");
        head.appendChild(p);
      });
      // 手前の花びら（メイン・グラデーション）
      const front = document.createElementNS(SVG, "path");
      front.setAttribute("d",
        `M0,18 q-22,-14 -16,-44 q16,-22 32,0 q6,30 -16,44 Z`);
      front.setAttribute("fill", `url(#fg-${colorKey})`);
      front.setAttribute("stroke", c.petalDark);
      front.setAttribute("stroke-width", "2.5");
      front.setAttribute("stroke-linejoin", "round");
      head.appendChild(front);
      // 縫い目ライン（中央の筋）
      const seam = document.createElementNS(SVG, "path");
      seam.setAttribute("d", "M0,14 q-2,-18 0,-34");
      seam.setAttribute("stroke", c.petalDark);
      seam.setAttribute("stroke-width", "1.5");
      seam.setAttribute("fill", "none");
      seam.setAttribute("opacity", "0.5");
      head.appendChild(seam);
      // 光沢ハイライト（白半透明の楕円）
      const shine = document.createElementNS(SVG, "ellipse");
      shine.setAttribute("cx", "-6"); shine.setAttribute("cy", "-14");
      shine.setAttribute("rx", "5"); shine.setAttribute("ry", "11");
      shine.setAttribute("fill", "url(#fg-shine)");
      shine.setAttribute("opacity", "0.55");
      head.appendChild(shine);

    } else {
      // ── 桜：5枚・先端にV字ノッチ ────────────────────────────────
      // 花びら1枚（上向き。72°刻みで5方向）
      // 先端: 両サイドが (-5,-57)/(5,-57)、ノッチ最深 (0,-51)
      const SD =
        "M0,4 " +
        "C-12,-2 -24,-26 -20,-46 " +   // 左外側カーブ
        "C-17,-55 -10,-62 -5,-57 " +   // 左先端へ
        "L0,-51 " +                     // ノッチ最深部（中央へ折れ込み）
        "L5,-57 " +                     // 右先端へ接続
        "C10,-62 17,-55 20,-46 " +      // 右先端から
        "C24,-26 12,-2 0,4 Z";          // 右外側カーブ
      for (let i = 0; i < 5; i++) {
        const petal = document.createElementNS(SVG, "path");
        petal.setAttribute("d", SD);
        petal.setAttribute("fill", `url(#fg-${colorKey})`);
        petal.setAttribute("stroke", c.petalDark);
        petal.setAttribute("stroke-width", "2");
        petal.setAttribute("stroke-linejoin", "round");
        petal.setAttribute("transform", `rotate(${i * 72})`);
        head.appendChild(petal);
      }
      // 花芯（黄緑の丸）
      const ctr = document.createElementNS(SVG, "circle");
      ctr.setAttribute("r", "10");
      ctr.setAttribute("fill", "url(#fg-center)");
      ctr.setAttribute("stroke", c.centerDark);
      ctr.setAttribute("stroke-width", "2");
      head.appendChild(ctr);
      // おしべ（5本。線＋先端丸）
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const len = 14 + Math.random() * 4;
        const ex = (Math.cos(a) * len).toFixed(1);
        const ey = (Math.sin(a) * len).toFixed(1);
        const line = document.createElementNS(SVG, "line");
        line.setAttribute("x1", "0"); line.setAttribute("y1", "0");
        line.setAttribute("x2", ex); line.setAttribute("y2", ey);
        line.setAttribute("stroke", c.centerDark);
        line.setAttribute("stroke-width", "1.4");
        head.appendChild(line);
        const tip = document.createElementNS(SVG, "circle");
        tip.setAttribute("cx", ex); tip.setAttribute("cy", ey);
        tip.setAttribute("r", "2.2");
        tip.setAttribute("fill", c.centerDark);
        head.appendChild(tip);
      }
    }

    return head;
  }

  return { createFlowerNode, clearOccupied, FIELD };
})();
