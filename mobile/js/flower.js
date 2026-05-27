/* 花のSVGプレビュー生成 と API送信。
   display/js/scene.js と同じパスを使って花頭部を描く（茎なし・中央配置）。
   スマホ上の「あなたの花」プレビュー専用。 */
window.FlowerMobile = (function () {

  const SVG_NS = "http://www.w3.org/2000/svg";

  // 色定義（display/js/scene.js と同じ）
  const COLOR_MAP = {
    pink:   { petal: "#F4A6B8", petalDark: "#B85C7E", center: "#FFE9A8", centerDark: "#C28F2D", label: "ピンク" },
    yellow: { petal: "#FAD16A", petalDark: "#C68A1A", center: "#FFF5D0", centerDark: "#A05010", label: "きいろ" },
    white:  { petal: "#FFFBEC", petalDark: "#B89A60", center: "#F5BE5A", centerDark: "#A56A1E", label: "しろ" },
    purple: { petal: "#C9A6E0", petalDark: "#7B519C", center: "#FFE5A8", centerDark: "#C28F2D", label: "むらさき" },
    red:    { petal: "#EE7A6A", petalDark: "#A0382C", center: "#FFD78A", centerDark: "#A56A1E", label: "あか" },
  };

  const KIND_MAP = {
    a: { label: "コスモス", emoji: "🌸" },
    b: { label: "チューリップ", emoji: "🌷" },
    c: { label: "さくら", emoji: "🌸" },
  };

  /** 花頭部のSVGグループ要素を返す（viewBox 内で原点に配置） */
  function createHead(kind, c) {
    const head = document.createElementNS(SVG_NS, "g");

    if (kind === "a") {
      // コスモス：8枚の細長い花びら
      const PD = "M0,4 C-7,0 -11,-20 -6,-42 Q0,-55 6,-42 C11,-20 7,0 0,4";
      for (let i = 0; i < 8; i++) {
        const petal = document.createElementNS(SVG_NS, "path");
        petal.setAttribute("d", PD);
        petal.setAttribute("fill", c.petal);
        petal.setAttribute("stroke", c.petalDark);
        petal.setAttribute("stroke-width", "1.5");
        petal.setAttribute("stroke-linejoin", "round");
        petal.setAttribute("transform", `rotate(${i * 45})`);
        head.appendChild(petal);
      }
      const ctrRing = document.createElementNS(SVG_NS, "circle");
      ctrRing.setAttribute("r", "14"); ctrRing.setAttribute("fill", c.center);
      ctrRing.setAttribute("stroke", c.centerDark); ctrRing.setAttribute("stroke-width", "2");
      head.appendChild(ctrRing);
      for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 / 7) * i;
        const dot = document.createElementNS(SVG_NS, "circle");
        dot.setAttribute("cx", (Math.cos(a) * 6.5).toFixed(1));
        dot.setAttribute("cy", (Math.sin(a) * 6.5).toFixed(1));
        dot.setAttribute("r", "2.2"); dot.setAttribute("fill", c.centerDark);
        head.appendChild(dot);
      }
      const ctrDot = document.createElementNS(SVG_NS, "circle");
      ctrDot.setAttribute("r", "4"); ctrDot.setAttribute("fill", c.centerDark);
      head.appendChild(ctrDot);

    } else if (kind === "b") {
      // チューリップ
      [-1, 1].forEach(s => {
        const p = document.createElementNS(SVG_NS, "path");
        p.setAttribute("d", `M0,8 q${s*28},-12 ${s*30},-44 q${-s*16},-14 ${-s*30},10 Z`);
        p.setAttribute("fill", c.petalDark); p.setAttribute("stroke", c.petalDark);
        p.setAttribute("stroke-width", "2"); p.setAttribute("stroke-linejoin", "round");
        p.setAttribute("opacity", "0.82");
        head.appendChild(p);
      });
      const front = document.createElementNS(SVG_NS, "path");
      front.setAttribute("d", "M0,18 q-22,-14 -16,-44 q16,-22 32,0 q6,30 -16,44 Z");
      front.setAttribute("fill", c.petal); front.setAttribute("stroke", c.petalDark);
      front.setAttribute("stroke-width", "2.5"); front.setAttribute("stroke-linejoin", "round");
      head.appendChild(front);
      const seam = document.createElementNS(SVG_NS, "path");
      seam.setAttribute("d", "M0,14 q-2,-18 0,-34");
      seam.setAttribute("stroke", c.petalDark); seam.setAttribute("stroke-width", "1.5");
      seam.setAttribute("fill", "none"); seam.setAttribute("opacity", "0.5");
      head.appendChild(seam);

    } else {
      // 桜：5枚・V字ノッチ
      const SD =
        "M0,4 C-12,-2 -24,-26 -20,-46 C-17,-55 -10,-62 -5,-57 " +
        "L0,-51 L5,-57 C10,-62 17,-55 20,-46 C24,-26 12,-2 0,4 Z";
      for (let i = 0; i < 5; i++) {
        const petal = document.createElementNS(SVG_NS, "path");
        petal.setAttribute("d", SD);
        petal.setAttribute("fill", c.petal); petal.setAttribute("stroke", c.petalDark);
        petal.setAttribute("stroke-width", "2"); petal.setAttribute("stroke-linejoin", "round");
        petal.setAttribute("transform", `rotate(${i * 72})`);
        head.appendChild(petal);
      }
      const ctr = document.createElementNS(SVG_NS, "circle");
      ctr.setAttribute("r", "10"); ctr.setAttribute("fill", c.center);
      ctr.setAttribute("stroke", c.centerDark); ctr.setAttribute("stroke-width", "2");
      head.appendChild(ctr);
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const len = 15;
        const ex = (Math.cos(a) * len).toFixed(1), ey = (Math.sin(a) * len).toFixed(1);
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", "0"); line.setAttribute("y1", "0");
        line.setAttribute("x2", ex); line.setAttribute("y2", ey);
        line.setAttribute("stroke", c.centerDark); line.setAttribute("stroke-width", "1.4");
        head.appendChild(line);
        const tip = document.createElementNS(SVG_NS, "circle");
        tip.setAttribute("cx", ex); tip.setAttribute("cy", ey);
        tip.setAttribute("r", "2.2"); tip.setAttribute("fill", c.centerDark);
        head.appendChild(tip);
      }
    }
    return head;
  }

  /**
   * 花プレビュー SVG 要素を生成して返す。
   * @param {string} color - "pink" | "yellow" | "white" | "purple" | "red"
   * @param {string} kind  - "a" | "b" | "c"
   * @returns {SVGSVGElement}
   */
  function buildPreviewSVG(color, kind) {
    const c = COLOR_MAP[color] || COLOR_MAP.pink;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "-80 -80 160 160");
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "200");

    // 背景円
    const bg = document.createElementNS(SVG_NS, "circle");
    bg.setAttribute("r", "78");
    bg.setAttribute("fill", "#FFF5E1");
    bg.setAttribute("stroke", "#D4B89A");
    bg.setAttribute("stroke-width", "2");
    svg.appendChild(bg);

    // 茎
    const stem = document.createElementNS(SVG_NS, "path");
    stem.setAttribute("d", "M0,20 q3,18 0,38");
    stem.setAttribute("stroke", "#5C8A3A");
    stem.setAttribute("stroke-width", "6");
    stem.setAttribute("stroke-linecap", "round");
    stem.setAttribute("fill", "none");
    svg.appendChild(stem);

    // 葉
    const leaf = document.createElementNS(SVG_NS, "path");
    leaf.setAttribute("d", "M0,38 q16,-2 24,12 q-8,8 -24,-12 Z");
    leaf.setAttribute("fill", "#7FA84A");
    leaf.setAttribute("stroke", "#4F7A2A");
    leaf.setAttribute("stroke-width", "2");
    leaf.setAttribute("stroke-linejoin", "round");
    svg.appendChild(leaf);

    // 花頭部（チューリップは少し上に、他は中央）
    const headG = document.createElementNS(SVG_NS, "g");
    const offsetY = kind === "b" ? 10 : 0;
    headG.setAttribute("transform", `translate(0, ${offsetY})`);
    headG.appendChild(createHead(kind, c));
    svg.appendChild(headG);

    return svg;
  }

  /**
   * 花を API に送信する。
   * @returns {Promise<{ok: boolean, flower?: object, error?: string}>}
   */
  async function submitFlower(color, kind, message) {
    const cfg = window.MOBILE_CONFIG || {};
    const base = (cfg.apiBase || "").replace(/\/$/, "");
    const res = await fetch(`${base}/api/flowers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color, kind, message: message || "" }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }
    const flower = await res.json();
    return { ok: true, flower };
  }

  return { buildPreviewSVG, submitFlower, COLOR_MAP, KIND_MAP };
})();
