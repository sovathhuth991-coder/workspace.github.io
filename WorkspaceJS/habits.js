// WorkspaceJS/habits.js

let habits = JSON.parse(localStorage.getItem('habits') || '[]');

function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
}

function renderHabits() {
    const container = document.getElementById('habitsContainer');
    if (!container) return;
    if (!habits.length) {
        container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:40px;">No habits yet. Add one!</p>`;
        return;
    }
    container.innerHTML = habits.map((habit, index) => {
        const today = new Date().toDateString();
        const checked = habit.history && habit.history[today] === true;
        const streak = calculateHabitStreak(habit);
        return `
            <div class="habit-card" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;display:flex;align-items:center;gap:16px;">
                <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleHabit(${index})" style="width:20px;height:20px;accent-color:var(--accent-1);cursor:pointer;" />
                <div style="flex:1;">
                    <div style="font-weight:600;color:var(--text-primary);">${habit.name}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">🔥 ${streak} day${streak !== 1 ? 's' : ''}</div>
                </div>
                <button class="matrix-btn" onclick="deleteHabit(${index})" style="color:#ef4444;border-color:#ef4444;">✕</button>
            </div>
        `;
    }).join('');
}

function calculateHabitStreak(habit) {
    let streak = 0;
    let d = new Date();
    d.setHours(0,0,0,0);
    const history = habit.history || {};
    // Check from today backwards
    for (let i = 0; i < 365; i++) {
        const key = d.toDateString();
        if (history[key] === true) {
            streak++;
        } else {
            // If it's today and not checked, we don't break because we want streak from last completed day
            // Actually we want consecutive days from today going backwards, so if today is unchecked, streak is 0
            if (i === 0 && history[key] !== true) {
                // today unchecked – streak is 0
                streak = 0;
                break;
            } else {
                // break on first missing day after today
                break;
            }
        }
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

function toggleHabit(index) {
    const habit = habits[index];
    if (!habit) return;
    const today = new Date().toDateString();
    if (!habit.history) habit.history = {};
    habit.history[today] = !habit.history[today];
    saveHabits();
    renderHabits();
}

function addHabit() {
    const name = prompt('Enter habit name:');
    if (name && name.trim()) {
        habits.push({ name: name.trim(), history: {} });
        saveHabits();
        renderHabits();
    }
}

function deleteHabit(index) {
    if (confirm('Delete this habit?')) {
        habits.splice(index, 1);
        saveHabits();
        renderHabits();
    }
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    renderHabits();
});

// Expose functions globally
window.renderHabits = renderHabits;
window.addHabit = addHabit;
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;
