// This file contains the main schedule renderer and day diagram logic.

function renderSchedule() {
    autoCompletePastEvents();
    const calendar = document.getElementById("calendar");
    if (!calendar) return;
    calendar.innerHTML = "";
    const { todayName, currentHHMM, currentDayIndex } = getTimeMetrics();
    DAYS.forEach((day, index) => {
        const dayBox = document.createElement("div");
        dayBox.className = "day";
        if (day === todayName) dayBox.classList.add("today-highlight");
        dayBox.setAttribute("onclick", `openDayDiagram('${day}')`);
        dayBox.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e, day); });
        const dayEvents = events.filter(e => e.day === day);
        const eventCount = dayEvents.length;
        const hasOverlaps = dayHasTimeOverlaps(dayEvents);
        let progress = 0;
        if (index < currentDayIndex) progress = 100;
        else if (eventCount > 0) {
            const done = dayEvents.filter(e => e.completed).length;
            progress = Math.round((done / eventCount) * 100);
        }
        dayBox.innerHTML = `
            <h3>${day} ${day === todayName ? '⭐️' : ''}</h3>
            <div class="day-summary">
                <span class="pulse-dot"></span>
                ${eventCount} ${eventCount === 1 ? 'Task' : 'Tasks'} Scheduled
                ${hasOverlaps ? '<span class="day-overlap-flag">⚠ Time conflict</span>' : ''}
            </div>
            <div class="mini-preview-list">
                ${dayEvents.slice(0, 3).map(ev => `<div class="mini-dot color-${ev.category || 'study'} ${ev.completed ? 'mini-done' : ''}">▪️ ${ev.title}</div>`).join('')}
                ${eventCount > 3 ? '<div class="mini-dot extra">...and more</div>' : ''}
            </div>
            <div class="progress-track"><div class="progress-bar" style="width: ${progress}%"></div></div>
        `;
        calendar.appendChild(dayBox);
    });
}

// Helper: convert 24-hour hour (0-23) to 12-hour hour (1-12) as a 2‑digit string
function to12Hour(h24) {
    let h = parseInt(h24);
    if (isNaN(h) || h < 0) h = 12;
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return String(h).padStart(2, '0');
}

// ============================================================
// DAY DIAGRAM (Modal) — Refactored into small functions
// ============================================================

function openDayDiagram(day) {
    if (!DAYS.includes(day)) return;
    autoCompletePastEvents();
    currentOpenDay = day;

    const modal = ensurePlannerModalShell();
    const dayEvents = getDayEvents(day);

    // Build and set HTML once
    modal.innerHTML = buildModalHTML(day, dayEvents);
    modal.style.display = 'flex';
    modal.scrollTop = 0;

    // Initialize wheel pickers after a short delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof initWheelPickers === 'function') {
            initWheelPickers();
        } else {
            console.warn('initWheelPickers not available');
        }
    }, 100);

    if (typeof addTemplateUI === 'function') addTemplateUI(day);
}

function getDayEvents(day) {
    return events.filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start));
}

function buildModalHTML(day, dayEvents) {
    const { todayName, currentHHMM } = getTimeMetrics();
    const defaults = getDefaultWheelTimes();
    const overlapMap = getOverlapMap(dayEvents);
    const conflictCount = overlapMap.size;

    return `
        <div class="modal-content">
            ${buildModalHeader(day, dayEvents)}
            ${buildModalTitle(day, todayName)}
            <div class="modal-layout">
                ${buildFormZone(day, defaults)}
                ${buildTimelineZone(dayEvents, todayName, currentHHMM, overlapMap)}
            </div>
        </div>
    `;
}

function buildModalHeader(day, dayEvents) {
    const conflictCount = getOverlapMap(dayEvents).size;
    return `
        <div class="modal-header-bar">
            <button class="modal-close-btn" onclick="closeDayDiagram()">✕</button>
            <span class="modal-header-title">${day}</span>
            ${conflictCount > 0 ? `<span class="modal-conflict-badge">⚠ ${conflictCount} conflict${conflictCount > 1 ? 's' : ''}</span>` : ''}
        </div>
    `;
}

function buildModalTitle(day, todayName) {
    return `
        <div class="modal-title-section">
            ${buildPlannerDayNav(day)}
        </div>
    `;
}

function getLessonPageOptions(selectedId) {
    if (typeof hubState === 'undefined' || !hubState) return '<option value="">No lessons available</option>';
    let options = '<option value="">— None —</option>';
    hubState.folders.forEach(folder => {
        folder.pageIds.forEach(pageId => {
            const page = hubState.pages[pageId];
            if (!page) return;
            const sel = pageId === selectedId ? 'selected' : '';
            options += `<option value="${pageId}" ${sel}>${folder.title} › ${page.title}</option>`;
        });
    });
    return options;
}

