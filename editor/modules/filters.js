/**
 * エディタ用フィルタリング・ソートモジュール (Namespace: FavTool.Editor.Filters)
 */
(function () {
    window.FavTool = window.FavTool || {};
    window.FavTool.Editor = window.FavTool.Editor || {};

    const Filters = {
        applyFiltersAndSort: function (conditions) {
            const store = FavTool.Editor.Store;
            let threads = [...store.db.threads];

            // キーワード検索
            const keyword = conditions.keyword.toLowerCase();
            if (keyword) {
                threads = threads.filter(t => t.title.toLowerCase().includes(keyword));
            }

            // タグフィルタ
            if (conditions.tags && conditions.tags.length > 0) {
                if (conditions.tagMode === 'AND') {
                    threads = threads.filter(t => t.tags && conditions.tags.every(tag => t.tags.includes(tag)));
                } else { // OR
                    threads = threads.filter(t => t.tags && conditions.tags.some(tag => t.tags.includes(tag)));
                }
            }

            // 未分類フィルタ
            if (conditions.untagged) {
                threads = threads.filter(t => !t.tags || t.tags.length === 0);
            }

            // 説明なしフィルタ
            if (conditions.noDesc) {
                threads = threads.filter(t => !t.description || t.description.trim() === '');
            }

            // ソート
            const { key, order } = store.currentSort;
            threads.sort((a, b) => {
                const valA = a[key] || '';
                const valB = b[key] || '';
                if (valA < valB) return order === 'asc' ? -1 : 1;
                if (valA > valB) return order === 'asc' ? 1 : -1;
                return 0;
            });

            store.setFilteredThreads(threads);
        }
    };

    FavTool.Editor.Filters = Filters;
})();
