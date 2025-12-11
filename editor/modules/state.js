/**
 * エディタ用状態管理モジュール (Namespace: FavTool.Editor.Store)
 */
(function () {
    window.FavTool = window.FavTool || {};
    window.FavTool.Editor = window.FavTool.Editor || {};

    const SORT_ORDER = FavTool.Constants.SORT_ORDER;

    class EditorState {
        constructor() {
            this.reset();
            this.listeners = [];
        }

        reset() {
            this.db = { tags: [], threads: [] };
            this.currentSort = { key: 'user_timestamp', order: SORT_ORDER.ASC };
            this.filteredThreads = [];
            this.currentPage = 1;
            this.itemsPerPage = 20;
            this.selectedUrls = new Set();
            this.isLoaded = false;
        }

        loadDb(data) {
            this.reset();
            this.db = data;
            if (!this.db.tags) this.db.tags = [];
            if (!this.db.threads) this.db.threads = [];
            this.isLoaded = true;
            this.filteredThreads = [...this.db.threads];
            this.notify();
        }

        setFilteredThreads(threads) {
            this.filteredThreads = threads;
            this.notify();
        }

        setSort(key, order) {
            this.currentSort = { key, order };
            this.notify();
        }

        setPage(page) {
            this.currentPage = page;
            this.notify();
        }

        toggleSelection(url, isSelected) {
            if (isSelected) {
                this.selectedUrls.add(url);
            } else {
                this.selectedUrls.delete(url);
            }
            this.notify();
        }

        updateThread(url, updates) {
            const thread = this.db.threads.find(t => t.url === url);
            if (thread) {
                Object.assign(thread, updates);
                this.notify();
            }
        }

        addTag(newTag) {
            if (!this.db.tags.includes(newTag)) {
                this.db.tags.push(newTag);
                this.db.tags.sort();
                this.notify();
            }
        }

        updateTagsInDb(newTags, newThreadTagsFunc) {
            this.db.tags = newTags;
            if (newThreadTagsFunc) {
                this.db.threads.forEach(newThreadTagsFunc);
            }
            this.notify();
        }

        subscribe(callback) {
            this.listeners.push(callback);
        }

        notify() {
            this.listeners.forEach(cb => cb(this));
        }

        get totalPages() {
            return Math.ceil(this.filteredThreads.length / this.itemsPerPage);
        }

        get paginatedThreads() {
            const total = this.totalPages;
            if (this.currentPage > total) this.currentPage = total || 1;
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredThreads.slice(start, end);
        }
    }

    FavTool.Editor.Store = new EditorState();
})();