function buildFormZone(day, defaults) {
    return `
        <div class="modal-form-zone">
            <form id="modalScheduleForm" data-planner-day="${day}" onsubmit="handleModalSubmit(event, '${day}')">
                <div class="form-row">
                    <input type="text" id="title" placeholder="Task title..." required class="form-input" />
                </div>
                <div class="form-row">
                    <select id="category" class="form-select">
                        <option value="study">📚 Study</option>
                        <option value="work">💼 Work</option>
                        <option value="personal">🧘 Personal</option>
                        <option value="fitness">🏋️ Fitness</option>
                        <option value="social">🎉 Social</option>
                        <option value="other">📌 Other</option>
                    </select>
                </div>
                <div class="form-row">
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">🔗 Link to Lesson Page</label>
                    <select id="linked-lesson-page" class="form-select">
                        ${getLessonPageOptions('')}
                    </select>
                </div>
                <!-- ===== RECURRENCE DROPDOWN ===== -->
                <div class="form-row">
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">🔄 Repeat</label>
                    <select id="recurrence" class="form-select">
                        <option value="none">No Repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                <div class="form-row time-picker-row">
                    ${buildTimePickerGroup('start', 'Start', to12Hour(defaults.startHour), defaults.startMin, parseInt(defaults.startHour) >= 12 ? 'PM' : 'AM')}
                    ${buildTimePickerGroup('end', 'End', to12Hour(defaults.endHour), defaults.endMin, parseInt(defaults.endHour) >= 12 ? 'PM' : 'AM')}
                </div>
                <div id="modal-form-feedback" class="modal-form-feedback"></div>
                <div class="form-row form-actions">
                    <button type="submit" class="btn-primary">➕ Add Task</button>
                    <button type="button" class="btn-preset" onclick="injectPreset('study')">🧠 Study</button>
                    <button type="button" class="btn-preset" onclick="injectPreset('break')">☕ Break</button>
                </div>
            </form>
        </div>
    `;
}

function buildTimelineZone(dayEvents, todayName, currentHHMM, overlapMap) {
    return `
        <div class="modal-timeline-zone">
            <div class="timeline-header">
                <span>Timeline</span>
                <span class="timeline-count">${dayEvents.length} task${dayEvents.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="timeline-list">
                ${dayEvents.length === 0 ? '<div class="timeline-empty">No tasks yet. Add one above.</div>' : ''}
                ${dayEvents.map(ev => buildTimelineItem(ev, todayName, currentHHMM, overlapMap.get(ev.id) || [])).join('')}
            </div>
        </div>
    `;
}

function buildTimelineItem(ev, todayName, currentHHMM, overlaps) {
    const isPast = ev.day === todayName && ev.end < currentHHMM;
    const isNow = ev.day === todayName && ev.start <= currentHHMM && ev.end >= currentHHMM;
    const linkedPage = ev.linkedPageId && hubState?.pages?.[ev.linkedPageId];
    return `
        <div class="timeline-item ${ev.completed ? 'completed' : ''} ${isNow ? 'active' : ''} ${isPast ? 'past' : ''}" data-event-id="${ev.id}">
            <div class="timeline-item-time">${ev.start} – ${ev.end}</div>
            <div class="timeline-item-title">${ev.completed ? '✅ ' : ''}${ev.title}</div>
            <span class="timeline-item-cat badge-${ev.category || 'study'}">${(ev.category || 'study').toUpperCase()}</span>
            ${overlaps.length > 0 ? `<span class="timeline-overlap-badge" title="Overlaps with: ${overlaps.join(', ')}">⚠</span>` : ''}
            ${linkedPage ? `<button class="timeline-btn lesson-link" onclick="openLinkedLesson('${ev.linkedPageId}')" title="Open linked lesson: ${linkedPage.title}">📄</button>` : ''}
            <div class="timeline-item-actions">
                <!-- ===== TIMER BUTTON (uses startTimerWithTask) ===== -->
                <button class="timeline-btn timer-link" onclick="startTimerWithTask('${ev.title.replace(/'/g, "\\'")}', '${ev.start}', '${ev.end}')" title="Start Focus Timer">⏱</button>
                <button class="timeline-btn complete" onclick="toggleTaskComplete('${ev.id}', '${ev.day}')" title="${ev.completed ? 'Undo' : 'Complete'}">${ev.completed ? '↩' : '✓'}</button>
                <button class="node-del-btn" onclick="deleteEvent(${ev.id})">Remove</button>
            </div>
        </div>
    `;
}

function openLinkedLesson(pageId) {
    if (typeof hubState === 'undefined' || !hubState) return;
    hubState.activePageId = pageId;
    saveHubState();
    closeDayDiagram();
    switchView('lessons-view');
    if (typeof refreshWorkspace === 'function') refreshWorkspace();
}

