/**
 * 共有ユーティリティモジュール (Namespace: FavTool.Utils)
 */
(function () {
    window.FavTool = window.FavTool || {};

    const Utils = {
        /**
         * 日付文字列をフォーマットして返します。
         */
        formatDateTime: function (isoString, format = "%Y-%m-%d %H:%M:%S") {
            if (!isoString) return "";
            try {
                const date = new Date(isoString);
                if (isNaN(date.getTime())) return "N/A";

                const pad = (n) => n.toString().padStart(2, '0');
                const y = date.getFullYear();
                const m = pad(date.getMonth() + 1);
                const d = pad(date.getDate());
                const h = pad(date.getHours());
                const mi = pad(date.getMinutes());
                const s = pad(date.getSeconds());

                return `${y}-${m}-${d} ${h}:${mi}:${s}`;
            } catch (e) {
                return "N/A";
            }
        },

        /**
         * ファイルを読み込み、テキストとして返します。
         */
        readFileAsText: function (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました。"));
                reader.readAsText(file, 'utf-8');
            });
        },

        /**
         * 指定された時間だけ待機します（非同期）。
         */
        wait: function (ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * HTML文字列をエスケープして無害化します（簡易版）。
         */
        escapeHtml: function (str) {
            if (!str) return "";
            return str.replace(/[&<>"']/g, function (match) {
                const escape = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                };
                return escape[match];
            });
        }
    };

    FavTool.Utils = Utils;
})();
