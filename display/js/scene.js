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

  // y1 は花が咲く下限。街並み（地平線 y=1602）を花で埋めないよう、
  // 手前の帯を空けてランドマークを見せる。
  const FIELD = { x0: 80, y0: 360, x1: 1000, y1: 1720 };
  // 花から茎・葉を廃したことで実寸が小さくなった（bbox 約61x58）。
  // 下に密に積み上がる見た目にするため、最小間隔をさらに詰める。
  const MIN_DIST = 58;
  const MAX_TRIES = 24;
  const occupied = [];

  /* 「下から積み上がる」配置。
     occupied.length は生きている花の数（消えた花は releasePosition で外れる）。
     花が少ないうちは下の帯だけを使い、増えるほど上へ帯を広げる＝積み上がる。
     帯の中でもさらに下寄りに寄せて、底に溜まっている雰囲気を出す。 */
  function bandTopY() {
    const cfg  = window.DISPLAY_CONFIG || {};
    const max  = cfg.maxFlowers || 90;
    const fill = Math.min(1, occupied.length / max);      // 0（空）〜1（満杯）
    const span = FIELD.y1 - FIELD.y0;
    // 空なら下から14%だけ。満杯でも上限70%までしか上がらず、常に下に溜まる。
    return FIELD.y1 - span * (0.14 + 0.56 * fill);
  }

  function randomYInBand(top) {
    // 指数<1 で下（y1側）に強く寄せる。小さいほど底に密集する。
    const t = Math.pow(Math.random(), 0.32);
    return top + t * (FIELD.y1 - top);
  }

  // 占有スロットは push した object をそのまま返す。
  // 花が消えるとき releasePosition(ref) で同じ参照を外し、場所を再利用可能にする。
  function pickPosition() {
    const top = bandTopY();
    for (let i = 0; i < MAX_TRIES; i++) {
      const x = FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0);
      const y = randomYInBand(top);
      if (!collides(x, y)) {
        const ref = { x, y };
        occupied.push(ref);
        return ref;
      }
    }
    const ref = {
      x: FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0),
      y: randomYInBand(top),
    };
    occupied.push(ref);
    return ref;
  }

  /** 花が消えたとき、その占有スロットを解放して新しい花が同じ場所を使えるようにする */
  function releasePosition(ref) {
    const i = occupied.indexOf(ref);
    if (i >= 0) occupied.splice(i, 1);
  }

  function collides(x, y) {
    for (const p of occupied) {
      const dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return true;
    }
    return false;
  }

  function clearOccupied() { occupied.length = 0; }

  // 色ごとの補助色（線・影）。
  // rich: 花びら本体は SVG グラデーション url(#fg-<key>)
  // flat: petal のフラット塗り（mobile/js/flower.js と同じ値）
  const COLOR_MAP = {
    pink:   { petal: "#F4A6B8", petalDark: "#B85C7E", center: "#FFE9A8", centerDark: "#C28F2D" },
    yellow: { petal: "#FAD16A", petalDark: "#C68A1A", center: "#FFF5D0", centerDark: "#A05010" },
    white:  { petal: "#FFFBEC", petalDark: "#B89A60", center: "#F5BE5A", centerDark: "#A56A1E" },
    purple: { petal: "#C9A6E0", petalDark: "#7B519C", center: "#FFE5A8", centerDark: "#C28F2D" },
    red:    { petal: "#EE7A6A", petalDark: "#A0382C", center: "#FFD78A", centerDark: "#A56A1E" },
  };

  const KINDS = ["a", "b", "c"];

  // ────── flat モード ────────────────────────────────────────────────
  /* 7/23 STB テストで rich と比較するための簡素描画。
     rich は 1輪あたり 7〜19 要素＋グラデーションを使い、600輪で約9,000要素に
     なる。43インチを離れて見る用途では、その繊細さは視認されない。
     flat は 3種×5色＝15個のシンボルを defs に一度だけ定義し、
     各花は <use> 1個で実体化する（1輪＝outer g + inner g + use の3ノード）。
     グラデーション・stroke・おしべ等の内部ディテールは持たない。 */

  let flatDefsBuilt = false;

  /** defs に flat 用シンボル（3種×5色）を一度だけ構築する */
  function buildFlatDefs() {
    if (flatDefsBuilt) return;
    const SVG = "http://www.w3.org/2000/svg";
    const defs = document.querySelector("#flowers-layer defs");
    if (!defs) return;

    KINDS.forEach(kind => {
      Object.keys(COLOR_MAP).forEach(colorKey => {
        const c = COLOR_MAP[colorKey];
        const sym = document.createElementNS(SVG, "g");
        sym.setAttribute("id", `ff-${kind}-${colorKey}`);

        // Sakana調の最小化：茎・葉は持たず、花（ブロッサム）だけを描く。
        sym.appendChild(createFlatHead(SVG, kind, c));
        defs.appendChild(sym);
      });
    });
    flatDefsBuilt = true;
  }

  /** flat の花頭部：Sakana調のミニマル線画。
      1種につき数本の細線＋フラット塗りのみ。茎・葉・おしべ・重なりは持たない。
      原点を中心に放射配置し、花そのものが点に対して中央に来る（舞う花）。 */
  function createFlatHead(SVG, kind, c) {
    const head = document.createElementNS(SVG, "g");
    const LINE = "#6E5A46";   // 均一な細線
    const LW   = "2";

    const petal = (d, fill, rot) => {
      const p = document.createElementNS(SVG, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", fill);
      p.setAttribute("stroke", LINE);
      p.setAttribute("stroke-width", LW);
      p.setAttribute("stroke-linejoin", "round");
      if (rot) p.setAttribute("transform", `rotate(${rot})`);
      head.appendChild(p);
    };
    const dot = (r, fill) => {
      const ctr = document.createElementNS(SVG, "circle");
      ctr.setAttribute("r", String(r));
      ctr.setAttribute("fill", fill);
      ctr.setAttribute("stroke", LINE);
      ctr.setAttribute("stroke-width", LW);
      head.appendChild(ctr);
    };

    if (kind === "a") {
      // コスモス／デイジー：丸い花びら5枚＋芯（シンプルな輪郭）
      const PD = "M0,-6 C-8,-8 -11,-26 0,-30 C11,-26 8,-8 0,-6 Z";
      for (let i = 0; i < 5; i++) petal(PD, c.petal, i * 72);
      dot(6, c.center);

    } else if (kind === "b") {
      // チューリップ：3つ山の一本輪郭（カップ）だけ
      petal(
        "M0,8 C-13,8 -15,-14 -13,-30 C-8,-24 -5,-32 -4,-30 " +
        "C-2,-24 -1,-32 0,-30 C1,-32 2,-24 4,-30 C5,-32 8,-24 13,-30 " +
        "C15,-14 13,8 0,8 Z",
        c.petal, 0);

    } else {
      // さくら：先端に切れ込みのある花びら5枚＋芯（さくららしさは残す）
      const SD = "M0,-4 C-8,-6 -12,-24 -6,-30 L0,-25 L6,-30 C12,-24 8,-6 0,-4 Z";
      for (let i = 0; i < 5; i++) petal(SD, c.petal, i * 72);
      dot(5, c.center);
    }
    return head;
  }

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
    // 消えるときに座標スロットを解放するための参照
    outer._occ = pos;

    // ── inner g：CSS アニメーション対象（SVG transform は付けない） ─
    const g = document.createElementNS(SVG, "g");
    g.setAttribute("class", "flower");
    g.style.setProperty("--seed-rot", rot + "deg");
    g.setAttribute("data-id", flower.id);

    // flat モード：defs のシンボルを <use> 1個で実体化して終わり
    if ((window.DISPLAY_CONFIG || {}).style === "flat") {
      buildFlatDefs();
      const kindKey = KINDS.includes(flower.kind) ? flower.kind : "a";
      const ref = `#ff-${kindKey}-${colorKey}`;
      const use = document.createElementNS(SVG, "use");
      use.setAttribute("href", ref);
      // 古いブラウザ向けの保険。STB の搭載ブラウザは 7/23 に判明する
      use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", ref);
      g.appendChild(use);
      outer.appendChild(g);
      outer._animated = g;
      return outer;
    }

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

  return { createFlowerNode, clearOccupied, releasePosition, FIELD };
})();
