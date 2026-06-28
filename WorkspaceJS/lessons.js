// ============================================================
// NOTION-STYLE LESSON ENGINE (FULLY REWRITTEN FOR RELIABILITY)
// ============================================================

console.log('📚 lessons.js loaded successfully');

// ----- Default Data -----
const DEFAULT_HUB_STATE = {
    folders: [
        { id: "folder_codes", title: "Codes", pageIds: [] },
        { id: "folder_teachers", title: "Teachers Codes", pageIds: [] },
        { id: "folder_fun", title: "Fun Codes", pageIds: [] }
    ],
    pages: {},
    activePageId: null
};

// ----- State Loading -----
function loadHubState() {
    try {
        const stored = localStorage.getItem("hubState");
        if (stored) return JSON.parse(stored);
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_HUB_STATE));
}

let hubState = loadHubState();
let collapsedFolders = JSON.parse(localStorage.getItem("collapsedFolders") || "{}");
let currentSearchQuery = '';

function saveHubState() {
    localStorage.setItem("hubState", JSON.stringify(hubState));
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
}
function saveCollapsedFolders() {
    localStorage.setItem("collapsedFolders", JSON.stringify(collapsedFolders));
}

// ----- Main Refresh -----
function refreshWorkspace() {
    console.log('🔄 Refreshing workspace...');
    saveHubState();
    renderTreeSidebar();
    renderCurriculumLedger();
}