function ensurePlannerModalShell() {
    let modal = document.getElementById('diagramModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'diagramModal';
    modal.className = 'diagram-modal';
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDayDiagram(); });
    document.body.appendChild(modal);
    document.addEventListener('keydown', handlePlannerKeydown);
    attachPlannerSwipeHandlers(modal);
    return modal;
}

function handlePlannerKeydown(e) {
    const modal = document.getElementById('diagramModal');
    if (!modal || modal.style.display !== 'flex' || !currentOpenDay) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDayDiagram(); return; }
    const active = document.activeElement;
    const editing = active && modal.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
    if (editing) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); openDayDiagram(getAdjacentDay(currentOpenDay, -1)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); openDayDiagram(getAdjacentDay(currentOpenDay, 1)); }
}

function attachPlannerSwipeHandlers(modal) {
    if (modal.dataset.swipeBound === '1') return;
    modal.dataset.swipeBound = '1';
    const state = { startX: 0, startY: 0, tracking: false };
    modal.addEventListener('touchstart', (e) => {
        if (modal.style.display !== 'flex' || e.touches.length !== 1) return;
        state.startX = e.touches[0].clientX;
        state.startY = e.touches[0].clientY;
        state.tracking = true;
    }, { passive: true });
    modal.addEventListener('touchend', (e) => {
        if (!state.tracking || !currentOpenDay) return;
        state.tracking = false;
        const dx = e.changedTouches[0].clientX - state.startX;
        const dy = e.changedTouches[0].clientY - state.startY;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        if (dx > 0) openDayDiagram(getAdjacentDay(currentOpenDay, -1));
        else openDayDiagram(getAdjacentDay(currentOpenDay, 1));
    }, { passive: true });
}

function buildPlannerDayNav(day) {
    const { todayName } = getTimeMetrics();
    const prev = getAdjacentDay(day, -1);
    const next = getAdjacentDay(day, 1);
    const pills = DAYS.map(d => {
        const count = getDayEventCount(d);
        const active = d === day;
        const today = d === todayName;
        return `<button class="day-nav-pill ${active ? 'active' : ''} ${today ? 'today' : ''}" onclick="openDayDiagram('${d}')"><span class="pill-name">${d.slice(0,3)}</span>${count > 0 ? `<span class="pill-count">${count}</span>` : ''}</button>`;
    }).join('');
    return `
        <div class="planner-nav-bar">
            <div class="planner-nav-controls">
                <button class="day-nav-arrow" onclick="openDayDiagram('${prev}')"><span class="arrow-icon">←</span><span class="arrow-label">${prev}</span></button>
                <button class="day-nav-today" onclick="openDayDiagram('${todayName}')" ${day === todayName ? 'disabled' : ''}>Jump to Today</button>
                <button class="day-nav-arrow" onclick="openDayDiagram('${next}')"><span class="arrow-label">${next}</span><span class="arrow-icon">→</span></button>
            </div>
            <div class="day-nav-strip">${pills}</div>
            <p class="planner-nav-hint">Use ← → arrow keys · Esc to close</p>
        </div>
    `;
}

// ============================================================
// MODAL FORM SUBMIT — With validation + recurrence
// ============================================================

function handleModalSubmit(e, day) {
    e.preventDefault();

    const startTime = getWheelTime('start');
    const endTime = getWheelTime('end');

    const startHour = startTime.hour;
    const startMin = startTime.minute;
    const startAmPm = startTime.ampm;

    const endHour = endTime.hour;
    const endMin = endTime.minute;
    const endAmPm = endTime.ampm;

    // Validate that times are selected
    if (!startHour || !startMin || !endHour || !endMin) {
        showToast('Please select both start and end times.', 'error');
        return;
    }

    // Convert to 24-hour for storage
    const start24 = formatTime24h(`${startHour}:${startMin} ${startAmPm}`);
    const end24 = formatTime24h(`${endHour}:${endMin} ${endAmPm}`);

    // Validate that times are different
    if (start24 === end24) {
        showToast('Start and end times cannot be the same.', 'error');
        return;
    }

    const title = document.getElementById('title')?.value?.trim();
    if (!title) {
        showToast('Please enter a task title.', 'error');
        return;
    }

    const category = document.getElementById('category')?.value || 'study';
    const linkedPageId = document.getElementById('linked-lesson-page')?.value || '';
    const recurrence = document.getElementById('recurrence')?.value || 'none';

    // Create the base event
    saveStateForUndo();
    const newEvent = {
        id: Date.now(),
        title,
        category,
        start: start24,
        end: end24,
        day,
        completed: false,
        notes: '',
        link: '',
        color: 'default',
        reminderEnabled: false,
        reminderMinutes: 15,
        reminderShown: false,
        recurrence: recurrence !== 'none' ? recurrence : null,
        linkedPageId: linkedPageId || undefined
    };
    events.push(newEvent);

    // === Handle recurrence ===
    if (recurrence !== 'none') {
        const countPrompt = prompt('How many occurrences? (e.g. 4 for 4 weeks)', '4');
        if (countPrompt && !isNaN(countPrompt) && parseInt(countPrompt) > 1) {
            const count = parseInt(countPrompt);
            const baseDayIndex = DAYS.indexOf(day);
            for (let i = 1; i < count; i++) {
                const newEventCopy = { ...newEvent, id: Date.now() + i, day: DAYS[(baseDayIndex + i) % 7] };
                // Override day if recurrence is daily/weekly/monthly to shift by actual dates
                if (recurrence === 'daily') {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    newEventCopy.day = d.toLocaleDateString('en-US', { weekday: 'long' });
                } else if (recurrence === 'weekly') {
                    const d = new Date();
                    d.setDate(d.getDate() + (i * 7));
                    newEventCopy.day = d.toLocaleDateString('en-US', { weekday: 'long' });
                } else if (recurrence === 'monthly') {
                    const d = new Date();
                    d.setMonth(d.getMonth() + i);
                    newEventCopy.day = d.toLocaleDateString('en-US', { weekday: 'long' });
                }
                events.push(newEventCopy);
            }
        }
    }

    saveEvents();
    renderSchedule();
    // Re-open the diagram to refresh the timeline and reset the form
    openDayDiagram(day);
    showToast(`Task "${title}" added!`, 'success');
}

