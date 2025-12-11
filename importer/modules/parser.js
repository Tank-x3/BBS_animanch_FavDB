/**
 * インポーター用パーサーモジュール (Namespace: FavTool.Importer.Parser)
 */
(function () {
    window.FavTool = window.FavTool || {};
    window.FavTool.Importer = window.FavTool.Importer || {};

    const readFileAsText = FavTool.Utils.readFileAsText;

    const Parser = {
        /**
         * ファイルを読み込んで解析結果を返す
         */
        parseFile: async function (file) {
            try {
                const ext = file.name.split('.').pop().toLowerCase();
                let content = await readFileAsText(file);
                let result;

                if (ext === 'json') {
                    result = JSON.parse(content);
                    if (typeof result.threads !== 'object' || typeof result.tags !== 'object') {
                        throw new Error("不正なJSON構造です。");
                    }
                } else if (['html', 'htm', 'mht', 'mhtml'].includes(ext)) {
                    result = this.parseHtmlContent(content);
                } else {
                    throw new Error(`未対応のファイル形式です: ${file.name}`);
                }
                return { ...result, source: ext.startsWith('mh') ? 'mht/html' : ext };
            } catch (err) {
                throw new Error(`${file.name}の解析に失敗しました: ${err.message}`);
            }
        },

        /**
         * HTML文字列からお気に入りスレッドを抽出する
         */
        parseHtmlContent: function (htmlString) {
            const doc = new DOMParser().parseFromString(htmlString, 'text/html');
            const favDiv = doc.getElementById('favorite');
            if (!favDiv) throw new Error("お気に入りセクション(<div id='favorite'>)が見つかりません。");

            const threads = [];
            const rows = favDiv.querySelectorAll('table tr');

            if (rows.length === 0 && !favDiv.textContent.includes("見つかりませんでした")) {
                throw new Error("お気に入りスレッドのテーブルが見つかりません。");
            }

            rows.forEach((row, index) => {
                if (index === 0) return; // ヘッダーのみスキップ
                const link = row.querySelector('td:nth-child(1) a');
                const timeCell = row.querySelector('td:nth-child(4)');
                if (link && timeCell) {
                    threads.push({
                        url: link.href,
                        title: link.textContent.trim(),
                        tags: [],
                        description: '',
                        add_timestamp: '',
                        user_timestamp: timeCell.textContent.trim().split('(')[0]
                    });
                }
            });

            return { tags: [], threads };
        }
    };

    FavTool.Importer.Parser = Parser;
})();
