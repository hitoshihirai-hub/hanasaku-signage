/* スタンプ管理（localStorage）
   スタンプ = 訪問済みスポットIDのSet。
   localStorage に JSON 配列として保存する。 */
window.Stamp = (function () {

  function key() {
    return (window.MOBILE_CONFIG || {}).storageKey || "hanasaku_stamps_v1";
  }

  /** 取得済みスタンプIDのSetを返す */
  function getAll() {
    try {
      const raw = localStorage.getItem(key());
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  /** スポットIDを取得済みに追加する。新規取得なら true を返す */
  function collect(spotId) {
    const stamps = getAll();
    if (stamps.has(String(spotId))) return false;   // 既取得
    stamps.add(String(spotId));
    try {
      localStorage.setItem(key(), JSON.stringify([...stamps]));
    } catch {
      // ストレージ不可でも続行
    }
    return true;
  }

  /** 特定スポットが取得済みか */
  function has(spotId) {
    return getAll().has(String(spotId));
  }

  /** 取得済み数 */
  function count() {
    return getAll().size;
  }

  /** 全スタンプをリセット（デバッグ用） */
  function reset() {
    try { localStorage.removeItem(key()); } catch {}
  }

  return { getAll, collect, has, count, reset };
})();