// ============================================================
// PRESET INJECTION
// ============================================================

function injectPreset(type) {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = String(h % 12 || 12).padStart(2, '0');

    // Set start time
    document.getElementById('startHour').value = h12;
    document.getElementById('startMin').value = m;
    document.getElementById('startAmPm').value = ampm;

    // Refresh wheel display
    refreshWheelDisplay('start');

    if (type === 'study') {
        document.getElementById('title').value = 'Subject Core Review 🧠';
        document.getElementById('category').value = 'study';
        const endH = (h + 1) % 24;
        const endAmpm = endH >= 12 ? 'PM' : 'AM';
        const endH12 = String(endH % 12 || 12).padStart(2, '0');
        document.getElementById('endHour').value = endH12;
        document.getElementById('endMin').value = m;
        document.getElementById('endAmPm').value = endAmpm;
        refreshWheelDisplay('end');
    } else if (type === 'break') {
        document.getElementById('title').value = '☕ Break Time';
        document.getElementById('category').value = 'personal';
        let endM = now.getMinutes() + 15;
        let endH = h;
        let endAmpm2 = ampm;
        if (endM >= 60) {
            endM -= 60;
            endH += 1;
            endAmpm2 = endH >= 12 ? 'PM' : 'AM';
        }
        const endH12_2 = String(endH % 12 || 12).padStart(2, '0');
        document.getElementById('endHour').value = endH12_2;
        document.getElementById('endMin').value = String(endM).padStart(2, '0');
        document.getElementById('endAmPm').value = endAmpm2;
        refreshWheelDisplay('end');
    }

    const form = document.getElementById('modalScheduleForm');
    const day = form?.dataset.plannerDay || currentOpenDay;
    if (day) updateModalFormFeedback(day);
}

function refreshWheelDisplay(prefix) {
    const hourVal = document.getElementById(`${prefix}Hour`).value;
    const minVal = document.getElementById(`${prefix}Min`).value;
    const ampmVal = document.getElementById(`${prefix}AmPm`).value;

    const wheel = document.querySelector(`.time-picker-wheel[data-time-prefix="${prefix}"]`);
    if (!wheel) return;

    wheel.querySelectorAll('.wheel-scroll').forEach(scroll => {
        const type = scroll.dataset.wheelType;
        const targetValue = type === 'hour' ? hourVal : type === 'minute' ? minVal : ampmVal;
        const items = scroll.querySelectorAll('.wheel-item');
        const targetIndex = Array.from(items).findIndex(item => item.dataset.value === targetValue);
        if (targetIndex >= 0) {
            scroll.scrollTo({
                top: targetIndex * 40,
                behavior: 'smooth'
            });
        }
    });
}

function setTimePickerValue(prefix, hour, minute, ampm) {
    const hourEl = document.querySelector(`[data-prefix="${prefix}"][data-type="hour"]`);
    const minEl = document.querySelector(`[data-prefix="${prefix}"][data-type="minute"]`);
    const ampmEl = document.querySelector(`[data-prefix="${prefix}"][data-type="ampm"]`);
    if (hourEl) hourEl.value = hour;
    if (minEl) minEl.value = minute;
    if (ampmEl) ampmEl.value = ampm;
}

window.openDayDiagram = openDayDiagram;
