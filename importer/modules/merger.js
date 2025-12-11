/**
 * インポーター用マージロジックモジュール (Namespace: FavTool.Importer.Merger)
 */
(function () {
    window.FavTool = window.FavTool || {};
    window.FavTool.Importer = window.FavTool.Importer || {};

    const Merger = {
        /**
         * ファイルリストを処理して既存DBと統合する
         */
        processMerge: async function (baseDb, filesToProcess, conflictResolver) {
            const parseFile = FavTool.Importer.Parser.parseFile.bind(FavTool.Importer.Parser);
            let mergedDb = JSON.parse(JSON.stringify(baseDb)); // Deep copy

            for (const file of filesToProcess) {
                const additionalData = await parseFile(file);
                const conflicts = [];

                // URLをキーにしたMapを作成して高速化
                const baseThreadsByUrl = new Map(mergedDb.threads.map(t => [t.url, t]));

                for (const addThread of additionalData.threads) {
                    const baseThread = baseThreadsByUrl.get(addThread.url);
                    if (baseThread) { // URLが重複
                        const result = { ...baseThread };
                        const hasConflict = this.mergeThread(result, addThread, additionalData.source);
                        if (hasConflict) {
                            conflicts.push({ base: baseThread, add: addThread, source: additionalData.source, result });
                        } else {
                            Object.assign(baseThread, result);
                        }
                    } else { // 新規スレッド
                        mergedDb.threads.push(addThread);
                    }
                }

                // タグの統合
                const allTags = new Set([...mergedDb.tags, ...additionalData.tags]);
                mergedDb.tags = Array.from(allTags).sort();

                // 競合の解決
                if (conflicts.length > 0) {
                    for (let i = 0; i < conflicts.length; i++) {
                        const conflict = conflicts[i];
                        const resolvedThread = await conflictResolver(conflict.base, conflict.add, i + 1, conflicts.length);
                        Object.assign(baseThreadsByUrl.get(resolvedThread.url), resolvedThread);
                    }
                }
            }
            return mergedDb;
        },

        /**
         * 2つのスレッド情報をマージする
         */
        mergeThread: function (base, add, addSource) {
            let hasConflict = false;

            // タイトルの比較
            const titleA = base.title || '';
            const titleB = add.title || '';

            if (addSource === 'mht/html') {
                base.title = titleB;
            } else if (titleA !== titleB) {
                if (!titleA) base.title = titleB;
                else if (titleB) hasConflict = true;
            }

            // 説明文の比較
            const descA = base.description || '';
            const descB = add.description || '';
            if (descA !== descB) {
                if (!descA) base.description = descB;
                else if (!descB) { /* 既存の説明を維持 */ }
                else hasConflict = true;
            }

            // タグの統合
            const tags = new Set([...(base.tags || []), ...(add.tags || [])]);
            base.tags = Array.from(tags).sort();

            // 日時の統合
            base.user_timestamp = base.user_timestamp || add.user_timestamp;
            base.add_timestamp = base.add_timestamp || add.add_timestamp;

            return hasConflict;
        }
    };

    FavTool.Importer.Merger = Merger;
})();
