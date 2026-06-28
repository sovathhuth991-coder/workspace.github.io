// Focus timer logic from dashboard-focus.js, integrated as a module
const focusTimerState = {
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    running: false,
    intervalId: null,
    modeLabel: "Focus Session",
    activePresetMinutes: 25
};
const FOCUS_TIMER_RING_RADIUS = 54;
const FOCUS_TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * FOCUS_TIMER_RING_RADIUS;

function formatTimerDisplay(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function syncFocusTimerPresetButtons() {
    document.querySelectorAll('.timer-preset').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.minutes) === focusTimerState.activePresetMinutes);
    });
}

function updateFocusTimerDisplay() {
    const display = document.getElementById('focusTimerDisplay');
    const mode = document.getElementById('focusTimerMode');
    const startBtn = document.getElementById('focusTimerStartBtn');
    const ring = document.getElementById('focusTimerRing');
    const panel = document.getElementById('focusTimerPanel');
    const progress = focusTimerState.totalSeconds > 0 ? focusTimerState.remainingSeconds / focusTimerState.totalSeconds : 0;
    if (display) display.textContent = formatTimerDisplay(focusTimerState.remainingSeconds);
    if (mode) mode.textContent = focusTimerState.modeLabel;
    if (startBtn) { startBtn.textContent = focusTimerState.running ? 'Pause' : 'Start'; startBtn.setAttribute('aria-pressed', focusTimerState.running ? 'true' : 'false'); }
    if (ring) ring.style.strokeDashoffset = `${FOCUS_TIMER_RING_CIRCUMFERENCE * (1 - progress)}`;
    if (panel) { panel.classList.toggle('timer-running', focusTimerState.running); panel.classList.toggle('timer-finished', !focusTimerState.running && focusTimerState.remainingSeconds === 0); }
    syncFocusTimerPresetButtons();
}

function updateFocusTimerTaskLink() {
    const label = document.getElementById('focusTimerTask');
    if (!label) return;
    const { current, next } = getSessionSnapshot();
    const linked = current || next;
    label.textContent = linked ? `Linked to: ${linked.title} (${linked.start}–${linked.end})` : 'Linked to: nothing scheduled now';
}

function setFocusTimerMode(minutes, label) {
    pauseFocusTimer();
    focusTimerState.modeLabel = label;
    focusTimerState.activePresetMinutes = minutes;
    focusTimerState.totalSeconds = minutes * 60;
    focusTimerState.remainingSeconds = minutes * 60;
    updateFocusTimerDisplay();
}

function toggleFocusTimer() {
    focusTimerState.running ? pauseFocusTimer() : startFocusTimer();
}

function startFocusTimer() {
    if (focusTimerState.intervalId) return;
    if (focusTimerState.remainingSeconds <= 0) focusTimerState.remainingSeconds = focusTimerState.totalSeconds;
    focusTimerState.running = true;
    focusTimerState.intervalId = setInterval(() => {
        focusTimerState.remainingSeconds -= 1;
        updateFocusTimerDisplay();
        if (focusTimerState.remainingSeconds <= 0) {
            focusTimerState.remainingSeconds = 0;
            pauseFocusTimer();
            notifyFocusTimerComplete();
        }
    }, 1000);
    updateFocusTimerDisplay();
}

function pauseFocusTimer() {
    focusTimerState.running = false;
    if (focusTimerState.intervalId) { clearInterval(focusTimerState.intervalId); focusTimerState.intervalId = null; }
    updateFocusTimerDisplay();
}

function resetFocusTimer() {
    pauseFocusTimer();
    focusTimerState.remainingSeconds = focusTimerState.totalSeconds;
    updateFocusTimerDisplay();
}

function notifyFocusTimerComplete() {
    const panel = document.getElementById('focusTimerPanel');
        const session = {
        timestamp: new Date().toISOString(),
        duration: focusTimerState.totalSeconds,
        modeLabel: focusTimerState.modeLabel,
        task: document.getElementById('focusTimerTask')?.textContent || 'unknown'
    };
    let history = JSON.parse(localStorage.getItem('focusHistory') || '[]');
    history.push(session);
    localStorage.setItem('focusHistory', JSON.stringify(history));
    if (panel) {
        panel.classList.add('timer-complete-flash');
        setTimeout(() => panel.classList.remove('timer-complete-flash'), 1200);
    }

    if (document.hidden) {
        const visibilityHandler = () => {
            if (!document.hidden) {
                document.removeEventListener('visibilitychange', visibilityHandler);
                sendNotification('Focus timer finished', focusTimerState.modeLabel);
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
    } else if ('Notification' in window && Notification.permission === 'granted') {
        sendNotification('Focus timer finished', focusTimerState.modeLabel);
    }
}

function initFocusTimer() {
    const panel = document.getElementById('focusTimerPanel');
    const startBtn = document.getElementById('focusTimerStartBtn');
    const resetBtn = document.getElementById('focusTimerResetBtn');
    const ring = document.getElementById('focusTimerRing');
    if (ring) { ring.style.strokeDasharray = `${FOCUS_TIMER_RING_CIRCUMFERENCE}`; ring.style.strokeDashoffset = '0'; }
    startBtn?.addEventListener('click', toggleFocusTimer);
    resetBtn?.addEventListener('click', resetFocusTimer);
    document.querySelectorAll('.timer-preset').forEach(btn => {
        btn.addEventListener('click', () => setFocusTimerMode(Number(btn.dataset.minutes), btn.dataset.label));
    });
    panel?.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'open-today') openDayDiagram(getTodayName());
    });
    window.toggleFocusTimer = toggleFocusTimer;
    window.resetFocusTimer = resetFocusTimer;
    window.setFocusTimerMode = setFocusTimerMode;
    updateFocusTimerDisplay();
    updateFocusTimerTaskLink();
}

// Start timer with dynamic duration based on task times
function startTimerWithTask(title, startTime, endTime) {
    // Parse times "HH:MM"
    const [sh, sm] = (startTime || '00:00').split(':').map(Number);
    const [eh, em] = (endTime || '00:00').split(':').map(Number);
    let duration = ((eh * 60 + em) - (sh * 60 + sm));
    if (isNaN(duration) || duration < 1) duration = 25; // fallback
    const minutes = Math.max(Math.round(duration), 5);
    setFocusTimerMode(minutes, `Focus: ${title}`);
    startFocusTimer();
    switchView('timer-view');
    showToast(`⏱️ Timer started for "${title}" (${minutes} min)`, 'success');
}
window.startTimerWithTask = startTimerWithTask;