// ----- Full-Text Search Across Lessons -----
function searchLessons(query) {
    currentSearchQuery = query.trim().toLowerCase();

    const resultsContainer = document.getElementById("lessonSearchResults");
    const treeContainer = document.getElementById("dynamic-lesson-tree");

    if (!resultsContainer || !treeContainer) return;

    const trimmedQuery = query.trim().toLowerCase();

    // Clear search results if query is empty
    if (!trimmedQuery) {
        currentSearchQuery = '';
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
        treeContainer.style.display = '';
        // Re-render ledger to clear highlights
        renderCurriculumLedger();
        return;
    }

    // Search through all pages and their blocks
    const matches = [];
    Object.entries(hubState.pages).forEach(([pageId, page]) => {
        let pageMatch = false;
        let matchedBlocks = [];

        // Check page title
        if (page.title.toLowerCase().includes(trimmedQuery)) {
            pageMatch = true;
        }

        // Check block content
        page.blocks.forEach((block, idx) => {
            if (block.content && block.content.toLowerCase().includes(trimmedQuery)) {
                matchedBlocks.push({ index: idx, content: block.content });
                pageMatch = true;
            }
        });

        if (pageMatch) {
            // Find folder for this page
            let folderTitle = '';
            hubState.folders.forEach(folder => {
                if (folder.pageIds.includes(pageId)) {
                    folderTitle = folder.title;
                }
            });

            matches.push({
                pageId,
                title: page.title,
                folderTitle,
                matchedBlocks: matchedBlocks.slice(0, 3) // Show first 3 matching blocks
            });
        }
    });

    // Hide tree and show results
    treeContainer.style.display = 'none';
    resultsContainer.style.display = 'block';

    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 12px; color: var(--text-muted); text-align: center;">No results found</div>';
        return;
    }

    // Build results HTML
    resultsContainer.innerHTML = matches.map(match => `
        <div class="search-result-item" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background 0.15s;"
             onmouseover="this.style.background='var(--bg-hover)'"
             onmouseout="this.style.background='transparent'"
             onclick="openSearchResult('${match.pageId}')">
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                📄 ${highlightMatch(match.title, trimmedQuery)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">
                📁 ${match.folderTitle}
            </div>
            ${match.matchedBlocks.length > 0 ? `
                <div style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 8px; border-left: 2px solid var(--accent-color);">
                    ${match.matchedBlocks.map(block => `
                        <div style="margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${highlightMatch(block.content, trimmedQuery)}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark style="background: rgba(168, 85, 247, 0.3); color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function openSearchResult(pageId) {
    const resultsContainer = document.getElementById("lessonSearchResults");
    const searchInput = document.getElementById("lessonSearchInput");

    // Clear search
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    if (searchInput) {
        searchInput.value = '';
    }

    // Show tree again
    const treeContainer = document.getElementById("dynamic-lesson-tree");
    if (treeContainer) {
        treeContainer.style.display = '';
    }

    // Open the page
    hubState.activePageId = pageId;
    refreshWorkspace();

    // Close mobile sidebar
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open', 'open');

    // Re-apply highlights after render
    setTimeout(() => highlightSearchResultsInLedger(), 100);
}

// ----- Context Menu for Lesson Tree -----
function showLessonContextMenu(e, context) {
    const menu = document.getElementById('lessonContextMenu');
    if (!menu) return;

    // Build menu items based on context
    let items = [];

    if (context.type === 'root' || context.type === 'folder') {
        // New Folder option (always available)
        items.push({ label: '📁 New Folder', action: 'createFolder' });
        if (context.type === 'folder') {
            items.push({ label: '📄 New Page inside "' + context.folderTitle + '"', action: 'createPage', folderId: context.folderId });
        }
    }

    if (context.type === 'folder') {
        items.push({ label: '✏️ Rename Folder', action: 'renameFolder', folderId: context.folderId, currentName: context.folderTitle });
        items.push({ label: '🗑️ Delete Folder', action: 'deleteFolder', folderId: context.folderId, currentName: context.folderTitle });
    }

    if (context.type === 'page') {
        items.push({ label: '✏️ Rename Page', action: 'renamePage', pageId: context.pageId, currentName: context.pageTitle });
        items.push({ label: '🗑️ Delete Page', action: 'deletePage', pageId: context.pageId, folderId: context.folderId });
    }

    // If no items (shouldn't happen), hide menu
    if (items.length === 0) {
        menu.style.display = 'none';
        return;
    }

    // Build HTML
    let html = '';
    items.forEach((item, index) => {
        if (index > 0 && (item.action === 'createFolder' || item.action === 'createPage')) {
            // Add a divider before creation actions for separation
            html += `<div class="menu-divider"></div>`;
        }
        html += `<div class="menu-item" data-action="${item.action}" data-folderid="${item.folderId || ''}" data-pageid="${item.pageId || ''}" data-currentname="${item.currentName || ''}">${item.label}</div>`;
    });
    menu.innerHTML = html;

    // Position the menu
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.display = 'block';

    // Click handlers
    menu.querySelectorAll('.menu-item').forEach(el => {
        el.addEventListener('click', function() {
            const action = this.dataset.action;
            const folderId = this.dataset.folderid;
            const pageId = this.dataset.pageid;
            const currentName = this.dataset.currentname || '';

            switch(action) {
                case 'createFolder':
                    const folderName = prompt('Enter new folder name:');
                    if (folderName && folderName.trim()) {
                        const id = `folder_${Date.now()}`;
                        hubState.folders.push({ id, title: folderName.trim(), pageIds: [] });
                        refreshWorkspace();
                        showToast(`✅ Folder "${folderName.trim()}" created!`, 'success');
                    }
                    break;
                case 'createPage':
                    const pageTitle = prompt('Enter new page title:');
                    if (pageTitle && pageTitle.trim()) {
                        const folder = hubState.folders.find(f => f.id === folderId);
                        if (!folder) { showToast('Folder not found.', 'error'); return; }
                        const id = `page_${Date.now()}`;
                        hubState.pages[id] = { title: pageTitle.trim(), blocks: [] };
                        folder.pageIds.push(id);
                        hubState.activePageId = id;
                        refreshWorkspace();
                        showToast(`✅ Page "${pageTitle.trim()}" created!`, 'success');
                    }
                    break;
                case 'renameFolder':
                    const newFolderName = prompt('Rename folder to:', currentName);
                    if (newFolderName && newFolderName.trim()) {
                        const folder = hubState.folders.find(f => f.id === folderId);
                        if (folder) {
                            folder.title = newFolderName.trim();
                            saveHubState();
                            refreshWorkspace();
                            showToast(`✅ Folder renamed to "${newFolderName.trim()}"`, 'success');
                        }
                    }
                    break;
                case 'deleteFolder':
                    if (confirm(`Delete folder "${currentName}" and all its pages?`)) {
                        const folder = hubState.folders.find(f => f.id === folderId);
                        if (folder) {
                            // Remove all pages in this folder
                            folder.pageIds.forEach(pid => delete hubState.pages[pid]);
                            hubState.folders = hubState.folders.filter(f => f.id !== folderId);
                            if (hubState.activePageId && folder.pageIds.includes(hubState.activePageId)) {
                                hubState.activePageId = null;
                            }
                            saveHubState();
                            refreshWorkspace();
                            showToast(`🗑️ Folder "${currentName}" deleted.`, 'info');
                        }
                    }
                    break;
                case 'renamePage':
                    const newPageName = prompt('Rename page to:', currentName);
                    if (newPageName && newPageName.trim()) {
                        const page = hubState.pages[pageId];
                        if (page) {
                            page.title = newPageName.trim();
                            saveHubState();
                            refreshWorkspace();
                            showToast(`✅ Page renamed to "${newPageName.trim()}"`, 'success');
                        }
                    }
                    break;
                case 'deletePage':
                    if (confirm(`Delete page "${currentName}"?`)) {
                        const folder = hubState.folders.find(f => f.id === folderId);
                        if (folder) {
                            folder.pageIds = folder.pageIds.filter(pid => pid !== pageId);
                            delete hubState.pages[pageId];
                            if (hubState.activePageId === pageId) hubState.activePageId = null;
                            saveHubState();
                            refreshWorkspace();
                            showToast(`🗑️ Page "${currentName}" deleted.`, 'info');
                        }
                    }
                    break;
            }

            // Hide menu after action
            menu.style.display = 'none';
        });
    });

    // Close menu on outside click
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
        }
    };
    // Use a slight delay to avoid immediate close
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

// ----- Render Tree Sidebar (Folders & Pages) -----
function renderTreeSidebar() {
    const container = document.getElementById("dynamic-lesson-tree");
    if (!container) return;
    container.innerHTML = "";

    // Show empty state
    if (!hubState.folders.length) {
        container.innerHTML = `<div style="color:#64748b;padding:10px;text-align:center;">No folders yet.<br>Right‑click to create one.</div>`;
        // Attach context menu to the container itself
        container.oncontextmenu = (e) => {
            e.preventDefault();
            showLessonContextMenu(e, { type: 'root' });
        };
        return;
    }

    hubState.folders.forEach(folder => {
        const collapsed = collapsedFolders[folder.id];
        const folderNode = document.createElement("div");
        folderNode.className = `lesson-folder ${!collapsed ? 'expanded' : ''}`;

        // Trigger (click to expand/collapse)
        const trigger = document.createElement("div");
        trigger.className = "folder-trigger";
        trigger.innerHTML = `
            <span class="folder-arrow" style="display:inline-block;transition:transform 0.2s; ${!collapsed ? 'transform:rotate(90deg);' : ''}">▶</span>
            <span class="folder-icon">📁</span>
            <span class="folder-title" style="font-weight:600;">${folder.title}</span>
        `;
        trigger.onclick = (e) => {
            e.stopPropagation();
            collapsedFolders[folder.id] = !collapsedFolders[folder.id];
            saveCollapsedFolders();
            refreshWorkspace();
        };
        trigger.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showLessonContextMenu(e, { type: 'folder', folderId: folder.id, folderTitle: folder.title });
        };

        // Content (pages inside)
        const content = document.createElement("div");
        content.className = "folder-content";
        content.style.display = !collapsed ? "flex" : "none";

        if (folder.pageIds.length === 0) {
            const empty = document.createElement("div");
            empty.style.cssText = "padding:4px 12px;color:#475569;font-size:0.8rem;font-style:italic;";
            empty.textContent = "Empty Folder";
            content.appendChild(empty);
        } else {
            folder.pageIds.forEach(pageId => {
                const page = hubState.pages[pageId];
                if (!page) return;
                const leaf = document.createElement("div");
                leaf.className = `lesson-leaf-node ${hubState.activePageId === pageId ? 'active' : ''}`;
                leaf.dataset.pageId = pageId;
                leaf.innerHTML = `<span class="leaf-icon">📄</span><span class="leaf-title">${page.title}</span>`;
                leaf.onclick = () => {
                    hubState.activePageId = pageId;
                    refreshWorkspace();
                    const sidebar = document.getElementById('app-sidebar');
                    if (sidebar) sidebar.classList.remove('mobile-open', 'open');
                };
                leaf.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showLessonContextMenu(e, { type: 'page', pageId: pageId, pageTitle: page.title, folderId: folder.id });
                };
                content.appendChild(leaf);
            });
        }

        folderNode.appendChild(trigger);
        folderNode.appendChild(content);
        container.appendChild(folderNode);
    });

    // Right-click on empty space in container (create folder)
    container.oncontextmenu = (e) => {
        // Only if the click is directly on the container (not on a child)
        if (e.target === container) {
            e.preventDefault();
            showLessonContextMenu(e, { type: 'root' });
        }
    };
}

// ----- Drag & Drop Reordering for Lesson Blocks -----
let draggedBlockIndex = null;

function handleBlockDragStart(e) {
    const row = e.target.closest('.notion-row-node');
    if (!row) return;

    draggedBlockIndex = Number(row.dataset.index);
    row.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedBlockIndex);
}

function handleBlockDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const row = e.target.closest('.notion-row-node');
    if (!row) return;

    row.style.background = 'var(--bg-hover)';
}

function handleBlockDragLeave(e) {
    const row = e.target.closest('.notion-row-node');
    if (row) {
        row.style.background = '';
    }
}

function handleBlockDrop(e) {
    e.preventDefault();

    const row = e.target.closest('.notion-row-node');
    if (!row || draggedBlockIndex === null) return;

    const targetIndex = Number(row.dataset.index);
    if (targetIndex === draggedBlockIndex) return;

    // Reorder blocks
    const page = hubState.pages[hubState.activePageId];
    if (!page) return;

    const blocks = page.blocks;
    const draggedBlock = blocks[draggedBlockIndex];

    // Remove from old position
    blocks.splice(draggedBlockIndex, 1);
    // Insert at new position
    blocks.splice(targetIndex, 0, draggedBlock);

    // Save and re-render
    saveHubState();
    renderCurriculumLedger();

    showToast('Block reordered', 'info');
}

function handleBlockDragEnd(e) {
    const row = e.target.closest('.notion-row-node');
    if (row) {
        row.style.opacity = '1';
        row.style.background = '';
    }
    draggedBlockIndex = null;
}

// ----- Render Curriculum Ledger (Editor) -----
function renderCurriculumLedger() {
    const output = document.getElementById("live-ledger-output");
    const headline = document.getElementById("active-page-headline");
    if (!output) return;
    output.innerHTML = "";

    const page = hubState.pages[hubState.activePageId];
    if (!page) {
        if (headline) headline.textContent = "Select a page from the tree view to open a workspace";
        output.innerHTML = `<div style="color:#475569;padding:16px;text-align:center;font-style:italic;">👈 Click a page in the Lesson Menu to start editing.</div>`;
        return;
    }
    if (headline) headline.textContent = page.title;

    if (!page.blocks.length) {
        output.innerHTML = `<div style="color:#475569;padding:16px;text-align:center;font-style:italic;">Empty document. Click "+ Add a line" below.</div>`;
        return;
    }

    page.blocks.forEach((block, idx) => {
        const row = document.createElement("div");
        row.className = "notion-row-node";
        row.dataset.index = idx;
        row.draggable = true;

        // Drag event listeners (unchanged)
        row.addEventListener('dragstart', handleBlockDragStart);
        row.addEventListener('dragover', handleBlockDragOver);
        row.addEventListener('dragleave', handleBlockDragLeave);
        row.addEventListener('drop', handleBlockDrop);
        row.addEventListener('dragend', handleBlockDragEnd);

        // Build the combined text: "time content"
        let combined = '';
        if (block.time) combined += block.time + ' ';
        combined += block.content || '';

        // Apply search highlighting if needed
        let displayText = combined;
        if (currentSearchQuery) {
            displayText = highlightMatch(displayText, currentSearchQuery);
        }

        // Convert [[Page Title]] to clickable links (preserve in the combined text)
        displayText = displayText.replace(/\[\[(.*?)\]\]/g, (match, pageTitle) => {
            let targetPageId = null;
            hubState.folders.forEach(folder => {
                folder.pageIds.forEach(pid => {
                    const p = hubState.pages[pid];
                    if (p && p.title.toLowerCase() === pageTitle.trim().toLowerCase()) {
                        targetPageId = pid;
                    }
                });
            });
            if (targetPageId) {
                return `<a href="#" class="wiki-link" data-page-id="${targetPageId}" onclick="openWikiLink(event, '${targetPageId}')" style="color: #38bdf8; text-decoration: underline; cursor: pointer;">${pageTitle}</a>`;
            } else {
                return `<span class="wiki-link-broken" style="color: #ef4444; font-style: italic;">${pageTitle}</span>`;
            }
        });

        // Create a single contenteditable div
        const lineDiv = document.createElement('div');
        lineDiv.className = 'editable-line';
        lineDiv.contentEditable = 'plaintext-only';
        lineDiv.spellcheck = false;
        lineDiv.innerHTML = displayText;
        lineDiv.dataset.index = idx;
        // Store the original time/content separately for parsing
        lineDiv.dataset.time = block.time || '';
        lineDiv.dataset.content = block.content || '';

        // On input: parse the combined text and update block
        lineDiv.addEventListener('input', function(e) {
            const raw = this.innerText.trim();
            const index = Number(this.dataset.index);
            const page = hubState.pages[hubState.activePageId];
            if (!page) return;

            // Parse time and content using the same logic as handleInsertBlock
            let time = '';
            let content = raw;

            const timePattern = /^(\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)\s+(.*)/i;
            const match = raw.match(timePattern);
            if (match) {
                time = match[1].trim();
                content = match[2].trim();
            } else {
                const separator = raw.includes(' – ') ? ' – ' : raw.includes(' - ') ? ' - ' : null;
                if (separator) {
                    const parts = raw.split(separator);
                    if (parts.length >= 2 && parts[0].match(/\d{1,2}:\d{2}/)) {
                        const secondPart = parts[1].trim();
                        time = parts[0].trim() + ' – ' + (secondPart.includes(' ') ? secondPart.split(' ')[0] : secondPart);
                        content = secondPart;
                    }
                }
            }

            // Update the block
            if (page.blocks[index]) {
                page.blocks[index].time = time;
                page.blocks[index].content = content;
                // Update dataset for future parsing
                this.dataset.time = time;
                this.dataset.content = content;
                saveHubState();
            }
        });

        // On blur: re-render to clean up any stray HTML (optional)
        lineDiv.addEventListener('blur', function() {
            // We could re-render the whole ledger to keep it consistent,
            // but that might lose focus. Instead, we can just update the dataset.
            // For simplicity, we'll just re-render the whole ledger after a short delay.
            // This ensures wiki-links and highlights are reapplied.
            setTimeout(() => {
                renderCurriculumLedger();
            }, 100);
        });

        row.appendChild(lineDiv);
        output.appendChild(row);
    });
}
function highlightSearchResultsInLedger() {
    // This function is called after opening a search result to ensure highlights are applied
    if (!currentSearchQuery) return;
    renderCurriculumLedger();
}

// ----- Sync inline text (for saving edits) -----
function syncInlineText(index, key, value) {
    const page = hubState.pages[hubState.activePageId];
    if (page && page.blocks[index]) {
        page.blocks[index][key] = value;
        saveHubState();
    }
}

function debouncedRenderLedger() {
    clearTimeout(typingTimer);
    const focusState = captureFocusedEditable();
    typingTimer = setTimeout(() => {
        renderCurriculumLedger();
        restoreFocusedEditable(focusState);
    }, 400);
}

function captureFocusedEditable() {
    const active = document.activeElement;
    if (!active || !active.closest('.notion-row-node')) return null;
    const row = active.closest('.notion-row-node');
    return { index: Number(row.dataset.index), isTime: active.classList.contains('editable-time') };
}

function restoreFocusedEditable(state) {
    if (!state) return;
    const sel = `#live-ledger-output .notion-row-node[data-index="${state.index}"] .${state.isTime ? 'editable-time' : 'editable-content'}`;
    const target = document.querySelector(sel);
    if (target) {
        target.focus();
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        const sel2 = window.getSelection();
        sel2.removeAllRanges();
        sel2.addRange(range);
    }
}

// ----- Event Delegation for inline editing (Enter/Backspace) -----
(function initLedgerDelegation() {
    const output = document.getElementById("live-ledger-output");
    if (!output) return;
    output.removeEventListener('input', handleLedgerInput);
    output.removeEventListener('keydown', handleLedgerKeydown);
    output.addEventListener('input', handleLedgerInput);
    output.addEventListener('keydown', handleLedgerKeydown);
})();

function handleLedgerInput(e) {
    const target = e.target;
    if (!target.classList.contains('editable-time') && !target.classList.contains('editable-content')) return;
    const row = target.closest('.notion-row-node');
    if (!row) return;
    const index = Number(row.dataset.index);
    const key = target.classList.contains('editable-time') ? 'time' : 'content';
    const value = key === 'time' ? target.innerText.trim() : target.innerText;
    syncInlineText(index, key, value);
    debouncedRenderLedger();
}

function handleLedgerKeydown(e) {
    const target = e.target;
    if (!target.classList.contains('editable-line')) return;
    const row = target.closest('.notion-row-node');
    if (!row) return;
    const index = Number(row.dataset.index);
    handleInlineKeyboardEvents(e, index, row);
}

function handleInlineKeyboardEvents(e, index, row) {
    const page = hubState.pages[hubState.activePageId];
    if (!page) return;

    if (e.key === "Enter") {
        e.preventDefault();
        page.blocks.splice(index + 1, 0, { time: "", content: "", type: "bullet" });
        saveHubState();
        renderCurriculumLedger();
        setTimeout(() => {
            const newRow = document.querySelector(`#live-ledger-output .notion-row-node[data-index="${index + 1}"] .editable-line`);
            if (newRow) newRow.focus();
        }, 10);
        return;
    }

    if (e.key === "Backspace" && e.target.innerText.trim() === "") {
        e.preventDefault();
        if (page.blocks.length <= 1) {
            showToast("Can't delete the last block.", "warning");
            return;
        }
        page.blocks.splice(index, 1);
        saveHubState();
        renderCurriculumLedger();
        const prev = document.querySelector(`#live-ledger-output .notion-row-node[data-index="${index - 1}"] .editable-line`);
        if (prev) setTimeout(() => prev.focus(), 10);
        return;
    }
}

// ============================================================
// ✅ BUTTON HANDLERS (Insert, Add Line)
// ============================================================

// ============================================================
// ✅ BUTTON HANDLERS (Insert, Add Line) – Single input version
// ============================================================

function handleInsertBlock() {
    console.log('📝 handleInsertBlock triggered');
    const page = hubState.pages[hubState.activePageId];
    if (!page) {
        showToast('⚠️ Select a page from the tree view first.', 'warning');
        return;
    }

    const input = document.getElementById("node-input");
    const typeSelect = document.getElementById("node-type-select");

    if (!input || !typeSelect) {
        showToast('Form inputs not found.', 'error');
        return;
    }

    const raw = input.value.trim();
    if (!raw) {
        showToast('⚠️ Please enter some content.', 'warning');
        return;
    }

    const type = typeSelect.value || "bullet";

    let time = '';
    let content = raw;

    const timePattern = /^(\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)\s+(.*)/i;
    const match = raw.match(timePattern);
    if (match) {
        time = match[1].trim();
        content = match[2].trim();
    } else {
        const separator = raw.includes(' – ') ? ' – ' : raw.includes(' - ') ? ' - ' : null;
        if (separator) {
            const parts = raw.split(separator);
            if (parts.length >= 2 && parts[0].match(/\d{1,2}:\d{2}/)) {
                const secondPart = parts[1].trim();
                time = parts[0].trim() + ' – ' + (secondPart.includes(' ') ? secondPart.split(' ')[0] : secondPart);
                content = secondPart;
            }
        }
    }

    page.blocks.push({ time, content, type });
    input.value = "";
    refreshWorkspace();
    showToast('✅ Block inserted!', 'success');
}

function addNewInlineBlockToEnd() {
    console.log('➕ addNewInlineBlockToEnd triggered');
    const page = hubState.pages[hubState.activePageId];
    if (!page) {
        showToast('⚠️ Select a page from the tree view first.', 'warning');
        return;
    }
    page.blocks.push({ time: "", content: "", type: "bullet" });
    refreshWorkspace();
    setTimeout(() => {
        const last = document.querySelector('#live-ledger-output .notion-row-node:last-child .editable-content');
        if (last) last.focus();
    }, 10);
    showToast('➕ New line added!', 'info');
}
// ============================================================
// 🎯 SIDEBAR TOGGLE (Hide / Show Lesson Menu)
// ============================================================

function toggleSidebar() {
    console.log('🔘 toggleSidebar triggered');
    const sidebar = document.getElementById('app-sidebar');
    const btn = document.getElementById('toggle-creator-btn');

    if (!sidebar) {
        showToast('Sidebar not found.', 'error');
        return;
    }

    // Toggle the 'collapsed' class
    sidebar.classList.toggle('collapsed');

    // Update button text
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (btn) {
        btn.textContent = isCollapsed ? '▣ Show Lesson Menu' : '▢ Hide Lesson Menu';
    }

    // Save preference to localStorage
    try {
        localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
    } catch (_) {}
}

function restoreSidebarState() {
    const sidebar = document.getElementById('app-sidebar');
    const btn = document.getElementById('toggle-creator-btn');
    if (!sidebar) return;

    try {
        const wasCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (wasCollapsed) {
            sidebar.classList.add('collapsed');
            if (btn) btn.textContent = '▣ Show Lesson Menu';
        } else {
            sidebar.classList.remove('collapsed');
            if (btn) btn.textContent = '▢ Hide Lesson Menu';
        }
    } catch (_) {
        // If localStorage fails, default to visible
        sidebar.classList.remove('collapsed');
        if (btn) btn.textContent = '▢ Hide Lesson Menu';
    }
}

// ============================================================
// 🚀 INIT ON LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 Initializing Lessons module...');
    refreshWorkspace();
    restoreSidebarState();
});

