/* 「ふわっと一斉に咲く」演出。
   渡された新規花リストを SVG に追加し、staggered なディレイで bloom させる。
   既に咲き終わった花（settled）には animation を付けない。 */
window.Bloom = (function () {

  const FLOWERS_ROOT_ID = "flowers-root";

  function root() {
    return document.getElementById(FLOWERS_ROOT_ID);
  }

  // 新規花を fresh bloom で追加
  function bloomNew(flowers) {
    const r = root();
    if (!r) return;
    flowers.forEach((f, i) => {
      const node = Scene.createFlowerNode(f);
      // 0〜2.5秒の間でランダムにディレイ（同時感を保ちつつバラけさせる）
      const delay = (i * 0.08 + Math.random() * 0.4).toFixed(2);
      node.style.setProperty("--bloom-delay", delay + "s");

      r.appendChild(node);

      // 咲ききった後にゆらぎを付与
      const totalDelayMs = (parseFloat(delay) + 1.6) * 1000;
      setTimeout(() => {
        if (!node.isConnected) return;
        node.classList.add("sway");
        node.style.setProperty("--sway-delay", (Math.random() * 4).toFixed(2) + "s");
      }, totalDelayMs + 50);
    });
  }

  // 既存花を「咲ききった状態」で並べる（初回ロード用）
  function settle(flowers) {
    const r = root();
    if (!r) return;
    flowers.forEach(f => {
      const node = Scene.createFlowerNode(f);
      node.classList.add("settled");
      r.appendChild(node);
    });
  }

  // 古い花を間引き（max を超えたら先頭から削除）
  function pruneTo(max) {
    const r = root();
    if (!r) return;
    while (r.children.length > max) {
      r.removeChild(r.firstChild);
    }
  }

  function clearAll() {
    const r = root();
    if (!r) return;
    while (r.firstChild) r.removeChild(r.firstChild);
    Scene.clearOccupied();
  }

  return { bloomNew, settle, pruneTo, clearAll };
})();
