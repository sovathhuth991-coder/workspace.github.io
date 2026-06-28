// Main entry point – initializes all modules
const DEBUG = false;

// ---- Global Error Handler ----
// window.onerror = function(message, source, lineno, colno, error) {
//     console.error('🔥 Global error:', message, error);
//     showToast('⚠️ Something went wrong. Try refreshing the page.', 'error');
//     return false;
// };

// ---- Empty State Renderer ----
function renderEmptyState(container, message, icon = '📭') {
    if (!container) return;
    container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">
            <div style="font-size:3rem; margin-bottom:16px;">${icon}</div>
            <p style="font-size:1.1rem;">${message}</p>
        </div>
    `;
}
window.renderEmptyState = renderEmptyState;

document.addEventListener('DOMContentLoaded', () => {
    // Init Dev Tools (if available)
    if (typeof initDevTools === 'function') {
        initDevTools();
    }
    // Request notification permission
    requestNotificationPermission();

    // Apply saved theme
    applyTheme(currentTheme);

    // Init drag and drop
    initDragAndDrop();

    // Init dashboard
    initDashboardEngine();

    // Init focus timer
    initFocusTimer();

    // Render schedule (weekly view)
    renderSchedule();

    // Render lessons (Notion-like workspace)
    refreshWorkspace();

    // Render tasks
    renderMyTasks();

    // Render library
    renderLibrary();

    // Render widgets
    renderWidgets();

    // Init global search
    initGlobalSearch();

    // Calendar month view
    renderCalendarMonth();

    // Check for upcoming events
    checkUpcomingEvents();

    // Auto-refresh every 5 minutes
    setInterval(() => {
        renderSchedule();
        updateDashboardLiveSession();
        if (currentOpenDay) {
            const modal = document.getElementById('diagramModal');
            const active = document.activeElement;
            const editing = modal && modal.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
            if (!editing) openDayDiagram(currentOpenDay);
        }
    }, 300000);

    if (DEBUG) {
        console.log('🚀 Workspace Hub initialized');
        console.log('📅 Events:', events.length);
        console.log('📁 Folders:', hubState.folders.length);
        console.log('📚 Library items:', libraryItems.length);
        console.log('✅ Tasks:', myTasks.length);
        console.log('🌓 Theme:', currentTheme);
    }
});

// ============================================================
// BURGER MENU TOGGLE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const burgerToggle = document.getElementById('burgerToggle');
    const sidebar = document.getElementById('hubSidebar');

    if (burgerToggle && sidebar) {
        burgerToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            burgerToggle.classList.toggle('active');
            burgerToggle.setAttribute('aria-expanded', isOpen);
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 850) {
                const isClickInsideSidebar = sidebar.contains(e.target);
                const isClickOnBurger = burgerToggle.contains(e.target);
                if (!isClickInsideSidebar && !isClickOnBurger && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    burgerToggle.classList.remove('active');
                    burgerToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });

        // Close sidebar on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                burgerToggle.classList.remove('active');
                burgerToggle.setAttribute('aria-expanded', 'false');
                burgerToggle.focus();
            }
        });
    }
});

// ============================================================
// NAVIGATION SYSTEM
// ============================================================

/**
 * Switch the active view and update the sidebar
 * @param {string} targetViewId - The ID of the view to show (e.g., 'dashboard-view')
 */
window.switchView = function(targetViewId) {
    // 1. Hide all views
    const views = document.querySelectorAll('.hub-view');
    views.forEach(view => view.classList.remove('active'));

    // 2. Show the target view
    const targetView = document.getElementById(targetViewId);
    if (targetView) {
        targetView.classList.add('active');
    } else {
        console.warn(`View "${targetViewId}" not found`);
        return;
    }

    // 3. Update sidebar button states
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Find the button that matches this view (by onclick attribute)
    const clickedButton = Array.from(buttons).find(btn => {
        const onclick = btn.getAttribute('onclick');
        return onclick && onclick.includes(targetViewId);
    });
    if (clickedButton) clickedButton.classList.add('active');

    // 4. Refresh content for specific views
    switch (targetViewId) {
        case 'schedule-view':
            if (typeof renderSchedule === 'function') renderSchedule();
            if (typeof ensureScheduleGraphInit === 'function') {
                setTimeout(ensureScheduleGraphInit, 50);
            }
            break;
        case 'todo-view':
            if (typeof renderDashTodos === 'function') renderDashTodos();
            if (typeof updateDashProgress === 'function') updateDashProgress(false);
            break;
        case 'lessons-view':
            if (typeof refreshWorkspace === 'function') refreshWorkspace();
            break;
        case 'timer-view':
            if (typeof updateFocusTimerDisplay === 'function') updateFocusTimerDisplay();
            if (typeof updateFocusTimerTaskLink === 'function') updateFocusTimerTaskLink();
            break;
        case 'dashboard-view':
            if (typeof updateDashboardLiveSession === 'function') updateDashboardLiveSession();
            if (typeof updateDashProgress === 'function') updateDashProgress(false);
            break;
        case 'graph-view':
            setTimeout(() => {
                if (typeof renderKnowledgeGraph === 'function') {
                    renderKnowledgeGraph();
                }
            }, 100);
            break;
    }

    // 5. Save the current view to localStorage
    try {
        localStorage.setItem('activeView', targetViewId);
    } catch (_) { /* ignore */ }

    // 6. Close mobile sidebar if open
    const sidebar = document.getElementById('hubSidebar');
    if (sidebar && window.innerWidth < 850) {
        sidebar.classList.remove('open');
    }
};

// ============================================================
// INITIALIZE ACTIVE VIEW ON LOAD
// ============================================================

// Override the existing DOMContentLoaded to also set the initial view
// This runs after the existing initialization
document.addEventListener('DOMContentLoaded', function() {
    // Restore the last active view from localStorage, or default to dashboard
    const savedView = localStorage.getItem('activeView') || 'dashboard-view';

    // Initialize schedule graph view
    setTimeout(() => {
        if (typeof ensureScheduleGraphInit === 'function') {
            ensureScheduleGraphInit();
        }
    }, 100);

    // Make sure the saved view exists
    const viewExists = document.getElementById(savedView) !== null;
    const initialView = viewExists ? savedView : 'dashboard-view';

    // Switch to the initial view
    window.switchView(initialView);
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    // View switching with Cmd+1..8
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key) {
            case '1': e.preventDefault(); switchView('dashboard-view'); break;
            case '2': e.preventDefault(); switchView('schedule-view'); break;
            case '3': e.preventDefault(); switchView('timer-view'); break;
            case '4': e.preventDefault(); switchView('todo-view'); break;
            case '5': e.preventDefault(); switchView('lessons-view'); break;
            case '6': e.preventDefault(); switchView('analytics-view'); break;
            case '7': e.preventDefault(); switchView('library-view'); break;
            case '8': e.preventDefault(); switchView('graph-view'); break;
        }
    }

    // Undo (Cmd+Z) and Redo (Cmd+Shift+Z)
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (typeof undo === 'function') {
            e.preventDefault();
            undo();
        }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        if (typeof redo === 'function') {
            e.preventDefault();
            redo();
        }
    }

    // N = New Task (opens today's schedule)
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
        e.preventDefault();
        switchView('schedule-view');
        setTimeout(() => openDayDiagram(getTodayName()), 150);
    }

    // F = Focus Timer
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
        e.preventDefault();
        switchView('timer-view');
    }

    // S = Focus Global Search
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    }

    // Escape to close modals / search
    if (e.key === 'Escape') {
        const modal = document.getElementById('diagramModal');
        if (modal && modal.style.display === 'flex') {
            closeDayDiagram();
        }
        const dropdown = document.getElementById('globalSearchDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

// ============================================================
// 🌐 GLOBAL UNIFIED SEARCH ENGINE
// ============================================================

/**
 * Initializes the global search bar that searches across:
 * - Lessons (pages and block content via hubState)
 * - Schedule events
 * - Library items
 */
function initGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('globalSearchDropdown');
    const resultsLabel = document.getElementById('globalSearchResults');
    if (!input) return;

    input.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            dropdown.style.display = 'none';
            resultsLabel.textContent = '';
            return;
        }

        const matches = [];

        // Search Lessons (pages and blocks)
        if (typeof hubState !== 'undefined' && hubState.pages) {
            Object.values(hubState.pages).forEach(page => {
                if (page.title && page.title.toLowerCase().includes(query)) {
                    matches.push({ type: '📄 Lesson', name: page.title, link: 'Open in Lessons' });
                }
                if (page.blocks && Array.isArray(page.blocks)) {
                    page.blocks.forEach(block => {
                        if (block.content && block.content.toLowerCase().includes(query)) {
                            matches.push({
                                type: '📝 Block',
                                name: `"${block.content.slice(0, 40)}..."`,
                                page: page.title
                            });
                        }
                    });
                }
            });
        }

        // Search Schedule Events
        if (typeof events !== 'undefined') {
            events.forEach(ev => {
                if (ev.title && ev.title.toLowerCase().includes(query)) {
                    matches.push({ type: '📅 Task', name: `${ev.title} (${ev.day} ${ev.start})` });
                }
            });
        }

        // Search Library
        if (typeof libraryItems !== 'undefined') {
            libraryItems.forEach(item => {
                if (item.title && item.title.toLowerCase().includes(query)) {
                    matches.push({ type: '📚 Library', name: item.title, url: item.url });
                } else if (item.tags && item.tags.toLowerCase().includes(query)) {
                    matches.push({ type: '📚 Library', name: item.title, url: item.url });
                }
            });
        }

        // Render results
        if (matches.length === 0) {
            dropdown.innerHTML = '<div style="padding:12px;color:var(--text-muted);">No results found</div>';
            dropdown.style.display = 'block';
            resultsLabel.textContent = '0 results';
            return;
        }

        resultsLabel.textContent = `${matches.length} result${matches.length > 1 ? 's' : ''}`;
        dropdown.innerHTML = matches.map(m => `
            <div style="padding:8px 12px; border-bottom:1px solid var(--border-color); cursor:pointer; transition:0.15s;"
                onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'"
                onclick="handleGlobalSearchClick('${encodeURIComponent(JSON.stringify(m))}')">
                <span style="font-weight:600;color:var(--accent-1);">${m.type}</span>
                <span style="color:var(--text-secondary);">${m.name}</span>
                ${m.page ? `<span style="color:var(--text-muted);font-size:0.75rem;"> in ${m.page}</span>` : ''}
            </div>
        `).join('');
        dropdown.style.display = 'block';
    }, 300));

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== input) {
            dropdown.style.display = 'none';
        }
    });
}

/**
 * Handles clicking on a search result item.
 * Navigates to the appropriate view based on result type.
 * @param {string} encoded - URI-encoded JSON of the search result item
 */
function handleGlobalSearchClick(encoded) {
    const item = JSON.parse(decodeURIComponent(encoded));
    const dropdown = document.getElementById('globalSearchDropdown');
    const input = document.getElementById('globalSearchInput');
    dropdown.style.display = 'none';
    input.value = '';

    if (item.type.includes('Lesson') || item.type.includes('Block')) {
        switchView('lessons-view');
    } else if (item.type.includes('Task')) {
        switchView('schedule-view');
        setTimeout(() => openDayDiagram(getTodayName()), 100);
    } else if (item.type.includes('Library') && item.url && item.url.startsWith('http')) {
        window.open(item.url, '_blank');
    } else if (item.type.includes('Library')) {
        showToast('Invalid URL', 'error');
    }
    showToast(`Found: ${item.name}`, 'info');
}

// Expose globally for inline onclick handlers
window.initGlobalSearch = initGlobalSearch;
window.handleGlobalSearchClick = handleGlobalSearchClick;

// ============================================================
// 🎵 AUDIO & LoFi WIDGET CONTROLS
// ============================================================

let rainAudio = document.getElementById('rainAudioEngine');
let rainPlaying = false;

function toggleLofiConsole() {
    const widget = document.getElementById('lofiWidget');
    const btn = document.getElementById('lofiToggleBtn');
    if (!widget) return;
    widget.classList.toggle('minimized');
    if (btn) {
        btn.textContent = widget.classList.contains('minimized') ? '🎛️' : '−';
    }
}

function toggleRainSound() {
    if (!rainAudio) {
        rainAudio = document.getElementById('rainAudioEngine');
        if (!rainAudio) return;
    }
    if (rainPlaying) {
        rainAudio.pause();
        rainPlaying = false;
        const btn = document.getElementById('rainPlayBtn');
        if (btn) btn.textContent = 'Play Rain';
    } else {
        rainAudio.play().catch(() => {});
        rainPlaying = true;
        const btn = document.getElementById('rainPlayBtn');
        if (btn) btn.textContent = 'Pause Rain';
    }
}

function changeRainVolume(value) {
    if (!rainAudio) {
        rainAudio = document.getElementById('rainAudioEngine');
        if (!rainAudio) return;
    }
    rainAudio.volume = parseFloat(value);
}

function showShortcuts() {
const existing = document.getElementById('shortcutsModal');
if (existing) { existing.remove(); return; }

const modal = document.createElement('div');
modal.id = 'shortcutsModal';
modal.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);
    z-index:10000; display:flex; align-items:center; justify-content:center;
    animation:fadeIn 0.2s ease;
`;
modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

const box = document.createElement('div');
box.style.cssText = `
    background:var(--bg-card); border:1px solid var(--border-color);
    border-radius:16px; padding:32px; max-width:500px; width:90%;
    max-height:80vh; overflow-y:auto;
    box-shadow:var(--shadow-elevated);
`;
box.innerHTML = `
    <h2 style="margin:0 0 16px;display:flex;justify-content:space-between;align-items:center;">
    ⌨️ Keyboard Shortcuts
    <button class="matrix-btn" onclick="document.getElementById('shortcutsModal').remove()">✕</button>
    </h2>
    <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px;">
    <li><kbd>⌘1</kbd> – Dashboard</li>
    <li><kbd>⌘2</kbd> – Schedule</li>
    <li><kbd>⌘3</kbd> – Timer</li>
    <li><kbd>⌘4</kbd> – Master To‑Do</li>
    <li><kbd>⌘5</kbd> – Lessons</li>
    <li><kbd>⌘6</kbd> – Analytics</li>
    <li><kbd>⌘7</kbd> – Library</li>
    <li><kbd>⌘8</kbd> – Knowledge Graph</li>
    <li><kbd>⌘Z</kbd> – Undo</li>
    <li><kbd>⌘⇧Z</kbd> – Redo</li>
    <li><kbd>N</kbd> – New Task (today)</li>
    <li><kbd>F</kbd> – Focus Timer</li>
    <li><kbd>S</kbd> – Focus Search</li>
    <li><kbd>Esc</kbd> – Close modals / search</li>
    </ul>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-top:12px;">On Windows/Linux, use <kbd>Ctrl</kbd> instead of ⌘</p>
`;
modal.appendChild(box);
document.body.appendChild(modal);
}

