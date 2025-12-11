document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let baseDb = { tags: [], threads: [] };
    let filesToProcess = [];

    // --- DOM Elements ---
    const pcLayout = document.getElementById('pc-layout');
    const spLayout = document.getElementById('sp-layout');
    const dbDropArea = document.getElementById('db-drop-area');
    const dbFileInput = document.getElementById('db-file-input');
    const dbInfo = document.getElementById('db-info');
    const addDropArea = document.getElementById('add-drop-area');
    const addFileInput = document.getElementById('add-file-input');
    const addInfo = document.getElementById('add-info');
    const downloadButton = document.getElementById('download-button');
    const processingIndicator = document.getElementById('processing-indicator');
    
    // SP elements
    const spDbDropArea = document.getElementById('sp-db-drop-area');
    const spDbFileInput = document.getElementById('sp-db-file-input');
    const spDbInfo = document.getElementById('sp-db-info');
    const spAddDropArea = document.getElementById('sp-add-drop-area');
    const spAddFileInput = document.getElementById('sp-add-file-input');
    const spAddInfo = document.getElementById('sp-add-info');
    const spDownloadButton = document.getElementById('sp-download-button');
    const spProcessingIndicator = document.getElementById('processing-indicator-sp');
    const navButtons = document.querySelectorAll('.nav-button');
    const summaryDbCount = document.getElementById('summary-db-count');
    const summaryAddCount = document.getElementById('summary-add-count');
    const summaryTotalCount = document.getElementById('summary-total-count');
    const errorMsg = document.getElementById('error-message');

    // Conflict Modal
    const conflictModal = document.getElementById('conflict-modal');
    const conflictTitle = document.getElementById('conflict-title');
    const conflictBody = document.getElementById('conflict-body');
    
    // --- Responsive UI Logic ---
    const handleResize = () => {
        const isSp = window.innerWidth < 768;
        document.body.classList.toggle('sp', isSp);
        document.body.classList.toggle('pc', !isSp);
    };

    // --- File Input Setup ---
    const setupDropArea = (area, input, isDb) => {
        area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
        area.addEventListener('dragleave', () => area.classList.remove('dragover'));
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            handleFileSelection(e.dataTransfer.files, isDb);
        });
        input.addEventListener('change', (e) => handleFileSelection(e.target.files, isDb));
    };

    const handleFileSelection = async (files, isDb) => {
        if (!files.length) return;
        if (isDb) {
            if (files.length > 1) return showError("データベースは1つだけ選択してください。");
            if (!files[0].name.endsWith('.json')) return showError("データベースには.jsonファイルを選択してください。");
            try {
                const parsed = await parseFile(files[0]);
                baseDb = parsed;
            } catch (e) {
                showError(e.message);
                return;
            }
        } else {
            filesToProcess = Array.from(files);
        }
        updateUI();
    };

    const parseFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const ext = file.name.split('.').pop().toLowerCase();
            
            reader.onload = (e) => {
                try {
                    let result;
                    if (ext === 'json') {
                        result = JSON.parse(e.target.result);
                        if (typeof result.threads !== 'object' || typeof result.tags !== 'object') {
                            throw new Error("不正なJSON構造です。");
                        }
                    } else if (['html', 'htm', 'mht', 'mhtml'].includes(ext)) {
                        result = parseHtmlContent(e.target.result);
                    } else {
                        throw new Error(`未対応のファイル形式です: ${file.name}`);
                    }
                    resolve({ ...result, source: ext.startsWith('mh') ? 'mht/html' : ext });
                } catch (err) {
                    reject(new Error(`${file.name}の解析に失敗しました: ${err.message}`));
                }
            };
            reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました。"));
            reader.readAsText(file, 'utf-8');
        });
    };
    
    const parseHtmlContent = (htmlString) => {
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        const favDiv = doc.getElementById('favorite');
        if (!favDiv) throw new Error("お気に入りセクション(<div id='favorite'>)が見つかりません。");

        const threads = [];
        const rows = favDiv.querySelectorAll('table tr');
        if (rows.length === 0 && !favDiv.textContent.includes("見つかりませんでした")) {
            throw new Error("お気に入りスレッドのテーブルが見つかりません。");
        }

        rows.forEach((row, index) => {
            if (index === 0) return; // Skip header
            const link = row.querySelector('td:nth-child(1) a');
            const timeCell = row.querySelector('td:nth-child(4)');
            if (link && timeCell) {
                threads.push({
                    url: link.href,
                    title: link.textContent.trim(),
                    tags: [], description: '', add_timestamp: '',
                    user_timestamp: timeCell.textContent.trim().split('(')[0]
                });
            }
        });
        return { tags: [], threads };
    };

    // --- UI Update Logic ---
    const updateUI = () => {
        // Update Base DB info
        dbInfo.textContent = `読み込み済み: ${baseDb.threads.length}件`;
        spDbInfo.textContent = baseDb.threads.length > 0 ? `読込済: ${baseDb.threads.length}件` : '';
        document.querySelector('#step1 .next').textContent = baseDb.threads.length > 0 ? `▶ 次へ (${baseDb.threads.length}件に追加)` : '▶ 次へ (新規作成)';

        // Update Add Files info
        const fileNames = filesToProcess.map(f => `<li>${f.name}</li>`).join('');
        addInfo.innerHTML = filesToProcess.length > 0 ? `<ul>${fileNames}</ul>` : '';
        spAddInfo.innerHTML = addInfo.innerHTML;
        
        const canProcess = filesToProcess.length > 0;
        downloadButton.disabled = !canProcess;
        spDownloadButton.disabled = !canProcess;
        document.querySelector('#step2 .next').disabled = !canProcess;

        if (!canProcess) {
            downloadButton.textContent = '↓ 結合してダウンロード ↓';
            summaryDbCount.textContent = baseDb.threads.length;
            summaryAddCount.textContent = 0;
            summaryTotalCount.textContent = baseDb.threads.length;
        }
    };

    const handleDownload = async () => {
        setProcessing(true);
        try {
            const mergedDb = await processMerge();
            const dataStr = JSON.stringify(mergedDb, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fav_database.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch(e) {
            if (e !== 'conflict_cancelled') {
                showError(e.message || 'マージ処理中にエラーが発生しました。');
            }
        } finally {
            setProcessing(false);
        }
    };

    const setProcessing = (isProcessing) => {
        downloadButton.disabled = isProcessing;
        spDownloadButton.disabled = isProcessing;
        processingIndicator.classList.toggle('hidden', !isProcessing);
        spProcessingIndicator.classList.toggle('hidden', !isProcessing);
    };

    const showError = (message) => {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 5000);
    };

    // --- SP Navigation ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentStep = button.closest('.step');
            const targetStepId = button.dataset.target;
            const targetStep = document.getElementById(targetStepId);

            currentStep.classList.remove('active');
            targetStep.classList.add('active');

            if (targetStepId === 'step3') {
                updateSummary();
            }
        });
    });

    const updateSummary = async () => {
        const existingUrls = new Set(baseDb.threads.map(t => t.url));
        let newCount = 0;
        for (const file of filesToProcess) {
            try {
                const parsed = await parseFile(file);
                parsed.threads.forEach(t => {
                    if (!existingUrls.has(t.url)) {
                        newCount++;
                        existingUrls.add(t.url);
                    }
                });
            } catch (e) {
                showError(e.message);
            }
        }
        summaryDbCount.textContent = baseDb.threads.length;
        summaryAddCount.textContent = newCount;
        summaryTotalCount.textContent = baseDb.threads.length + newCount;
    };
    // --- Merge Logic ---
    const processMerge = async () => {
        let mergedDb = JSON.parse(JSON.stringify(baseDb));

        for (const file of filesToProcess) {
            const additionalData = await parseFile(file);
            const conflicts = [];
            
            const baseThreadsByUrl = new Map(mergedDb.threads.map(t => [t.url, t]));

            for (const addThread of additionalData.threads) {
                const baseThread = baseThreadsByUrl.get(addThread.url);
                if (baseThread) { // URLが重複
                    const result = { ...baseThread };
                    const hasConflict = mergeThread(result, addThread, additionalData.source);
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

            if (conflicts.length > 0) {
                for (let i = 0; i < conflicts.length; i++) {
                    const conflict = conflicts[i];
                    try {
                        const resolvedThread = await showConflictModal(conflict.base, conflict.add, i + 1, conflicts.length);
                        Object.assign(baseThreadsByUrl.get(resolvedThread.url), resolvedThread);
                    } catch (e) {
                         throw e; // Propagate cancellation
                    }
                }
            }
        }
        return mergedDb;
    };

    const mergeThread = (base, add, addSource) => {
        let hasConflict = false;

        // Title
        const titleA = base.title || '';
        const titleB = add.title || '';
        if (addSource === 'mht/html') {
            base.title = titleB; // html/mht is the source of truth
        } else if (titleA !== titleB) {
            if (!titleA) base.title = titleB;
            else if (titleB) hasConflict = true; // Both exist and are different
        }

        // Description
        const descA = base.description || '';
        const descB = add.description || '';
        if (descA !== descB) {
            if (!descA) base.description = descB;
            else if (!descB) { /* keep descA */ }
            else hasConflict = true; // Both exist and are different
        }
        
        // Tags (always merge, no conflict)
        const tags = new Set([...(base.tags || []), ...(add.tags || [])]);
        base.tags = Array.from(tags).sort();
        
        // Timestamps (prefer newer file's timestamp if base is empty)
        base.user_timestamp = base.user_timestamp || add.user_timestamp;
        base.add_timestamp = base.add_timestamp || add.add_timestamp;

        return hasConflict;
    };
    // --- Conflict Modal Logic ---
    const showConflictModal = (threadA, threadB, current, total) => {
        return new Promise((resolve, reject) => {
            const conflictTitleA = threadA.title || '';
            const conflictTitleB = threadB.title || '';
            const conflictDescA = threadA.description || '';
            const conflictDescB = threadB.description || '';
            
            const isTitleConflict = conflictTitleA && conflictTitleB && conflictTitleA !== conflictTitleB;
            const isDescConflict = conflictDescA && conflictDescB && conflictDescA !== conflictDescB;

            conflictTitle.textContent = `データ競合の解決 (${current}/${total}件目)`;
            
            let bodyHtml = `
                <p class="conflict-thread-info">スレッド: ${conflictTitleA || conflictTitleB}</p>
                <p class="conflict-note">※タグは自動で統合されます。</p>
            `;

            if (isTitleConflict && isDescConflict) {
                // --- 複合競合 ---
                bodyHtml += `
                    <div class="conflict-section">
                        <div class="conflict-section-title">■ タイトル</div>
                        <div class="conflict-radio-group" id="title-resolver">
                            <label><input type="radio" name="title" value="A" checked> <strong>バージョンA (既存DB):</strong> ${conflictTitleA}</label>
                            <label><input type="radio" name="title" value="B"> <strong>バージョンB (追加ファイル):</strong> ${conflictTitleB}</label>
                        </div>
                    </div>
                    <div class="conflict-section">
                        <div class="conflict-section-title">■ 説明文</div>
                        <div class="conflict-radio-group" id="desc-resolver">
                            <label><input type="radio" name="desc" value="A" checked> <strong>バージョンA (既存DB):</strong><pre>${conflictDescA}</pre></label>
                            <label><input type="radio" name="desc" value="B"> <strong>バージョンB (追加ファイル):</strong><pre>${conflictDescB}</pre></label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="resolve-composite">この内容で解決</button>
                    </div>
                `;
                conflictBody.innerHTML = bodyHtml;
                
                document.getElementById('resolve-composite').onclick = () => {
                    const chosenTitle = document.querySelector('input[name="title"]:checked').value === 'A' ? conflictTitleA : conflictTitleB;
                    const chosenDesc = document.querySelector('input[name="desc"]:checked').value === 'A' ? conflictDescA : conflictDescB;
                    threadA.title = chosenTitle;
                    threadA.description = chosenDesc;
                    conflictModal.classList.add('hidden');
                    resolve(threadA);
                };

            } else if (isTitleConflict) {
                // --- タイトルのみ競合 ---
                 bodyHtml += `
                    <p>タイトルが異なります。どちらを残しますか？</p>
                    <div class="conflict-comparison">
                        <div class="conflict-version"><h3>バージョンA (既存DB)</h3><p>${conflictTitleA}</p><button data-choice="A">こちらを採用</button></div>
                        <div class="conflict-version"><h3>バージョンB (追加ファイル)</h3><p>${conflictTitleB}</p><button data-choice="B">こちらを採用</button></div>
                    </div>`;
                conflictBody.innerHTML = bodyHtml;

                conflictBody.querySelectorAll('button').forEach(btn => {
                    btn.onclick = () => {
                        threadA.title = btn.dataset.choice === 'A' ? conflictTitleA : conflictTitleB;
                        conflictModal.classList.add('hidden');
                        resolve(threadA);
                    };
                });

            } else { // isDescConflict
                // --- 説明文のみ競合 ---
                bodyHtml += `
                    <p>説明文が異なります。どちらを残しますか？</p>
                    <div class="conflict-comparison">
                        <div class="conflict-version"><h3>バージョンA (既存DB)</h3><pre>${conflictDescA}</pre><button data-choice="A">こちらを採用</button></div>
                        <div class="conflict-version"><h3>バージョンB (追加ファイル)</h3><pre>${conflictDescB}</pre><button data-choice="B">こちらを採用</button></div>
                    </div>`;
                conflictBody.innerHTML = bodyHtml;
                
                conflictBody.querySelectorAll('button').forEach(btn => {
                    btn.onclick = () => {
                        threadA.description = btn.dataset.choice === 'A' ? conflictDescA : conflictDescB;
                        conflictModal.classList.add('hidden');
                        resolve(threadA);
                    };
                });
            }

            conflictModal.classList.remove('hidden');
        });
    };

    // --- Initial Setup ---
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    setupDropArea(dbDropArea, dbFileInput, true);
    setupDropArea(addDropArea, addFileInput, false);
    setupDropArea(spDbDropArea, spDbFileInput, true);
    setupDropArea(spAddDropArea, spAddFileInput, false);
    
    downloadButton.addEventListener('click', handleDownload);
    spDownloadButton.addEventListener('click', handleDownload);
});
// このパートはv0.09でロジックが他のパートに統合されたため、空です。
// 将来の拡張のためにファイル分割の構造は維持します。