// ============================================================
// 💾 BACKUP SYSTEM
// ============================================================

// ============================================================
// EXPLORER DROPDOWN MENU (for "+" button)
// ============================================================

function showExplorerMenu() {
    const btn = document.querySelector('.sidebar-action-btn');
    if (!btn) return;
    let menu = document.getElementById('explorerDropdownMenu');

    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'explorerDropdownMenu';
        menu.className = 'explorer-dropdown-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="folder">📁 New Folder</div>
            <div class="menu-item" data-action="page">📄 New Page</div>
        `;
        btn.parentNode.style.position = 'relative';
        btn.parentNode.appendChild(menu);

        menu.querySelectorAll('.menu-item').forEach(el => {
            el.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.dataset.action;
                if (action === 'folder') {
                    const name = prompt('Enter new folder name:');
                    if (name && name.trim()) {
                        const id = `folder_${Date.now()}`;
                        hubState.folders.push({ id, title: name.trim(), pageIds: [] });
                        refreshWorkspace();
                        showToast(`✅ Folder "${name.trim()}" created!`, 'success');
                    }
                } else if (action === 'page') {
                    if (hubState.folders.length === 0) {
                        showToast('Create a folder first!', 'warning');
                        menu.classList.remove('open');
                        return;
                    }
                    const folderNames = hubState.folders.map((f, i) => `${i+1}. ${f.title}`).join('\n');
                    const idx = prompt(`Select a folder (1-${hubState.folders.length}):\n${folderNames}`);
                    if (idx) {
                        const num = parseInt(idx) - 1;
                        if (num >= 0 && num < hubState.folders.length) {
                            const folder = hubState.folders[num];
                            const title = prompt('Enter page title:');
                            if (title && title.trim()) {
                                const id = `page_${Date.now()}`;
                                hubState.pages[id] = { title: title.trim(), blocks: [] };
                                folder.pageIds.push(id);
                                hubState.activePageId = id;
                                refreshWorkspace();
                                showToast(`✅ Page "${title.trim()}" created!`, 'success');
                            }
                        } else {
                            showToast('Invalid folder number.', 'error');
                        }
                    }
                }
                menu.classList.remove('open');
            });
        });

        // Close on outside click
        document.addEventListener('click', function(e) {
            if (!menu.contains(e.target) && e.target !== btn) {
                menu.classList.remove('open');
            }
        });

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            menu.classList.toggle('open');
        });
        return;
    }
    menu.classList.toggle('open');
}

// Also expose it globally
window.showExplorerMenu = showExplorerMenu;

function exportBackup() {
    const data = {
        events,
        hubState,
        dashTodos,
        myTasks,
        libraryItems,
        taskTemplates,
        customWidgets,
        version: '2.1.0',
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup exported successfully!', 'success');
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Restore all data
            if (data.events) { events = data.events; saveEvents(); }
            if (data.hubState) { hubState = data.hubState; saveHubState(); }
            if (data.dashTodos) { dashTodos = data.dashTodos; saveDashTodos(); }
            if (data.myTasks) { myTasks = data.myTasks; saveMyTasks(); }
            if (data.libraryItems) { libraryItems = data.libraryItems; saveLibraryItems(); }
            if (data.taskTemplates) { taskTemplates = data.taskTemplates; saveTaskTemplates(); }
            if (data.customWidgets) { customWidgets = data.customWidgets; saveCustomWidgets(); }

            // Refresh all views
            refreshWorkspace();
            renderSchedule();
            renderDashTodos();
            renderMyTasks();
            renderLibrary();
            renderWidgets();
            updateDashboardLiveSession();
            renderAnalytics();

            showToast('Backup imported successfully!', 'success');
        } catch (err) {
            showToast('Failed to import backup. Invalid file format.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// Open wiki-style links
function openWikiLink(event, pageId) {
    event.preventDefault();
    event.stopPropagation();

    // Clear any active search
    const searchInput = document.getElementById("lessonSearchInput");
    const resultsContainer = document.getElementById("lessonSearchResults");
    const treeContainer = document.getElementById("dynamic-lesson-tree");

    if (searchInput) searchInput.value = '';
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    if (treeContainer) {
        treeContainer.style.display = '';
    }

    // Open the linked page
    hubState.activePageId = pageId;
    currentSearchQuery = '';
    refreshWorkspace();

    // Close mobile sidebar
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open', 'open');

    showToast('📄 Opening linked page...', 'info');
}

// ----- Floating Add Button Handler -----
document.getElementById('floatingAddBtn')?.addEventListener('click', function() {
    // Show a simple prompt to choose folder or page
    const choice = confirm('Click OK to create a new folder, Cancel to create a new page.');
    if (choice) {
        // Create folder
        const name = prompt('Enter new folder name:');
        if (name && name.trim()) {
            const id = `folder_${Date.now()}`;
            hubState.folders.push({ id, title: name.trim(), pageIds: [] });
            refreshWorkspace();
            showToast(`✅ Folder "${name.trim()}" created!`, 'success');
        }
    } else {
        // Create page: need to pick a folder first
        if (hubState.folders.length === 0) {
            showToast('Create a folder first!', 'warning');
            return;
        }
        const folderNames = hubState.folders.map((f, i) => `${i+1}. ${f.title}`).join('\n');
        const idx = prompt(`Select a folder number (1-${hubState.folders.length}):\n${folderNames}`);
        if (idx) {
            const num = parseInt(idx) - 1;
            if (num >= 0 && num < hubState.folders.length) {
                const folder = hubState.folders[num];
                const title = prompt('Enter page title:');
                if (title && title.trim()) {
                    const id = `page_${Date.now()}`;
                    hubState.pages[id] = { title: title.trim(), blocks: [] };
                    folder.pageIds.push(id);
                    hubState.activePageId = id;
                    refreshWorkspace();
                    showToast(`✅ Page "${title.trim()}" created!`, 'success');
                }
            } else {
                showToast('Invalid folder number.', 'error');
            }
        }
    }
});

let selectedBlockIndices = new Set();

function toggleBlockSelection(index, event) {
    if (event.shiftKey) {
        // shift-click: select range from last selected to this
        // For simplicity, we'll just toggle
    }
    if (selectedBlockIndices.has(index)) {
        selectedBlockIndices.delete(index);
    } else {
        selectedBlockIndices.add(index);
    }
    updateBlockToolbar();
    renderCurriculumLedger(); // re-render to show highlights
}

function updateBlockToolbar() {
    const toolbar = document.getElementById('blockToolbar');
    const countSpan = document.getElementById('selectedCount');
    if (!toolbar) return;
    if (selectedBlockIndices.size === 0) {
        toolbar.style.display = 'none';
        return;
    }
    toolbar.style.display = 'flex';
    countSpan.textContent = selectedBlockIndices.size;
}

function deleteSelectedBlocks() {
    if (selectedBlockIndices.size === 0) return;
    if (!confirm(`Delete ${selectedBlockIndices.size} block(s)?`)) return;
    const page = hubState.pages[hubState.activePageId];
    if (!page) return;
    const sorted = Array.from(selectedBlockIndices).sort((a,b) => b - a);
    sorted.forEach(idx => {
        page.blocks.splice(idx, 1);
    });
    selectedBlockIndices.clear();
    saveHubState();
    renderCurriculumLedger();
    updateBlockToolbar();
    showToast('Blocks deleted', 'info');
}

function applyBlockType(type) {
    const page = hubState.pages[hubState.activePageId];
    if (!page) return;
    selectedBlockIndices.forEach(idx => {
        if (page.blocks[idx]) page.blocks[idx].type = type;
    });
    saveHubState();
    renderCurriculumLedger();
}

function applyTextColor(color) {
    const page = hubState.pages[hubState.activePageId];
    if (!page) return;
    selectedBlockIndices.forEach(idx => {
        if (page.blocks[idx]) page.blocks[idx].textColor = color;
    });
    saveHubState();
    renderCurriculumLedger();
}

function applyBgColor(color) {
    const page = hubState.pages[hubState.activePageId];
    if (!page) return;
    selectedBlockIndices.forEach(idx => {
        if (page.blocks[idx]) page.blocks[idx].bgColor = color;
    });
    saveHubState();
    renderCurriculumLedger();
}

function embedBlock() {
    const url = prompt('Enter URL to embed (e.g., YouTube video link):');
    if (!url || !url.trim()) return;
    const page = hubState.pages[hubState.activePageId];
    if (!page) return;
    selectedBlockIndices.forEach(idx => {
        if (page.blocks[idx]) {
            // Store embed URL
            page.blocks[idx].embed = url.trim();
            // If it's a video, we might want to change type to 'embed' for rendering
            page.blocks[idx].type = 'embed';
        }
    });
    saveHubState();
    renderCurriculumLedger();
    showToast('Embed added', 'success');
}

// ============================================================
// CLEAR SEARCH
// ============================================================

function clearSearch() {
    const input = document.getElementById('lessonSearchInput');
    if (input) {
        input.value = '';
        searchLessons(''); // Re-run search with empty query
        const clearBtn = document.querySelector('.search-clear');
        if (clearBtn) clearBtn.style.display = 'none';
    }
}
