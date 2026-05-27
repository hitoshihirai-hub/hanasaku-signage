/* 花の SVG 生成と、座標配置（重なりすぎない分散）

   花の形は3種類：
     a = デイジー風（6枚花びら + 中央）
     b = チューリップ風（カップ型）
     c = ポピー／椿風（丸い花）

   サイズ・色味は手描き温かみ系に寄せる。
   フィルタは輪郭が崩れて見えにくくなるため使わない。
*/
window.Scene = (function () {

  // 1080 x 1920 viewBox 内の、花を配置してよい領域
  const FIELD = { x0: 80, y0: 380, x1: 1000, y1: 1860 };

  // 花同士の最小距離（中心間）。花がはっきり見えるよう間隔を大きく取る。
  const MIN_DIST = 150;
  const MAX_TRIES = 24;

  const occupied = [];

  function pickPosition() {
    for (let i = 0; i < MAX_TRIES; i++) {
      const x = FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0);
      // y^0.7 で下方をやや厚く
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

  function clearOccupied() {
    occupied.length = 0;
  }

  // 手描き温かみ系の色辞書
  // petal=花びら / petalDark=外周線 / center=中央 / centerDark=中央外周
  const COLOR_MAP = {
    pink:   { petal: "#F4A6B8", petalDark: "#B85C7E", center: "#FFE9A8", centerDark: "#C28F2D" },
    yellow: { petal: "#FAD16A", petalDark: "#C68A1A", center: "#FFF5D0", centerDark: "#C68A1A" },
    white:  { petal: "#FFFBEC", petalDark: "#B89A60", center: "#F5BE5A", centerDark: "#A56A1E" },
    purple: { petal: "#C9A6E0", petalDark: "#7B519C", center: "#FFE5A8", centerDark: "#C28F2D" },
    red:    { petal: "#EE7A6A", petalDark: "#A0382C", center: "#FFD78A", centerDark: "#A56A1E" },
  };

  // 1 個の花の <g> SVG ノードを作る
  function createFlowerNode(flower) {
    const SVG = "http://www.w3.org/2000/svg";
    const c = COLOR_MAP[flower.color] || COLOR_MAP.pink;
    const pos = pickPosition();
    const rot = (Math.random() * 50 - 25).toFixed(1); // -25〜+25deg
    const scale = 0.95 + Math.random() * 0.25;         // 0.95〜1.20

    const g = document.createElementNS(SVG, "g");
    g.setAttribute("class", "flower");
    g.setAttribute("transform", `translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) scale(${scale.toFixed(3)})`);
    g.style.setProperty("--seed-rot", rot + "deg");
    g.setAttribute("data-id", flower.id);

    // 茎
    const stem = document.createElementNS(SVG, "path");
    const stemSway = (Math.random() * 10 - 5).toFixed(1);
    stem.setAttribute("d", `M0,30 q${stemSway},36 0,76`);
    stem.setAttribute("stroke", "#5C8A3A");
    stem.setAttribute("stroke-width", "7");
    stem.setAttribute("stroke-linecap", "round");
    stem.setAttribute("fill", "none");
    g.appendChild(stem);

    // 葉（片側に1枚）
    const leaf = document.createElementNS(SVG, "path");
    const leafSide = Math.random() < 0.5 ? -1 : 1;
    const ly = 56;
    leaf.setAttribute("d",
      `M0,${ly} q${leafSide*22},-4 ${leafSide*34},16 q${-leafSide*10},10 ${-leafSide*34},-16 Z`);
    leaf.setAttribute("fill", "#7FA84A");
    leaf.setAttribute("stroke", "#4F7A2A");
    leaf.setAttribute("stroke-width", "2");
    leaf.setAttribute("stroke-linejoin", "round");
    g.appendChild(leaf);

    // 花本体
    const head = createHeadByKind(SVG, flower.kind, c);
    g.appendChild(head);

    return g;
  }

  function createHeadByKind(SVG, kind, c) {
    const head = document.createElementNS(SVG, "g");

    if (kind === "a") {
      // デイジー風：6枚の花びら
      const petals = 6;
      for (let i = 0; i < petals; i++) {
        const angle = (360 / petals) * i;
        const petal = document.createElementNS(SVG, "ellipse");
        petal.setAttribute("cx", "0");
        petal.setAttribute("cy", "-34");
        petal.setAttribute("rx", "18");
        petal.setAttribute("ry", "34");
        petal.setAttribute("fill", c.petal);
        petal.setAttribute("stroke", c.petalDark);
        petal.setAttribute("stroke-width", "2.5");
        petal.setAttribute("stroke-linejoin", "round");
        petal.setAttribute("transform", `rotate(${angle})`);
        head.appendChild(petal);
      }
      const center = document.createElementNS(SVG, "circle");
      center.setAttribute("r", "16");
      center.setAttribute("fill", c.center);
      center.setAttribute("stroke", c.centerDark);
      center.setAttribute("stroke-width", "2.5");
      head.appendChild(center);
      // 中央の小さなドット（種を散らす）
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const dot = document.createElementNS(SVG, "circle");
        dot.setAttribute("cx", (Math.cos(a) * 6).toFixed(1));
        dot.setAttribute("cy", (Math.sin(a) * 6).toFixed(1));
        dot.setAttribute("r", "1.6");
        dot.setAttribute("fill", c.centerDark);
        head.appendChild(dot);
      }

    } else if (kind === "b") {
      // チューリップ風：カップ型
      // 後ろの2枚（左右）
      [-1, 1].forEach(side => {
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("d",
          `M0,8
           q${side*28},-12 ${side*30},-44
           q${-side*16},-14 ${-side*30},10 Z`);
        p.setAttribute("fill", c.petalDark);
        p.setAttribute("stroke", c.petalDark);
        p.setAttribute("stroke-width", "2");
        p.setAttribute("stroke-linejoin", "round");
        head.appendChild(p);
      });
      // 手前の中央花びら
      const center = document.createElementNS(SVG, "path");
      center.setAttribute("d",
        `M0,18
         q-22,-14 -16,-44
         q16,-22 32,0
         q6,30 -16,44 Z`);
      center.setAttribute("fill", c.petal);
      center.setAttribute("stroke", c.petalDark);
      center.setAttribute("stroke-width", "2.5");
      center.setAttribute("stroke-linejoin", "round");
      head.appendChild(center);
      // 中央の縦線（合わせ目）
      const seam = document.createElementNS(SVG, "path");
      seam.setAttribute("d", "M0,14 q-2,-18 0,-34");
      seam.setAttribute("stroke", c.petalDark);
      seam.setAttribute("stroke-width", "1.5");
      seam.setAttribute("fill", "none");
      seam.setAttribute("opacity", "0.6");
      head.appendChild(seam);

    } else {
      // c: ポピー／椿風 — 丸くふっくらした花
      // 外側の花びら（5枚を背面に）
      const back = 5;
      for (let i = 0; i < back; i++) {
        const angle = (360 / back) * i + 36;
        const petal = document.createElementNS(SVG, "ellipse");
        petal.setAttribute("cx", "0");
        petal.setAttribute("cy", "-30");
        petal.setAttribute("rx", "20");
        petal.setAttribute("ry", "26");
        petal.setAttribute("fill", c.petalDark);
        petal.setAttribute("opacity", "0.95");
        petal.setAttribute("transform", `rotate(${angle})`);
        head.appendChild(petal);
      }
      // 大きな円形の花体
      const outer = document.createElementNS(SVG, "circle");
      outer.setAttribute("cx", "0");
      outer.setAttribute("cy", "-14");
      outer.setAttribute("r", "34");
      outer.setAttribute("fill", c.petal);
      outer.setAttribute("stroke", c.petalDark);
      outer.setAttribute("stroke-width", "2.5");
      head.appendChild(outer);
      // 中央
      const center = document.createElementNS(SVG, "circle");
      center.setAttribute("cx", "0");
      center.setAttribute("cy", "-14");
      center.setAttribute("r", "11");
      center.setAttribute("fill", c.center);
      center.setAttribute("stroke", c.centerDark);
      center.setAttribute("stroke-width", "2.5");
      head.appendChild(center);
      // 中央の小さなしべ（点々）
      for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 / 7) * i;
        const dot = document.createElementNS(SVG, "circle");
        dot.setAttribute("cx", (Math.cos(a) * 4.5).toFixed(1));
        dot.setAttribute("cy", (Math.sin(a) * 4.5 - 14).toFixed(1));
        dot.setAttribute("r", "1.6");
        dot.setAttribute("fill", c.centerDark);
        head.appendChild(dot);
      }
    }

    return head;
  }

  return {
    createFlowerNode,
    clearOccupied,
    FIELD,
  };
})();
