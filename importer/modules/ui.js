/**
 * インポーター用UIモジュール (Namespace: FavTool.Importer.UI)
 */
(function () {
    window.FavTool = window.FavTool || {};
    window.FavTool.Importer = window.FavTool.Importer || {};

    const UI = {
        setupDropArea: function (area, input, onSelect) {
            area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
            area.addEventListener('dragleave', () => area.classList.remove('dragover'));
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('dragover');
                onSelect(e.dataTransfer.files);
            });
            input.addEventListener('change', (e) => onSelect(e.target.files));
        },

        showConflictModal: function (threadA, threadB, current, total) {
            return new Promise((resolve) => {
                const modal = document.getElementById('conflict-modal');
                const titleEl = document.getElementById('conflict-title');
                const bodyEl = document.getElementById('conflict-body');

                const A = { title: threadA.title || '', desc: threadA.description || '' };
                const B = { title: threadB.title || '', desc: threadB.description || '' };

                const isTitleConflict = A.title && B.title && A.title !== B.title;
                const isDescConflict = A.desc && B.desc && A.desc !== B.desc;

                titleEl.textContent = `データ競合の解決 (${current}/${total}件目)`;

                let bodyHtml = `
                    <p class="conflict-thread-info">スレッド: ${A.title || B.title}</p>
                    <p class="conflict-note">※タグは自動で統合されます。</p>
                `;

                const createComparison = (label, valA, valB, key) => `
                    <div class="conflict-section">
                        <div class="conflict-section-title">■ ${label}</div>
                        <div class="conflict-radio-group">
                            <label><input type="radio" name="${key}" value="A" checked> <strong>既存DB:</strong><pre>${valA}</pre></label>
                            <label><input type="radio" name="${key}" value="B"> <strong>追加ファイル:</strong><pre>${valB}</pre></label>
                        </div>
                    </div>`;

                if (isTitleConflict) bodyHtml += createComparison('タイトル', A.title, B.title, 'title');
                if (isDescConflict) bodyHtml += createComparison('説明文', A.desc, B.desc, 'desc');

                bodyHtml += `<div class="modal-footer"><button id="resolve-conflict">この内容で解決</button></div>`;

                bodyEl.innerHTML = bodyHtml;
                modal.classList.remove('hidden');

                document.getElementById('resolve-conflict').onclick = () => {
                    const resultTitle = isTitleConflict
                        ? (document.querySelector('input[name="title"]:checked').value === 'A' ? A.title : B.title)
                        : A.title;

                    const resultDesc = isDescConflict
                        ? (document.querySelector('input[name="desc"]:checked').value === 'A' ? A.desc : B.desc)
                        : A.desc;

                    threadA.title = resultTitle;
                    threadA.description = resultDesc;

                    modal.classList.add('hidden');
                    resolve(threadA);
                };
            });
        },

        showError: function (message) {
            const errorMsg = document.getElementById('error-message');
            errorMsg.textContent = message;
            errorMsg.classList.remove('hidden');
            setTimeout(() => errorMsg.classList.add('hidden'), 5000);
        },

        toggleProcessing: function (isProcessing) {
            document.querySelectorAll('#download-button, #sp-download-button').forEach(btn => btn.disabled = isProcessing);
            document.querySelectorAll('#processing-indicator, #processing-indicator-sp').forEach(el => el.classList.toggle('hidden', !isProcessing));
        }
    };

    FavTool.Importer.UI = UI;
})();
