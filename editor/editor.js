document.addEventListener('DOMContentLoaded', function () {
    // --- Element Cache ---
    const fileDropArea = document.getElementById('file-drop-area');
    const fileInput = document.getElementById('file-input');
    const controls = document.getElementById('controls');
    const tableBody = document.getElementById('table-body');
    const cardList = document.getElementById('card-list');
    const dataContainer = document.getElementById('data-container');
    const keywordSearch = document.getElementById('keyword-search');
    const tagFilterMode = document.getElementById('tag-filter-mode');
    const tagMultiselect = document.getElementById('tag-multiselect');
    const tagCheckboxesContainer = document.getElementById('tag-checkboxes');
    const filterUntagged = document.getElementById('filter-untagged');
    const filterNoDesc = document.getElementById('filter-nodesc');
    const toggleAllDetailsBtn = document.getElementById('toggle-all-details');
    const resetFilterBtn = document.getElementById('reset-filter');
    const saveButton = document.getElementById('save-button');
    const exportHtmlButton = document.getElementById('export-html-button');
    const statusBar = document.getElementById('status-bar');
    const paginationContainer = document.getElementById('pagination');
    const batchEditBar = document.getElementById('batch-edit-bar');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const batchEditButton = document.getElementById('batch-edit-button');

    // Modals
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const helpModalClose = helpModal.querySelector('.modal-close-button');
    
    const editModal = document.getElementById('edit-modal');
    const modalClose = document.getElementById('modal-close');
    const modalPrevBtn = document.getElementById('modal-prev');
    const modalNextBtn = document.getElementById('modal-next');
    const modalCounter = document.getElementById('modal-counter');
    const modalTitle = document.getElementById('modal-title');
    const modalDatetime = document.getElementById('modal-datetime');
    const modalTagsDetails = document.getElementById('modal-tags-details');
    const modalTagsContainer = document.getElementById('modal-tags-container');
    const modalTagsSummary = document.getElementById('modal-tags-summary');
    const modalNewTag = document.getElementById('modal-new-tag');
    const modalDescription = document.getElementById('modal-description');

    const batchEditModal = document.getElementById('batch-edit-modal');
    const batchEditInfo = document.getElementById('batch-edit-info');
    const batchAddTagsSelect = document.getElementById('batch-add-tags-list');
    const batchRemoveTagsSelect = document.getElementById('batch-remove-tags-list');
    const batchEditExecute = document.getElementById('batch-edit-execute');
    const batchEditCancel = document.getElementById('batch-edit-cancel');

    const tagManagementButton = document.getElementById('tag-management-button');
    const tagManagementModal = document.getElementById('tag-management-modal');
    const tagManagementTableBody = document.querySelector('#tag-management-table tbody');
    const tagManagementClose = document.getElementById('tag-management-close');

    // --- Global State ---
    let db = { tags: [], threads: [] };
    let currentSort = { key: 'user_timestamp', order: 'asc' };
    let filteredThreads = [];
    let currentModalIndex = -1;
    let currentPage = 1;
    const itemsPerPage = 20;
    let selectedUrls = new Set();

    // --- File Handling ---
    fileDropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    fileDropArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); fileDropArea.classList.add('dragover'); });
    fileDropArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); fileDropArea.classList.remove('dragover'); });
    fileDropArea.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); fileDropArea.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
    saveButton.addEventListener('click', saveFile);
    exportHtmlButton.addEventListener('click', handleExportHtml);

    function handleFile(file) {
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    db = JSON.parse(e.target.result);
                    if (!db.tags) db.tags = [];
                    if (!db.threads) db.threads = [];
                    fileDropArea.classList.add('hidden');
                    controls.classList.remove('hidden');
                    paginationContainer.classList.remove('hidden');
                    batchEditBar.classList.remove('hidden');
                    saveButton.disabled = false;
                    exportHtmlButton.disabled = false;
                    tagManagementButton.disabled = false;
                    render();
                } catch (err) { alert('JSONファイルの解析に失敗しました。'); }
            };
            reader.readAsText(file);
        } else { alert('JSONファイルを選択してください。'); }
    }

    function saveFile() {
        if(currentModalIndex !== -1) saveModalData();
        const dataStr = JSON.stringify(db, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fav_database.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // --- Event Listeners for Controls ---
    [keywordSearch, tagFilterMode, filterUntagged, filterNoDesc].forEach(el => {
        el.addEventListener('change', () => { currentPage = 1; render(); });
    });
    keywordSearch.addEventListener('input', () => { currentPage = 1; render(); });

    resetFilterBtn.addEventListener('click', () => {
        keywordSearch.value = '';
        tagFilterMode.value = 'AND';
        filterUntagged.checked = false;
        filterNoDesc.checked = false;
        document.querySelectorAll('#tag-checkboxes input:checked').forEach(cb => cb.checked = false);
        currentPage = 1;
        selectedUrls.clear();
        document.querySelectorAll('.details-row, .card-details').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.details-toggle').forEach(btn => btn.classList.remove('expanded'));
        updateToggleAllButtonState();
        render();
    });
    toggleAllDetailsBtn.addEventListener('click', toggleAllDetails);
    
    helpButton.addEventListener('click', () => {
        document.body.classList.add('modal-open');
        helpModal.classList.remove('hidden');
    });
    helpModalClose.addEventListener('click', () => {
        document.body.classList.remove('modal-open');
        helpModal.classList.add('hidden');
    });
    helpModal.addEventListener('click', (e) => {
        if(e.target === helpModal) {
            document.body.classList.remove('modal-open');
            helpModal.classList.add('hidden');
        }
    });

    // --- Tag Multi-select Logic ---
    tagMultiselect.addEventListener('click', (e) => {
        if (!e.target.matches('input[type="checkbox"]')) {
             tagCheckboxesContainer.style.display = tagCheckboxesContainer.style.display === 'block' ? 'none' : 'block';
        }
    });
    document.addEventListener('click', (e) => {
        if (!tagMultiselect.contains(e.target)) {
            tagCheckboxesContainer.style.display = 'none';
        }
    });
    function updateTagFilterDropdown() {
        const selectedTags = new Set(Array.from(document.querySelectorAll('#tag-checkboxes input:checked')).map(cb => cb.value));
        tagCheckboxesContainer.innerHTML = '';
        db.tags.forEach(tag => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = tag;
            if (selectedTags.has(tag)) checkbox.checked = true;
            checkbox.addEventListener('change', () => { currentPage = 1; render(); });
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${tag}`));
            tagCheckboxesContainer.appendChild(label);
        });
    }

    // --- Main Render Function ---
    function render() {
        const expandedUrls = new Set();
        document.querySelectorAll('.details-row:not(.hidden), .card-details:not(.hidden)').forEach(el => {
            expandedUrls.add(el.dataset.detailsUrl);
        });

        applyFiltersAndSort();

        const totalPages = Math.ceil(filteredThreads.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedThreads = filteredThreads.slice(startIndex, endIndex);

        const isSP = window.matchMedia('(max-width: 767px)').matches;
        
        if (isSP) {
            document.getElementById('data-table').style.display = 'none';
            document.getElementById('card-list').style.display = 'block';
            renderCards(paginatedThreads, expandedUrls, startIndex);
        } else {
            document.getElementById('data-table').style.display = 'table';
            document.getElementById('card-list').style.display = 'none';
            renderTable(paginatedThreads, expandedUrls, startIndex);
        }
        
        renderPagination(totalPages);
        statusBar.textContent = `全${db.threads.length}件中 ${filteredThreads.length}件がヒット ( ${startIndex + 1}-${Math.min(endIndex, filteredThreads.length)}件を表示 )`;
        updateTagFilterDropdown();
        updateSortHeaders();
        updateToggleAllButtonState();
        updateBatchEditBar();
    }
    
    function applyFiltersAndSort() {
        let threads = [...db.threads];
        const keyword = keywordSearch.value.toLowerCase();
        if (keyword) {
            threads = threads.filter(t => t.title.toLowerCase().includes(keyword));
        }
        const selectedTags = Array.from(document.querySelectorAll('#tag-checkboxes input:checked')).map(cb => cb.value);
        if (selectedTags.length > 0) {
            if (tagFilterMode.value === 'AND') {
                threads = threads.filter(t => t.tags && selectedTags.every(tag => t.tags.includes(tag)));
            } else { // OR
                threads = threads.filter(t => t.tags && selectedTags.some(tag => t.tags.includes(tag)));
            }
        }
        if (filterUntagged.checked) {
            threads = threads.filter(t => !t.tags || t.tags.length === 0);
        }
        if (filterNoDesc.checked) {
            threads = threads.filter(t => !t.description || t.description.trim() === '');
        }

        threads.sort((a, b) => {
            const valA = a[currentSort.key] || '';
            const valB = b[currentSort.key] || '';
            if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
        
        filteredThreads = threads;
    }

    const SVG_CARET = `<svg class="icon-caret" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"></path></svg>`;
    const SVG_PENCIL = `<svg class="icon-pencil" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>`;

    function renderTable(threadsToRender, expandedUrls, startIndex) {
        tableBody.innerHTML = '';
        threadsToRender.forEach((thread, index) => {
            const tr = document.createElement('tr');
            tr.classList.add('data-row');
            tr.dataset.url = thread.url;
            
            tr.innerHTML = `
                <td class="col-select"><input type="checkbox" class="row-checkbox" data-url="${thread.url}" ${selectedUrls.has(thread.url) ? 'checked' : ''}></td>
                <td class="col-no">${startIndex + index + 1}</td>
                <td class="col-datetime editable" data-field="user_timestamp">${thread.user_timestamp || ''}</td>
                <td class="col-title"><a href="${thread.url}" target="_blank">${thread.title}</a></td>
                <td class="col-tags"></td>
                <td class="col-actions">
                    <div class="action-buttons">
                        <button class="action-button details-toggle" data-url="${thread.url}">${SVG_CARET}</button>
                        <button class="action-button edit-button" data-index="${startIndex + index}">${SVG_PENCIL}</button>
                    </div>
                </td>
            `;

            renderTags(tr.querySelector('.col-tags'), thread);
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
    }
    function renderCards(threadsToRender, expandedUrls, startIndex) {
        cardList.innerHTML = '';
        threadsToRender.forEach((thread, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.url = thread.url;

            card.innerHTML = `
                <div class="col-select">
                    <input type="checkbox" class="row-checkbox" data-url="${thread.url}" ${selectedUrls.has(thread.url) ? 'checked' : ''}>
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <span>No.${startIndex + index + 1}</span>
                        <span>${thread.user_timestamp || ''}</span>
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

            renderTags(card.querySelector('.card-tags'), thread);
            
            const details = card.querySelector('.card-details');
            if (expandedUrls.has(thread.url)) {
                card.querySelector('.details-toggle').classList.add('expanded');
            } else {
                details.classList.add('hidden');
            }

            cardList.appendChild(card);
        });
    }
    
    function renderPagination(totalPages) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;
        const createButton = (text, page, disabled = false) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.disabled = disabled;
            btn.onclick = () => { currentPage = page; render(); };
            return btn;
        };
        paginationContainer.appendChild(createButton('<< 最初', 1, currentPage === 1));
        paginationContainer.appendChild(createButton('< 前へ', currentPage - 1, currentPage === 1));
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `${currentPage} / ${totalPages}ページ`;
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(createButton('次へ >', currentPage + 1, currentPage === totalPages));
        paginationContainer.appendChild(createButton('最後 >>', totalPages, currentPage === totalPages));
    }
    document.querySelectorAll('#data-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (currentSort.key === key) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.key = key;
                currentSort.order = 'asc';
            }
            currentPage = 1;
            render();
        });
    });
    function updateSortHeaders() {
        document.querySelectorAll('#data-table th.sortable').forEach(th => {
            let headerText = "";
            if (th.dataset.sort === 'user_timestamp') headerText = '日時';
            if (th.dataset.sort === 'title') headerText = 'タイトル';
            
            let arrowSpan = th.querySelector('.sort-arrow');
            if (!arrowSpan) {
                arrowSpan = document.createElement('span');
                arrowSpan.className = 'sort-arrow';
                th.textContent = headerText;
                th.appendChild(arrowSpan);
            }

            let arrow = '';
            if(currentSort.key === th.dataset.sort) {
                arrow = currentSort.order === 'asc' ? '▲' : '▼';
            }
            arrowSpan.textContent = arrow;
        });
    }
    dataContainer.addEventListener('click', handleTableClick);
    function handleTableClick(e) {
        const rowCheckbox = e.target.closest('.row-checkbox');
        if (rowCheckbox) {
            if (rowCheckbox.checked) {
                selectedUrls.add(rowCheckbox.dataset.url);
            } else {
                selectedUrls.delete(rowCheckbox.dataset.url);
            }
            updateBatchEditBar();
            return;
        }

        const detailsToggle = e.target.closest('.details-toggle');
        const editableCell = e.target.closest('.editable');
        const descDisplay = e.target.closest('.description-display');
        const tag = e.target.closest('.tag');
        const editButton = e.target.closest('.edit-button');
        if (detailsToggle) toggleDetails(detailsToggle);
        else if (editableCell) makeEditable(editableCell);
        else if (descDisplay) makeDescriptionEditable(descDisplay);
        else if (tag) openTagEditor(tag, tag.closest('[data-url]').dataset.url);
        else if (editButton) openEditModal(parseInt(editButton.dataset.index, 10));
    }
    function toggleDetails(button) {
        const url = button.dataset.url;
        const detailsElements = document.querySelectorAll(`[data-details-url="${url}"]`);
        detailsElements.forEach(el => el.classList.toggle('hidden'));
        const isHidden = detailsElements[0].classList.contains('hidden');
        document.querySelectorAll(`.details-toggle[data-url="${url}"]`).forEach(btn => {
            btn.classList.toggle('expanded', !isHidden);
        });
        updateToggleAllButtonState();
    }
    function toggleAllDetails() {
        const isExpanding = toggleAllDetailsBtn.textContent === '全て展開';
        document.querySelectorAll('.details-toggle').forEach(btn => {
            const detailsElements = document.querySelectorAll(`[data-details-url="${btn.dataset.url}"]`);
            detailsElements.forEach(el => el.classList.toggle('hidden', !isExpanding));
            btn.classList.toggle('expanded', isExpanding);
        });
        toggleAllDetailsBtn.textContent = isExpanding ? '全て畳む' : '全て展開';
    }
    function updateToggleAllButtonState() {
        const allDetails = document.querySelectorAll('.details-row, .card-details');
        if (allDetails.length === 0) {
            toggleAllDetailsBtn.textContent = '全て展開';
            return;
        };
        const isAnyHidden = Array.from(allDetails).some(el => el.classList.contains('hidden'));
        toggleAllDetailsBtn.textContent = isAnyHidden ? '全て展開' : '全て畳む';
    }
    function makeEditable(cell) {
        if (cell.querySelector('input')) return;
        const originalText = cell.textContent.trim();
        const url = cell.closest('[data-url]').dataset.url;
        const field = cell.dataset.field;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        const save = () => {
            const thread = db.threads.find(t => t.url === url);
            if (thread) thread[field] = input.value;
            render();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.removeEventListener('blur', save); render(); } });
    }
    function makeDescriptionEditable(div) {
        const originalText = div.textContent === 'クリックして説明を追加...' ? '' : div.textContent;
        const url = div.closest('[data-details-url]').dataset.detailsUrl;
        const textarea = document.createElement('textarea');
        textarea.value = originalText;
        textarea.className = 'description-edit';
        div.replaceWith(textarea);
        textarea.focus();
        const save = () => {
             const thread = db.threads.find(t => t.url === url);
             if (thread) thread.description = textarea.value;
             render();
        };
        textarea.addEventListener('blur', save);
    }
    function renderTags(cell, thread) {
        cell.innerHTML = '';
        (thread.tags || []).forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.textContent = tag;
            cell.appendChild(tagEl);
        });
        const addTagEl = document.createElement('span');
        addTagEl.className = 'tag add-tag';
        addTagEl.textContent = '+';
        cell.appendChild(addTagEl);
    }
    let closeTagEditorHandler = null;
    function openTagEditor(target, url) {
        const existingEditor = document.querySelector('.tag-editor');
        if (existingEditor) existingEditor.remove();
        if (closeTagEditorHandler) document.removeEventListener('click', closeTagEditorHandler, true);
        const thread = db.threads.find(t => t.url === url);
        if (!thread) return;
        if (!thread.tags) thread.tags = [];
        const editor = document.createElement('div');
        editor.className = 'tag-editor';
        db.tags.forEach(tag => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = tag; checkbox.checked = thread.tags.includes(tag);
            checkbox.onchange = () => {
                const threadTags = new Set(thread.tags);
                if (checkbox.checked) { threadTags.add(tag); } else { threadTags.delete(tag); }
                thread.tags = Array.from(threadTags).sort();
                render();
            };
            label.appendChild(checkbox); label.appendChild(document.createTextNode(` ${tag}`));
            editor.appendChild(label); editor.appendChild(document.createElement('br'));
        });
        const newTagInput = document.createElement('input');
        newTagInput.type = 'text'; newTagInput.placeholder = '新規タグを追加...';
        newTagInput.onkeydown = (e) => {
            if (e.key === 'Enter' && newTagInput.value.trim()) {
                e.preventDefault();
                const newTag = newTagInput.value.trim();
                if (!db.tags.includes(newTag)) { db.tags.push(newTag); db.tags.sort(); }
                if (!thread.tags.includes(newTag)) { thread.tags.push(newTag); thread.tags.sort(); }
                editor.remove();
                document.removeEventListener('click', closeTagEditorHandler, true);
                render();
            }
        };
        editor.appendChild(newTagInput);
        document.body.appendChild(editor);
        const rect = target.getBoundingClientRect();
        editor.style.left = `${rect.left + window.scrollX}px`; editor.style.top = `${rect.bottom + window.scrollY}px`;
        newTagInput.focus();
        closeTagEditorHandler = (e) => {
            if (!editor.contains(e.target) && !target.closest('.col-tags, .card-tags').contains(e.target)) {
                editor.remove();
                document.removeEventListener('click', closeTagEditorHandler, true);
                closeTagEditorHandler = null;
            }
        };
        setTimeout(() => { document.addEventListener('click', closeTagEditorHandler, true); }, 0);
    }
    // --- Modal Editing ---
    function openEditModal(index) {
        if (index < 0 || index >= filteredThreads.length) return;
        currentModalIndex = index;
        updateModalContent();
        document.body.classList.add('modal-open');
        editModal.classList.remove('hidden');
    }
    function closeEditModal() {
        saveModalData();
        editModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        currentModalIndex = -1;
        render();
    }
    function saveModalData() {
        if (currentModalIndex === -1) return;
        const thread = filteredThreads[currentModalIndex];
        if (!thread) return;
        thread.user_timestamp = modalDatetime.value;
        thread.description = modalDescription.value;
        const selectedTags = new Set();
        modalTagsContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => { selectedTags.add(cb.value); });
        thread.tags = Array.from(selectedTags).sort();
    }
    function updateModalContent() {
        const thread = filteredThreads[currentModalIndex];
        if (!thread) return;
        if (!thread.tags) thread.tags = [];
        modalCounter.textContent = `${currentModalIndex + 1} / ${filteredThreads.length}`;
        modalTitle.textContent = thread.title;
        modalTitle.href = thread.url;
        modalDatetime.value = thread.user_timestamp || '';
        modalDescription.value = thread.description || '';
        modalTagsContainer.innerHTML = '';
        db.tags.forEach(tag => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = tag; checkbox.checked = thread.tags.includes(tag);
            label.appendChild(checkbox); label.appendChild(document.createTextNode(` ${tag}`));
            modalTagsContainer.appendChild(label);
        });
        modalTagsSummary.textContent = `${thread.tags.length}個選択中`;
        modalTagsDetails.open = false;
        modalPrevBtn.disabled = currentModalIndex === 0;
        modalNextBtn.disabled = currentModalIndex === filteredThreads.length - 1;
    }
    function setupModalEvents() {
        modalClose.addEventListener('click', closeEditModal);
        editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
        modalPrevBtn.addEventListener('click', () => { if (currentModalIndex > 0) { saveModalData(); openEditModal(currentModalIndex - 1); } });
        modalNextBtn.addEventListener('click', () => { if (currentModalIndex < filteredThreads.length - 1) { saveModalData(); openEditModal(currentModalIndex + 1); } });
        modalTagsDetails.addEventListener('toggle', (e) => {
             const thread = filteredThreads[currentModalIndex];
             if(!thread) return;
             const tagCount = (thread.tags || []).length;
             modalTagsSummary.textContent = e.target.open ? '編集中...' : `${tagCount}個選択中`;
        });
        modalNewTag.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && modalNewTag.value.trim()) {
                e.preventDefault();
                saveModalData();
                const newTags = modalNewTag.value.trim().split(',').map(t => t.trim()).filter(Boolean);
                const currentThread = filteredThreads[currentModalIndex];
                if (!currentThread.tags) currentThread.tags = [];
                newTags.forEach(newTag => {
                    if (!db.tags.includes(newTag)) db.tags.push(newTag);
                    if (!currentThread.tags.includes(newTag)) currentThread.tags.push(newTag);
                });
                db.tags.sort();
                modalNewTag.value = '';
                updateModalContent();
            }
        });
    }

    // --- Batch Edit Logic ---
    selectAllCheckbox.addEventListener('change', () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedThreads = filteredThreads.slice(startIndex, endIndex);

        paginatedThreads.forEach(thread => {
            if (selectAllCheckbox.checked) {
                selectedUrls.add(thread.url);
            } else {
                selectedUrls.delete(thread.url);
            }
        });
        render();
    });

    function updateBatchEditBar() {
        const count = selectedUrls.size;
        batchEditButton.textContent = `選択した${count}件を一括編集`;
        batchEditButton.disabled = count === 0;

        const paginatedUrls = new Set(filteredThreads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(t => t.url));
        if (paginatedUrls.size === 0) {
            selectAllCheckbox.checked = false;
            return;
        }
        const allOnPageSelected = Array.from(paginatedUrls).every(url => selectedUrls.has(url));
        selectAllCheckbox.checked = allOnPageSelected;
    }

    batchEditButton.addEventListener('click', () => {
        if (selectedUrls.size === 0) return;
        
        const createTagSelector = (container, summaryEl, allTags) => {
            container.innerHTML = '';
            allTags.forEach(tag => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
                container.appendChild(label);
            });
            
            const updateSummary = () => {
                const selected = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
                summaryEl.textContent = selected.length > 0 ? selected.join(', ') : 'なし';
            };

            container.addEventListener('change', updateSummary);
            updateSummary();
        };
        
        batchEditInfo.textContent = `選択中の${selectedUrls.size}件のスレッドを編集します。`;
        
        createTagSelector(
            document.getElementById('batch-add-tags-list'),
            document.querySelector('#batch-add-tags-list').previousElementSibling.querySelector('.selected-tags-summary'), 
            db.tags
        );
        createTagSelector(
            document.getElementById('batch-remove-tags-list'),
            document.querySelector('#batch-remove-tags-list').previousElementSibling.querySelector('.selected-tags-summary'), 
            db.tags
        );

        document.body.classList.add('modal-open');
        batchEditModal.classList.remove('hidden');
    });

    batchEditExecute.addEventListener('click', () => {
        const tagsToAdd = Array.from(document.querySelectorAll('#batch-add-tags-list input:checked')).map(cb => cb.value);
        const tagsToRemove = Array.from(document.querySelectorAll('#batch-remove-tags-list input:checked')).map(cb => cb.value);

        const conflict = tagsToAdd.find(tag => tagsToRemove.includes(tag));
        if (conflict) {
            alert(`エラー: 「${conflict}」が追加と削除の両方に指定されています。`);
            return;
        }

        db.threads.forEach(thread => {
            if (selectedUrls.has(thread.url)) {
                if (!thread.tags) thread.tags = [];
                const tagSet = new Set(thread.tags);
                tagsToAdd.forEach(tag => tagSet.add(tag));
                tagsToRemove.forEach(tag => tagSet.delete(tag));
                thread.tags = Array.from(tagSet).sort();
            }
        });

        closeBatchEditModal();
        selectedUrls.clear();
        render();
    });
    batchEditCancel.addEventListener('click', closeBatchEditModal);
    batchEditModal.addEventListener('click', (e) => { if(e.target === batchEditModal) closeBatchEditModal(); });
    function closeBatchEditModal() {
        document.body.classList.remove('modal-open');
        batchEditModal.classList.add('hidden');
    }
    // --- Tag Management Logic ---
    tagManagementButton.addEventListener('click', () => {
        renderTagManagementTable();
        document.body.classList.add('modal-open');
        tagManagementModal.classList.remove('hidden');
    });

    function renderTagManagementTable() {
        tagManagementTableBody.innerHTML = '';
        const tagCounts = db.threads.reduce((acc, thread) => {
            (thread.tags || []).forEach(tag => {
                acc[tag] = (acc[tag] || 0) + 1;
            });
            return acc;
        }, {});

        db.tags.forEach(tag => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="tag-name">${tag}</span></td>
                <td>${tagCounts[tag] || 0}</td>
                <td>
                    <button class="rename-tag-btn">名前変更</button>
                    <button class="delete-tag-btn">削除</button>
                </td>
            `;
            tagManagementTableBody.appendChild(tr);
        });
    }

    tagManagementTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const tr = target.closest('tr');
        if (!tr) return;
        const tagNameSpan = tr.querySelector('.tag-name');
        if (!tagNameSpan) return;
        const oldTagName = tagNameSpan.textContent;

        if (target.classList.contains('rename-tag-btn')) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = oldTagName;
            tagNameSpan.replaceWith(input);
            input.focus();

            const saveChange = () => {
                const newTagName = input.value.trim();
                if (newTagName && newTagName !== oldTagName) {
                    if (db.tags.includes(newTagName)) {
                        if (confirm(`タグ「${newTagName}」は既に存在します。タグ「${oldTagName}」を「${newTagName}」に統合しますか？`)) {
                            db.threads.forEach(thread => {
                                const tagSet = new Set(thread.tags || []);
                                if (tagSet.has(oldTagName)) {
                                    tagSet.delete(oldTagName);
                                    tagSet.add(newTagName);
                                    thread.tags = Array.from(tagSet).sort();
                                }
                            });
                            db.tags = db.tags.filter(t => t !== oldTagName);
                        }
                    } else {
                        db.threads.forEach(thread => {
                            if (thread.tags && thread.tags.includes(oldTagName)) {
                                thread.tags = thread.tags.map(t => t === oldTagName ? newTagName : t).sort();
                            }
                        });
                        db.tags = db.tags.map(t => t === oldTagName ? newTagName : t).sort();
                    }
                }
                renderTagManagementTable();
                render();
            };

            input.addEventListener('blur', saveChange);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
        } else if (target.classList.contains('delete-tag-btn')) {
            if (confirm(`タグ「${oldTagName}」を削除しますか？このタグはすべてのスレッドから削除されます。`)) {
                db.tags = db.tags.filter(t => t !== oldTagName);
                db.threads.forEach(thread => {
                    if (thread.tags) {
                        thread.tags = thread.tags.filter(t => t !== oldTagName);
                    }
                });
                renderTagManagementTable();
                render();
            }
        }
    });

    tagManagementClose.addEventListener('click', () => {
        document.body.classList.remove('modal-open');
        tagManagementModal.classList.add('hidden');
    });
    tagManagementModal.addEventListener('click', (e) => {
        if(e.target === tagManagementModal) {
            document.body.classList.remove('modal-open');
            tagManagementModal.classList.add('hidden');
        }
    });

    // --- Export HTML Logic ---
    function handleExportHtml() {
        applyFiltersAndSort(); // Make sure filteredThreads is up-to-date with current sort
        const threadsToExport = filteredThreads;

        const bodyContent = threadsToExport.map((thread, index) => {
            const tagsHtml = (thread.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
            const descriptionHtml = thread.description ? `<div class="description">${thread.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>` : '';
            return `
                <div class="card">
                    <div class="card-header">
                        <span>No.${index + 1}</span>
                        <span>${thread.user_timestamp || ''}</span>
                    </div>
                    <div class="card-title"><a href="${thread.url}" target="_blank">${thread.title}</a></div>
                    <div class="card-tags">${tagsHtml}</div>
                    ${descriptionHtml ? `<details class="card-details" open><summary>説明</summary>${descriptionHtml}</details>` : ''}
                </div>
            `;
        }).join('');

        const exportDate = new Date().toLocaleString('ja-JP');

        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>お気に入りスレッド一覧</title>
    <style>
        body { font-family: sans-serif; margin: 0; background-color: #f0f0f0; color: #333; }
        header { background-color: #333; color: white; padding: 1rem; text-align: center; }
        main { padding: 1rem; max-width: 800px; margin: 0 auto; }
        .card { background: #fff; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 10px; padding: 10px; }
        .card-header { display: flex; justify-content: space-between; color: #666; font-size: 0.8em; margin-bottom: 8px; }
        .card-title { font-weight: bold; margin-bottom: 8px; }
        .card-title a { color: #007bff; text-decoration: none; }
        .card-title a:hover { text-decoration: underline; }
        .card-tags { margin-bottom: 8px; }
        .tag { display: inline-block; background-color: #e0e0e0; padding: 2px 8px; border-radius: 12px; margin: 2px; font-size: 0.8em; }
        .card-details { margin-top: 8px; }
        .card-details summary { cursor: pointer; font-size: 0.9em; font-weight: bold; }
        .description { white-space: pre-wrap; word-break: break-all; background: #f9f9f9; padding: 8px; border-radius: 4px; margin-top: 5px; }
    </style>
</head>
<body>
    <header><h1>お気に入りスレッド一覧</h1><p>(エクスポート日時: ${exportDate})</p></header>
    <main>${bodyContent}</main>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Initial setup ---
    window.addEventListener('resize', render);
    setupModalEvents();
    handleResize(); // Initial responsive check
});