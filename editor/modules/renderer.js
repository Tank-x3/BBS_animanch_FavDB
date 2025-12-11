/**
 * エディタ用レンダラーモジュール (Namespace: FavTool.Editor.Renderer)
 */
(function () {
    window.FavTool = window.FavTool || {};
    window.FavTool.Editor = window.FavTool.Editor || {};

    const SVG_CARET = `<svg class="icon-caret" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"></path></svg>`;
    const SVG_PENCIL = `<svg class="icon-pencil" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>`;

    const Renderer = {
        render: function () {
            const store = FavTool.Editor.Store;
            const { filteredThreads, itemsPerPage, selectedUrls, db } = store;

            const expandedUrls = new Set();
            document.querySelectorAll('.details-row:not(.hidden), .card-details:not(.hidden)').forEach(el => {
                const url = el.dataset.detailsUrl || el.closest('.card').dataset.url;
                expandedUrls.add(url);
            });

            const totalPages = store.totalPages;
            const startIndex = (store.currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedThreads = store.paginatedThreads;

            const isSP = window.matchMedia('(max-width: 767px)').matches;

            if (isSP) {
                document.getElementById('data-table').style.display = 'none';
                document.getElementById('card-list').style.display = 'block';
                this.renderCards(paginatedThreads, expandedUrls, startIndex, selectedUrls);
            } else {
                document.getElementById('data-table').style.display = 'table';
                document.getElementById('card-list').style.display = 'none';
                this.renderTable(paginatedThreads, expandedUrls, startIndex, selectedUrls);
            }

            this.renderPagination(totalPages);

            // Status Bar
            const statusBar = document.getElementById('status-bar');
            statusBar.textContent = `全${db.threads.length}件中 ${filteredThreads.length}件がヒット ( ${startIndex + 1}-${Math.min(endIndex, filteredThreads.length)}件を表示 )`;

            this.updateTagFilterDropdown(db.tags);
            this.updateSortHeaders();
            this.updateToggleAllButtonState();
            this.updateBatchEditBar(selectedUrls, paginatedThreads);
        },

        renderTable: function (threads, expandedUrls, startIndex, selectedUrls) {
            const tableBody = document.getElementById('table-body');
            tableBody.innerHTML = '';

            threads.forEach((thread, index) => {
                const tr = document.createElement('tr');
                tr.classList.add('data-row');
                tr.dataset.url = thread.url;

                const isSelected = selectedUrls.has(thread.url);
                const dateStr = thread.user_timestamp || thread.add_timestamp || '';

                tr.innerHTML = `
                    <td class="col-select"><input type="checkbox" class="row-checkbox" data-url="${thread.url}" ${isSelected ? 'checked' : ''}></td>
                    <td class="col-no">${startIndex + index + 1}</td>
                    <td class="col-datetime editable" data-field="user_timestamp">${dateStr}</td>
                    <td class="col-title"><a href="${thread.url}" target="_blank">${thread.title}</a></td>
                    <td class="col-tags"></td>
                    <td class="col-actions">
                        <div class="action-buttons">
                            <button class="action-button details-toggle" data-url="${thread.url}">${SVG_CARET}</button>
                            <button class="action-button edit-button" data-index="${startIndex + index}">${SVG_PENCIL}</button>
                        </div>
                    </td>
                `;

                this.renderTags(tr.querySelector('.col-tags'), thread);
                tableBody.appendChild(tr);

                const detailsRow = document.createElement('tr');
                detailsRow.classList.add('details-row');
                detailsRow.dataset.detailsUrl = thread.url;
                detailsRow.innerHTML = `<td colspan="6" class="details-cell"><div class="description-display">${thread.description || 'クリックして説明を追加...'}</div></td>`;

                if (expandedUrls.has(thread.url)) {
                    tr.querySelector('.details-toggle').classList.add('expanded');
                } else {
                    detailsRow.classList.add('hidden');
                }
                tableBody.appendChild(detailsRow);
            });
        },

        renderCards: function (threads, expandedUrls, startIndex, selectedUrls) {
            const cardList = document.getElementById('card-list');
            cardList.innerHTML = '';

            threads.forEach((thread, index) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.url = thread.url;

                const isSelected = selectedUrls.has(thread.url);
                const dateStr = thread.user_timestamp || thread.add_timestamp || '';

                card.innerHTML = `
                    <div class="col-select">
                        <input type="checkbox" class="row-checkbox" data-url="${thread.url}" ${isSelected ? 'checked' : ''}>
                    </div>
                    <div class="card-content">
                        <div class="card-header">
                            <span>No.${startIndex + index + 1}</span>
                            <span>${dateStr}</span>
                            <div class="action-buttons">
                                <button class="action-button details-toggle" data-url="${thread.url}">${SVG_CARET}</button>
                                <button class="action-button edit-button" data-index="${startIndex + index}">${SVG_PENCIL}</button>
                            </div>
                        </div>
                        <div class="card-title"><a href="${thread.url}" target="_blank">${thread.title}</a></div>
                        <div class="card-tags"></div>
                        <div class="card-details" data-details-url="${thread.url}">
                            <div class="description-display">${thread.description || 'クリックして説明を追加...'}</div>
                        </div>
                    </div>
                `;

                this.renderTags(card.querySelector('.card-tags'), thread);

                const details = card.querySelector('.card-details');
                if (expandedUrls.has(thread.url)) {
                    card.querySelector('.details-toggle').classList.add('expanded');
                } else {
                    details.classList.add('hidden');
                }

                cardList.appendChild(card);
            });
        },

        renderTags: function (container, thread) {
            container.innerHTML = '';
            (thread.tags || []).forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tag;
                container.appendChild(tagEl);
            });
            const addTagEl = document.createElement('span');
            addTagEl.className = 'tag add-tag';
            addTagEl.textContent = '+';
            container.appendChild(addTagEl);
        },

        renderPagination: function (totalPages) {
            const store = FavTool.Editor.Store;
            const container = document.getElementById('pagination');
            container.innerHTML = '';
            if (totalPages <= 1) {
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');

            const currentPage = store.currentPage;
            const createButton = (text, page, disabled = false) => {
                const btn = document.createElement('button');
                btn.textContent = text;
                btn.disabled = disabled;
                btn.dataset.page = page;
                btn.classList.add('pagination-btn');
                return btn;
            };

            container.appendChild(createButton('<< 最初', 1, currentPage === 1));
            container.appendChild(createButton('< 前へ', currentPage - 1, currentPage === 1));
            const pageInfo = document.createElement('span');
            pageInfo.textContent = `${currentPage} / ${totalPages}ページ`;
            container.appendChild(pageInfo);
            container.appendChild(createButton('次へ >', currentPage + 1, currentPage === totalPages));
            container.appendChild(createButton('最後 >>', totalPages, currentPage === totalPages));
        },

        updateTagFilterDropdown: function (allTags) {
            const container = document.getElementById('tag-checkboxes');
            const currentChecked = new Set(Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value));

            container.innerHTML = '';
            allTags.forEach(tag => {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = tag;
                checkbox.classList.add('tag-filter-checkbox');
                if (currentChecked.has(tag)) checkbox.checked = true;

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` ${tag}`));
                container.appendChild(label);
            });
        },

        updateSortHeaders: function () {
            const store = FavTool.Editor.Store;
            const SORT_ORDER = FavTool.Constants.SORT_ORDER;
            const { key, order } = store.currentSort;
            document.querySelectorAll('#data-table th.sortable').forEach(th => {
                let arrowSpan = th.querySelector('.sort-arrow');
                if (!arrowSpan) {
                    arrowSpan = document.createElement('span');
                    arrowSpan.className = 'sort-arrow';
                    th.appendChild(arrowSpan);
                }

                let arrow = '';
                if (key === th.dataset.sort) {
                    arrow = order === SORT_ORDER.ASC ? '▲' : '▼';
                }
                arrowSpan.textContent = arrow;
            });
        },

        updateToggleAllButtonState: function () {
            const btn = document.getElementById('toggle-all-details');
            const allDetails = document.querySelectorAll('.details-row, .card-details');
            if (allDetails.length === 0) {
                btn.textContent = '全て展開';
                return;
            }
            const isAnyHidden = Array.from(allDetails).some(el => el.classList.contains('hidden'));
            btn.textContent = isAnyHidden ? '全て展開' : '全て畳む';
        },

        updateBatchEditBar: function (selectedUrls, paginatedThreads) {
            const count = selectedUrls.size;
            const btn = document.getElementById('batch-edit-button');
            btn.textContent = `選択した${count}件を一括編集`;
            btn.disabled = count === 0;

            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            const paginatedUrls = new Set(paginatedThreads.map(t => t.url));

            if (paginatedUrls.size === 0) {
                selectAllCheckbox.checked = false;
                return;
            }
            const allOnPageSelected = Array.from(paginatedUrls).every(url => selectedUrls.has(url));
            selectAllCheckbox.checked = allOnPageSelected;
        }
    };

    FavTool.Editor.Renderer = Renderer;
})();