// Also trigger by pressing '?'
document.addEventListener('keydown', (e) => {
if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    showShortcuts();
}
});

// ============================================================
// FOCUS MODE – Hide Sidebar & Search
// ============================================================

let focusModeActive = false;

function toggleFocusMode() {
    focusModeActive = !focusModeActive;
    const sidebar = document.getElementById('hubSidebar');
    const searchBar = document.querySelector('.global-search-bar');
    const toggleBtn = document.getElementById('focusModeToggle');

    if (focusModeActive) {
        sidebar.style.display = 'none';
        if (searchBar) searchBar.style.display = 'none';
        document.querySelector('.hub-shell').style.gridTemplateColumns = '1fr';
        if (toggleBtn) {
            toggleBtn.textContent = '🔓 Exit Focus Mode';
            toggleBtn.style.background = 'rgba(239, 68, 68, 0.2)';
            toggleBtn.style.borderColor = '#ef4444';
        }
        showToast('🧘 Focus Mode on – distractions hidden', 'info');
    } else {
        sidebar.style.display = '';
        if (searchBar) searchBar.style.display = '';
        document.querySelector('.hub-shell').style.gridTemplateColumns = '';
        if (toggleBtn) {
            toggleBtn.textContent = '🔒 Focus Mode';
            toggleBtn.style.background = '';
            toggleBtn.style.borderColor = '';
        }
        showToast('Focus Mode off', 'info');
    }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'block';
});
function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                showToast('App installed! 🎉', 'success');
            }
            deferredPrompt = null;
            const btn = document.getElementById('pwaInstallBtn');
            if (btn) btn.style.display = 'none';
        });
    }
}

