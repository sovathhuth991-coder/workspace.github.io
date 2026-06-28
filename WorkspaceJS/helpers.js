// js/helpers.js (additions)

function safeJsonParse(str, fallback = null) {
    try { return JSON.parse(str); }
    catch { return fallback; }
}

function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function formatTime12h(hour, minute) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function formatTime24h(timeStr) {
    // Convert "2:30 PM" -> "14:30"
    const [time, ampm] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Shared utility functions
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours * 60 + minutes;
}

function eventsOverlap(first, second) {
    const fStart = timeToMinutes(first.start);
    const fEnd = timeToMinutes(first.end);
    const sStart = timeToMinutes(second.start);
    const sEnd = timeToMinutes(second.end);
    return fStart < sEnd && sStart < fEnd;
}

function getTimeMetrics() {
    const now = new Date();
    const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentHHMM = now.toTimeString().split(' ')[0].substring(0, 5);
    return { todayName, currentHHMM, currentDayIndex: DAYS.indexOf(todayName) };
}

function getTodayName() { return getTimeMetrics().todayName; }

function getAdjacentDay(day, offset) {
    const idx = DAYS.indexOf(day);
    if (idx === -1) return day;
    return DAYS[(idx + offset + DAYS.length) % DAYS.length];
}

function getDayEventCount(day) {
    return events.filter(e => e.day === day).length;
}

function getOverlapMap(dayEvents) {
    const map = new Map();
    for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
            if (!eventsOverlap(dayEvents[i], dayEvents[j])) continue;
            if (!map.has(dayEvents[i].id)) map.set(dayEvents[i].id, []);
            if (!map.has(dayEvents[j].id)) map.set(dayEvents[j].id, []);
            map.get(dayEvents[i].id).push(dayEvents[j].title);
            map.get(dayEvents[j].id).push(dayEvents[i].title);
        }
    }
    return map;
}

function dayHasTimeOverlaps(dayEvents) {
    for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
            if (eventsOverlap(dayEvents[i], dayEvents[j])) return true;
        }
    }
    return false;
}

function getTodayEventsSorted(includeCompleted = true) {
    const today = getTodayName();
    return events
        .filter(e => e.day === today && (includeCompleted || !e.completed))
        .sort((a, b) => a.start.localeCompare(b.start));
}

function getSessionSnapshot() {
    const { todayName, currentHHMM } = getTimeMetrics();
    const todayEvents = events.filter(e => e.day === todayName).sort((a, b) => a.start.localeCompare(b.start));
    const current = todayEvents.find(e => !e.completed && currentHHMM >= e.start && currentHHMM <= e.end);
    const next = todayEvents.find(e => !e.completed && e.start > currentHHMM);
    return { todayName, currentHHMM, todayEvents, current, next };
}

function getDefaultWheelTimes() {
    const now = new Date();
    const sh = String(now.getHours()).padStart(2, '0');
    const sm = String(now.getMinutes()).padStart(2, '0');
    const eh = String((now.getHours() + 1) % 24).padStart(2, '0');
    return { startHour: sh, startMin: sm, endHour: eh, endMin: sm };
}

