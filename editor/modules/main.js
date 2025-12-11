/**
 * エディタ用メインモジュール (Namespace: FavTool.Editor.Main)
 */
document.addEventListener('DOMContentLoaded', () => {
    // イベントリスナーのセットアップ
    // Handlerモジュールがロードされていることを前提とする
    if (window.FavTool && FavTool.Editor && FavTool.Editor.Handler) {
        FavTool.Editor.Handler.setupEventListeners();
    } else {
        console.error('Core modules not loaded.');
    }
});
