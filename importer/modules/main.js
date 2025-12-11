/**
 * インポーター用メインモジュール (Namespace: FavTool.Importer.Main)
 */
document.addEventListener('DOMContentLoaded', () => {
    // Shortcuts
    const UI = FavTool.Importer.UI;
    const Parser = FavTool.Importer.Parser;
    const Merger = FavTool.Importer.Merger;
    const Constants = FavTool.Constants;

    // --- State Management ---
    let baseDb = { tags: [], threads: [] };
    let filesToProcess = [];

    // --- DOM Elements ---
    const dbInfo = document.getElementById('db-info');
    const spDbInfo = document.getElementById('sp-db-info');
    const addInfo = document.getElementById('add-info');
    const spAddInfo = document.getElementById('sp-add-info');
    const summaryDbCount = document.getElementById('summary-db-count');
    const summaryAddCount = document.getElementById('summary-add-count');
    const summaryTotalCount = document.getElementById('summary-total-count');

    // --- Handler Functions ---

    const handleDbSelection = async (files) => {
        if (!files.length) return;
        if (files.length > 1) return UI.showError("データベースは1つだけ選択してください。");
        if (!files[0].name.endsWith('.json')) return UI.showError("データベースには.jsonファイルを選択してください。");
        try {
            const parsed = await Parser.parseFile(files[0]);
            baseDb = parsed;
            updateUI();
        } catch (e) {
            UI.showError(e.message);
        }
    };

    const handleAddFilesSelection = (files) => {
        if (!files.length) return;
        filesToProcess = Array.from(files);
        updateUI();
    };

    const updateUI = () => {
        // Update Base DB info
        dbInfo.textContent = `読み込み済み: ${baseDb.threads.length}件`;
        spDbInfo.textContent = baseDb.threads.length > 0 ? `読込済: ${baseDb.threads.length}件` : '';
        const step1Next = document.querySelector('#step1 .next');
        if (step1Next) step1Next.textContent = baseDb.threads.length > 0 ? `▶ 次へ (${baseDb.threads.length}件に追加)` : '▶ 次へ (新規作成)';

        // Update Add Files info
        const fileNames = filesToProcess.map(f => `<li>${f.name}</li>`).join('');
        const infoHtml = filesToProcess.length > 0 ? `<ul>${fileNames}</ul>` : '';
        addInfo.innerHTML = infoHtml;
        spAddInfo.innerHTML = infoHtml;

        const canProcess = filesToProcess.length > 0;
        const dlBtn = document.getElementById('download-button');
        const spDlBtn = document.getElementById('sp-download-button');
        const step2Next = document.querySelector('#step2 .next');

        if (dlBtn) dlBtn.disabled = !canProcess;
        if (spDlBtn) spDlBtn.disabled = !canProcess;
        if (step2Next) step2Next.disabled = !canProcess;

        if (!canProcess) {
            if (dlBtn) dlBtn.textContent = '↓ 結合してダウンロード ↓';
            if (summaryDbCount) summaryDbCount.textContent = baseDb.threads.length;
            if (summaryAddCount) summaryAddCount.textContent = 0;
            if (summaryTotalCount) summaryTotalCount.textContent = baseDb.threads.length;
        }
    };

    const handleDownload = async () => {
        UI.toggleProcessing(true);
        try {
            const mergedDb = await Merger.processMerge(baseDb, filesToProcess, UI.showConflictModal);

            const dataStr = JSON.stringify(mergedDb, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = Constants.DB_FILE_NAME;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            if (e !== 'conflict_cancelled') {
                UI.showError(e.message || 'マージ処理中にエラーが発生しました。');
            }
        } finally {
            UI.toggleProcessing(false);
        }
    };

    const handleResize = () => {
        const isSp = window.innerWidth < 768;
        document.body.classList.toggle('sp', isSp);
        document.body.classList.toggle('pc', !isSp);
    };

    const updateSummary = async () => {
        const existingUrls = new Set(baseDb.threads.map(t => t.url));
        let newCount = 0;
        for (const file of filesToProcess) {
            try {
                const parsed = await Parser.parseFile(file);
                parsed.threads.forEach(t => {
                    if (!existingUrls.has(t.url)) {
                        newCount++;
                        existingUrls.add(t.url);
                    }
                });
            } catch (e) {
                console.warn(e);
            }
        }
        if (summaryDbCount) summaryDbCount.textContent = baseDb.threads.length;
        if (summaryAddCount) summaryAddCount.textContent = newCount;
        if (summaryTotalCount) summaryTotalCount.textContent = baseDb.threads.length + newCount;
    };


    // --- Initialization ---

    // UI Setup
    UI.setupDropArea(document.getElementById('db-drop-area'), document.getElementById('db-file-input'), handleDbSelection);
    UI.setupDropArea(document.getElementById('add-drop-area'), document.getElementById('add-file-input'), handleAddFilesSelection);

    // SP UI Setup
    const spDbDrop = document.getElementById('sp-db-drop-area');
    if (spDbDrop) UI.setupDropArea(spDbDrop, document.getElementById('sp-db-file-input'), handleDbSelection);
    const spAddDrop = document.getElementById('sp-add-drop-area');
    if (spAddDrop) UI.setupDropArea(spAddDrop, document.getElementById('sp-add-file-input'), handleAddFilesSelection);

    // Buttons
    document.getElementById('download-button').addEventListener('click', handleDownload);
    const spDlBtn = document.getElementById('sp-download-button');
    if (spDlBtn) spDlBtn.addEventListener('click', handleDownload);

    // SP Navigation
    document.querySelectorAll('.nav-button').forEach(button => {
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

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call to set classes
});
