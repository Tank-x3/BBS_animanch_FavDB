/**
 * エディタ用イベントハンドラモジュール (Namespace: FavTool.Editor.Handler)
 */
(function () {
    window.FavTool = window.FavTool || {};
    window.FavTool.Editor = window.FavTool.Editor || {};

    // Shortcuts
    const Store = FavTool.Editor.Store;
    const Renderer = FavTool.Editor.Renderer;
    const Filters = FavTool.Editor.Filters;
    const Utils = FavTool.Utils;
    const Constants = FavTool.Constants;

    let currentModalIndex = -1;

    const Handler = {
        setupEventListeners: function () {
            // File I/O
            this.setupFileHandling();

            // Filter & Sort
            this.setupFilters();

            // Pagination
            document.getElementById('pagination').addEventListener('click', (e) => {
                if (e.target.classList.contains('pagination-btn')) {
                    Store.setPage(parseInt(e.target.dataset.page, 10));
                    Renderer.render();
                    window.scrollTo(0, 0);
                }
            });

            // Table Interactions
            document.getElementById('data-container').addEventListener('click', (e) => this.handleTableInteractions(e));

            // Batch Edit
            this.setupBatchEdit();

            // Modals
            this.setupModals();

            // Resize
            window.addEventListener('resize', () => Renderer.render());

            // Export HTML
            document.getElementById('export-html-button').addEventListener('click', () => this.handleExportHtml());

            // Tag Management
            document.getElementById('tag-management-button').addEventListener('click', () => this.openTagManagementModal());
        },

        setupFileHandling: function () {
            const dropArea = document.getElementById('file-drop-area');
            const fileInput = document.getElementById('file-input');
            const saveButton = document.getElementById('save-button');

            dropArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));

            dropArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropArea.classList.add('dragover'); });
            dropArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); dropArea.classList.remove('dragover'); });
            dropArea.addEventListener('drop', (e) => {
                e.preventDefault(); e.stopPropagation();
                dropArea.classList.remove('dragover');
                this.handleFile(e.dataTransfer.files[0]);
            });

            saveButton.addEventListener('click', () => this.saveFile());
        },

        handleFile: async function (file) {
            if (file && file.name.endsWith('.json')) {
                try {
                    const text = await Utils.readFileAsText(file);
                    const data = JSON.parse(text);
                    Store.loadDb(data);

                    document.getElementById('file-drop-area').classList.add('hidden');
                    document.getElementById('controls').classList.remove('hidden');
                    document.getElementById('pagination').classList.remove('hidden');
                    document.getElementById('batch-edit-bar').classList.remove('hidden');
                    document.querySelectorAll('#save-button, #export-html-button, #tag-management-button').forEach(el => el.disabled = false);

                    this.triggerFilter();
                } catch (err) {
                    alert('JSONファイルの解析に失敗しました。');
                    console.error(err);
                }
            } else {
                alert('JSONファイルを選択してください。');
            }
        },

        saveFile: function () {
            if (document.getElementById('edit-modal').classList.contains('hidden') === false) {
                // saveModalData is called on close/nav, so data is likely stale if not saved manualy here?
                // For safety, assume latest state in DB is preserved on modal interaction.
            }

            const dataStr = JSON.stringify(Store.db, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = Constants.DB_FILE_NAME;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        triggerFilter: function () {
            const keyword = document.getElementById('keyword-search').value;
            const checkedTags = Array.from(document.querySelectorAll('#tag-checkboxes input:checked')).map(cb => cb.value);
            const tagMode = document.getElementById('tag-filter-mode').value;
            const untagged = document.getElementById('filter-untagged').checked;
            const noDesc = document.getElementById('filter-nodesc').checked;

            Filters.applyFiltersAndSort({
                keyword,
                tags: checkedTags,
                tagMode,
                untagged,
                noDesc
            });

            Store.setPage(1);
            Renderer.render();
        },

        setupFilters: function () {
            const ids = ['keyword-search', 'tag-filter-mode', 'filter-untagged', 'filter-nodesc'];
            const trigger = () => this.triggerFilter();
            ids.forEach(id => document.getElementById(id).addEventListener('change', trigger));
            document.getElementById('keyword-search').addEventListener('input', trigger);

            const multi = document.getElementById('tag-multiselect');
            const checks = document.getElementById('tag-checkboxes');
            multi.addEventListener('click', (e) => {
                if (!e.target.matches('input[type="checkbox"]')) {
                    checks.style.display = checks.style.display === 'block' ? 'none' : 'block';
                }
            });
            document.addEventListener('click', (e) => {
                if (!multi.contains(e.target)) checks.style.display = 'none';
            });

            checks.addEventListener('change', (e) => {
                if (e.target.matches('input.tag-filter-checkbox')) {
                    trigger();
                }
            });

            document.getElementById('reset-filter').addEventListener('click', () => {
                document.getElementById('keyword-search').value = '';
                document.getElementById('tag-filter-mode').value = 'AND';
                document.getElementById('filter-untagged').checked = false;
                document.getElementById('filter-nodesc').checked = false;
                document.querySelectorAll('#tag-checkboxes input:checked').forEach(cb => cb.checked = false);

                Store.currentSort = { key: 'user_timestamp', order: Constants.SORT_ORDER.ASC };
                Store.selectedUrls.clear();

                trigger();
            });

            document.getElementById('toggle-all-details').addEventListener('click', (e) => {
                const isExpanding = e.target.textContent === '全て展開';
                document.querySelectorAll('.details-toggle').forEach(btn => {
                    const url = btn.dataset.url;
                    const detailsElements = document.querySelectorAll(`[data-details-url="${url}"]`);
                    detailsElements.forEach(el => el.classList.toggle('hidden', !isExpanding));
                    btn.classList.toggle('expanded', isExpanding);
                });
                e.target.textContent = isExpanding ? '全て畳む' : '全て展開';
            });

            document.querySelectorAll('#data-table th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    const key = th.dataset.sort;
                    let order = Constants.SORT_ORDER.ASC;
                    if (Store.currentSort.key === key && Store.currentSort.order === Constants.SORT_ORDER.ASC) {
                        order = Constants.SORT_ORDER.DESC;
                    }
                    Store.setSort(key, order);
                    trigger();
                });
            });
        },

        handleTableInteractions: function (e) {
            const rowCheckbox = e.target.closest('.row-checkbox');
            if (rowCheckbox) {
                Store.toggleSelection(rowCheckbox.dataset.url, rowCheckbox.checked);
                Renderer.render();
                return;
            }

            const detailsToggle = e.target.closest('.details-toggle');
            if (detailsToggle) {
                const url = detailsToggle.dataset.url;
                const detailsElements = document.querySelectorAll(`[data-details-url="${url}"]`);
                detailsElements.forEach(el => el.classList.toggle('hidden'));

                const isHidden = detailsElements[0].classList.contains('hidden');
                document.querySelectorAll(`.details-toggle[data-url="${url}"]`).forEach(btn => {
                    btn.classList.toggle('expanded', !isHidden);
                });
                return;
            }


            const descDisplay = e.target.closest('.description-display');
            if (descDisplay) {
                let targetUrl;
                const detailsRow = descDisplay.closest('.details-row');
                if (detailsRow) {
                    targetUrl = detailsRow.dataset.detailsUrl;
                } else {
                    const card = descDisplay.closest('.card');
                    if (card) targetUrl = card.dataset.url;
                }

                if (targetUrl) {
                    // Storeから直接データを取得して、プレースホルダーでない正確な値をセットする
                    const thread = Store.db.threads.find(t => t.url === targetUrl);
                    const currentDesc = thread ? (thread.description || '') : '';

                    this.makeEditableArea(descDisplay, currentDesc, (newVal) => {
                        Store.updateThread(targetUrl, { description: newVal });
                    });
                }
                return;
            }

            const editabledate = e.target.closest('.editable[data-field="user_timestamp"]');
            if (editabledate) {
                this.makeEditable(editabledate, (newVal) => {
                    Store.updateThread(editabledate.closest('.data-row').dataset.url, { user_timestamp: newVal });
                    this.triggerFilter();
                });
            }

            const editBtn = e.target.closest('.edit-button');
            if (editBtn) {
                const index = parseInt(editBtn.dataset.index, 10);
                this.openEditModal(index);
            }

            const tagPlus = e.target.closest('.tag.add-tag');
            if (tagPlus) {
                const row = tagPlus.closest('.data-row') || tagPlus.closest('.card');
                const url = row.dataset.url;
                const index = Store.filteredThreads.findIndex(t => t.url === url);
                if (index !== -1) this.openEditModal(index);
            }
        },

        makeEditableArea: function (element, initialValue, onSave) {
            if (element.querySelector('textarea')) return;

            const textarea = document.createElement('textarea');
            textarea.className = 'edit-description-textarea';
            textarea.value = initialValue;

            textarea.style.width = '100%';
            textarea.style.minHeight = '60px';
            textarea.style.boxSizing = 'border-box';

            element.innerHTML = '';
            element.appendChild(textarea);
            textarea.focus();

            const save = () => {
                if (textarea.value !== initialValue) {
                    onSave(textarea.value);
                } else {
                    Renderer.render();
                }
            };

            textarea.addEventListener('blur', save);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    textarea.blur();
                }
                if (e.key === 'Escape') {
                    Renderer.render();
                }
            });

            textarea.addEventListener('click', (e) => e.stopPropagation());
        },

        makeEditable: function (cell, onSave) {
            if (cell.querySelector('input')) return;
            const originalText = cell.textContent.trim();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalText;
            cell.innerHTML = '';
            cell.appendChild(input);
            input.focus();

            const save = () => {
                if (input.value !== originalText) {
                    onSave(input.value);
                } else {
                    cell.textContent = originalText;
                }
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') { cell.textContent = originalText; }
            });
        },

        openEditModal: function (index) {
            currentModalIndex = index;
            this.updateEditModal();
            document.getElementById('edit-modal').classList.remove('hidden');
            document.body.classList.add('modal-open');
        },

        updateEditModal: function () {
            const thread = Store.filteredThreads[currentModalIndex];
            if (!thread) return;

            document.getElementById('modal-counter').textContent = `${currentModalIndex + 1} / ${Store.filteredThreads.length}`;
            document.getElementById('modal-title').textContent = thread.title;
            document.getElementById('modal-title').href = thread.url;
            document.getElementById('modal-datetime').value = thread.user_timestamp || '';
            document.getElementById('modal-description').value = thread.description || '';

            const container = document.getElementById('modal-tags-container');
            container.innerHTML = '';
            Store.db.tags.forEach(tag => {
                const label = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = tag;
                cb.checked = (thread.tags || []).includes(tag);
                label.appendChild(cb);
                label.appendChild(document.createTextNode(` ${tag}`));
                container.appendChild(label);
            });

            document.getElementById('modal-tags-summary').textContent = `${(thread.tags || []).length}個選択中`;

            document.getElementById('modal-prev').disabled = currentModalIndex <= 0;
            document.getElementById('modal-next').disabled = currentModalIndex >= Store.filteredThreads.length - 1;
        },

        saveEditModalData: function () {
            const thread = Store.filteredThreads[currentModalIndex];
            if (!thread) return;

            thread.user_timestamp = document.getElementById('modal-datetime').value;
            thread.description = document.getElementById('modal-description').value;

            const checked = document.querySelectorAll('#modal-tags-container input:checked');
            thread.tags = Array.from(checked).map(c => c.value).sort();

            Store.notify();
        },

        setupModals: function () {
            const editModal = document.getElementById('edit-modal');
            document.getElementById('modal-close').addEventListener('click', () => {
                this.saveEditModalData();
                editModal.classList.add('hidden');
                document.body.classList.remove('modal-open');
                Renderer.render();
            });
            document.getElementById('modal-prev').addEventListener('click', () => {
                this.saveEditModalData();
                if (currentModalIndex > 0) {
                    currentModalIndex--;
                    this.updateEditModal();
                }
            });
            document.getElementById('modal-next').addEventListener('click', () => {
                this.saveEditModalData();
                if (currentModalIndex < Store.filteredThreads.length - 1) {
                    currentModalIndex++;
                    this.updateEditModal();
                }
            });

            document.getElementById('modal-new-tag').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value.trim();
                    if (val) {
                        Store.addTag(val);
                        e.target.value = '';
                        this.saveEditModalData();
                        this.updateEditModal();
                    }
                }
            });

            const helpModal = document.getElementById('help-modal');
            document.getElementById('help-button').addEventListener('click', () => {
                helpModal.classList.remove('hidden');
                document.body.classList.add('modal-open');
            });
            helpModal.querySelector('.modal-close-button').addEventListener('click', () => {
                helpModal.classList.add('hidden');
                document.body.classList.remove('modal-open');
            });
        },

        setupBatchEdit: function () {
            document.getElementById('select-all-checkbox').addEventListener('change', (e) => {
                const checked = e.target.checked;
                const currentUrls = Store.paginatedThreads.map(t => t.url);
                currentUrls.forEach(url => Store.toggleSelection(url, checked));
                Renderer.render();
            });

            const modal = document.getElementById('batch-edit-modal');
            document.getElementById('batch-edit-button').addEventListener('click', () => {
                if (Store.selectedUrls.size === 0) return;

                document.getElementById('batch-edit-info').textContent = `選択中の${Store.selectedUrls.size}件のスレッドを編集します。`;

                const createList = (id) => {
                    const container = document.getElementById(id);
                    container.innerHTML = '';
                    Store.db.tags.forEach(tag => {
                        const label = document.createElement('label');
                        label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
                        container.appendChild(label);
                    });
                };
                createList('batch-add-tags-list');
                createList('batch-remove-tags-list');

                modal.classList.remove('hidden');
                document.body.classList.add('modal-open');
            });

            document.getElementById('batch-edit-cancel').addEventListener('click', () => {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
            });

            document.getElementById('batch-edit-execute').addEventListener('click', () => {
                const addTags = Array.from(document.querySelectorAll('#batch-add-tags-list input:checked')).map(c => c.value);
                const remTags = Array.from(document.querySelectorAll('#batch-remove-tags-list input:checked')).map(c => c.value);

                const conflict = addTags.find(tag => remTags.includes(tag));
                if (conflict) {
                    alert(`エラー: 「${conflict}」が追加と削除の両方に指定されています。`);
                    return;
                }

                Store.db.threads.forEach(thread => {
                    if (Store.selectedUrls.has(thread.url)) {
                        if (!thread.tags) thread.tags = [];
                        const tagSet = new Set(thread.tags);
                        addTags.forEach(t => tagSet.add(t));
                        remTags.forEach(t => tagSet.delete(t));
                        thread.tags = Array.from(tagSet).sort();
                    }
                });

                Store.selectedUrls.clear();
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
                this.triggerFilter();
            });
        },

        openTagManagementModal: function () {
            const modal = document.getElementById('tag-management-modal');
            const tbody = document.querySelector('#tag-management-table tbody');

            const renderTable = () => {
                tbody.innerHTML = '';
                const counts = {};
                Store.db.threads.forEach(t => {
                    (t.tags || []).forEach(tag => counts[tag] = (counts[tag] || 0) + 1);
                });

                Store.db.tags.forEach(tag => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="tag-name">${tag}</span></td>
                        <td>${counts[tag] || 0}</td>
                        <td>
                            <button class="rename-tag-btn">名前変更</button>
                            <button class="delete-tag-btn">削除</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            };

            renderTable();
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');

            document.getElementById('tag-management-close').onclick = () => {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
                this.triggerFilter();
            };

            tbody.onclick = (e) => {
                const btn = e.target;
                const tr = btn.closest('tr');
                if (!tr) return;
                const tagName = tr.querySelector('.tag-name').textContent;

                if (btn.classList.contains('delete-tag-btn')) {
                    if (confirm(`タグ「${tagName}」を削除しますか？`)) {
                        const newTags = Store.db.tags.filter(t => t !== tagName);
                        Store.updateTagsInDb(newTags, (thread) => {
                            if (thread.tags) thread.tags = thread.tags.filter(t => t !== tagName);
                        });
                        renderTable();
                    }
                } else if (btn.classList.contains('rename-tag-btn')) {
                    const input = document.createElement('input');
                    input.value = tagName;
                    const span = tr.querySelector('.tag-name');
                    span.replaceWith(input);
                    input.focus();

                    input.onblur = () => {
                        const newName = input.value.trim();
                        if (newName && newName !== tagName) {
                            if (Store.db.tags.includes(newName)) {
                                if (!confirm(`タグ「${newName}」は既に存在します。統合しますか？`)) {
                                    renderTable(); return;
                                }
                                const newTags = Store.db.tags.filter(t => t !== tagName);
                                Store.updateTagsInDb(newTags, (thread) => {
                                    if (thread.tags && thread.tags.includes(tagName)) {
                                        thread.tags = thread.tags.filter(t => t !== tagName);
                                        if (!thread.tags.includes(newName)) thread.tags.push(newName);
                                        thread.tags.sort();
                                    }
                                });
                            } else {
                                const newTags = Store.db.tags.map(t => t === tagName ? newName : t).sort();
                                Store.updateTagsInDb(newTags, (thread) => {
                                    if (thread.tags) thread.tags = thread.tags.map(t => t === tagName ? newName : t).sort();
                                });
                            }
                        }
                        renderTable();
                    };
                    input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); };
                }
            };
        },

        handleExportHtml: function () {
            const threads = Store.filteredThreads;

            const content = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Fav DB Export</title>
    <style>body{font-family:sans-serif;} ul{list-style:none;padding:0;} li{margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;} .tag{background:#eee;padding:2px 5px;border-radius:3px;font-size:0.9em;margin-right:5px;}</style>
</head>
<body>
    <h1>Favorite Threads (${threads.length})</h1>
    <ul>
        ${threads.map(t => `
        <li>
            <a href="${t.url}" target="_blank"><strong>${t.title}</strong></a><br>
            <small>${t.user_timestamp || t.add_timestamp || ''}</small><br>
            <div>${(t.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            <p>${(t.description || '').replace(/\n/g, '<br>')}</p>
        </li>
        `).join('')}
    </ul>
</body>
</html>`;

            const blob = new Blob([content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fav_export.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    FavTool.Editor.Handler = Handler;
})();