// Also add the button to Lessons view header
// Inside #lessons-view .view-header (you can add it manually or we'll do it via JS)
// For simplicity, just paste this after the timer button logic.

// ============================================================
// QUICK ADD TASK
// ============================================================

function quickAddTask() {
    switchView('schedule-view');
    setTimeout(() => {
        openDayDiagram(getTodayName());
    }, 150);
}

// ============================================================
// CLEAR ALL DATA
// ============================================================
function clearAllData() {
    if (!confirm('⚠️ This will permanently delete ALL your data (events, lessons, tasks, widgets, todos, templates, etc.).\nAre you sure?')) return;
    if (!confirm('Really? There is no undo.')) return;

    // Clear everything from localStorage
    localStorage.clear();

    // Reload the page to reset all in-memory state
    showToast('All data cleared. Reloading...', 'warning');
    setTimeout(() => {
        window.location.reload();
    }, 500);
}

async function clearAllDataAndCache() {
    if (!confirm('⚠️ This will delete ALL app data AND clear the Service Worker cache.\nAre you sure?')) return;
    if (!confirm('Really? There is no undo.')) return;

    // 1. Clear localStorage
    localStorage.clear();

    // 2. Clear all caches
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    showToast('All data and cache cleared. Reloading...', 'warning');
    setTimeout(() => window.location.reload(), 500);
}

window.quickAddTask = quickAddTask;

// Expose globally
window.toggleFocusMode = toggleFocusMode;

window.showShortcuts = showShortcuts;

// Expose globally
window.toggleLofiConsole = toggleLofiConsole;
window.toggleRainSound = toggleRainSound;
window.changeRainVolume = changeRainVolume;
