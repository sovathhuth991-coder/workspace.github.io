let customWidgets = JSON.parse(localStorage.getItem('customWidgets') || '[]');

function saveCustomWidgets() {
    localStorage.setItem('customWidgets', JSON.stringify(customWidgets));
}

function renderWidgets() {
    const grid = document.getElementById('dashWidgetsGrid');
    if (!grid) return;
    if (!customWidgets.length) {
        grid.innerHTML = '<p style="color:#475569;font-style:italic;grid-column:1/-1;text-align:center;padding:40px;">No widgets yet.</p>';
        return;
    }
    grid.innerHTML = customWidgets.map(widget => {
        let content = '';
        switch (widget.type) {
            case 'notes':
                content = `<textarea placeholder="Write your notes..." onchange="updateWidgetContent('${widget.id}', this.value)">${widget.content || ''}</textarea>`;
                break;
            case 'links':
                content = `<div class="widget-links">${(widget.links || []).map(l => `<a href="${l.url}" target="_blank" class="widget-link-item">🔗 ${l.name}</a>`).join('')}</div>`;
                break;
            case 'stats':
                content = `<div class="widget-stats">${(widget.stats || []).map(s => `<div class="widget-stat-item"><span class="widget-stat-label">${s.label}</span><span class="widget-stat-value">${s.value}</span></div>`).join('')}</div>`;
                break;
            case 'timer': {
                const m = Math.floor(widget.remainingSeconds / 60),
                    s = widget.remainingSeconds % 60;
                content = `<div class="widget-timer"><div class="widget-timer-display" id="timer-${widget.id}">${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</div><div class="widget-timer-controls"><button class="widget-timer-btn" onclick="toggleWidgetTimer('${widget.id}')">${widget.timerRunning ? 'Pause' : 'Start'}</button><button class="widget-timer-btn" onclick="resetWidgetTimer('${widget.id}')">Reset</button></div></div>`;
                break;
            }
            case 'quote':
                content = `<div class="widget-quote">"${widget.quoteText || 'No quote set'}"${widget.quoteAuthor ? `<div class="widget-quote-author">— ${widget.quoteAuthor}</div>` : ''}</div>`;
                break;
            case 'weather':
                content = `<div class="widget-weather"><div class="widget-weather-icon">${widget.icon || '🌤️'}</div><div class="widget-weather-temp">${widget.temp || 28}°C</div><div class="widget-weather-desc">${widget.condition || 'Sunny'} · ${widget.location || 'Unknown'}</div></div>`;
                break;
            case 'local-audio': {
                const isMp3 = widget.src && widget.src.toLowerCase().endsWith('.mp3');
                const audioType = isMp3 ? 'audio/mpeg' : 'video/mp4';
                content = `
                    <audio controls loop style="width:100%; border-radius:6px;">
                        <source src="${widget.src}" type="${audioType}">
                    </audio>
                    ${widget.label ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${widget.label}</p>` : ''}
                `;
                break;
            }
            default:
                content = `<p>Unknown widget type</p>`;
        }
        return `<div class="widget-card widget-${widget.type}"><div class="widget-header"><div class="widget-title">${widget.title}</div><div class="widget-actions"><button class="widget-btn delete" onclick="deleteWidget('${widget.id}')">✕</button></div></div><div class="widget-content">${content}</div></div>`;
    }).join('');
}

function updateWidgetContent(id, newContent) {
    const w = customWidgets.find(w => w.id === id);
    if (w && w.type === 'notes') {
        w.content = newContent;
        saveCustomWidgets();
    }
}

function toggleWidgetTimer(id) {
    const w = customWidgets.find(w => w.id === id);
    if (!w || w.type !== 'timer') return;
    w.timerRunning = !w.timerRunning;
    if (w.timerRunning) {
        w.timerInterval = setInterval(() => {
            if (w.remainingSeconds > 0) {
                w.remainingSeconds--;
                updateTimerDisplay(w);
            } else {
                clearInterval(w.timerInterval);
                w.timerRunning = false;
                w.remainingSeconds = w.minutes * 60;
                showToast('Timer finished!', 'success');
                renderWidgets();
            }
        }, 1000);
    } else {
        clearInterval(w.timerInterval);
    }
    saveCustomWidgets();
    renderWidgets();
}

function resetWidgetTimer(id) {
    const w = customWidgets.find(w => w.id === id);
    if (!w || w.type !== 'timer') return;
    if (w.timerInterval) clearInterval(w.timerInterval);
    w.timerRunning = false;
    w.remainingSeconds = w.minutes * 60;
    saveCustomWidgets();
    renderWidgets();
}

function updateTimerDisplay(w) {
    const display = document.getElementById(`timer-${w.id}`);
    if (!display) return;
    const m = Math.floor(w.remainingSeconds / 60),
        s = w.remainingSeconds % 60;
    display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function deleteWidget(id) {
    const widget = customWidgets.find(w => w.id === id);
    if (widget && widget.type === 'timer' && widget.timerInterval) {
        clearInterval(widget.timerInterval);
    }
    customWidgets = customWidgets.filter(w => w.id !== id);
    saveCustomWidgets();
    renderWidgets();
}

// ============================================================
// CLEANUP & DEFAULT WIDGET (runs once)
// ============================================================
(function initDefaultAudioWidget() {
    // Remove any existing local-audio widgets to clear duplicates
    customWidgets = customWidgets.filter(w => w.type !== 'local-audio');

    // Add a single default audio widget (only if the file exists)
    // NOTE: Update the src path to match your actual file location
    customWidgets.push({
        id: `widget_${Date.now()}`,
        type: 'local-audio',
        title: '🎵 Study Beats',
        src: '/Free%20Styling/Workspace/Assets/Rain-Music.mp3',  // ← UPDATE this path
        label: 'My favourite focus playlist'
    });
    saveCustomWidgets();
    renderWidgets();
})();
