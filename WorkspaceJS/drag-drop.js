// drag-drop.js — Full drag & drop between days + reorder within day

let draggedEventId = null;
let dragSourceDay = null;

function initDragAndDrop() {
document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.timeline-item');
    if (!item) return;
    draggedEventId = item.dataset.eventId;
    dragSourceDay = currentOpenDay;
    item.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedEventId);
});

document.addEventListener('dragend', (e) => {
    const item = e.target.closest('.timeline-item');
    if (item) item.style.opacity = '1';
    draggedEventId = null;
    dragSourceDay = null;
});

  // Allow drop on day cards (weekly view) – already works
document.addEventListener('dragover', (e) => {
    const dayBox = e.target.closest('.day');
    if (dayBox) {
    e.preventDefault();
    dayBox.style.borderColor = 'var(--accent-1)';
    }
    // Also allow drop on timeline items for reordering
    const timelineItem = e.target.closest('.timeline-item');
    if (timelineItem) {
    e.preventDefault();
    timelineItem.style.borderColor = 'var(--accent-1)';
    }
});

document.addEventListener('dragleave', (e) => {
    const dayBox = e.target.closest('.day');
    if (dayBox) dayBox.style.borderColor = '';
    const timelineItem = e.target.closest('.timeline-item');
    if (timelineItem) timelineItem.style.borderColor = '';
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    const dayBox = e.target.closest('.day');
    const timelineItem = e.target.closest('.timeline-item');

    if (!draggedEventId) return;

    // --- Drop onto a day card (change day) ---
    if (dayBox) {
    const newDay = dayBox.querySelector('h3').textContent.replace('⭐️', '').trim();
    const event = events.find(ev => ev.id == draggedEventId);
    if (!event) return;
    saveStateForUndo();
    event.day = newDay;
    saveEvents();
    renderSchedule();
    openDayDiagram(newDay);
    showToast(`Moved to ${newDay}`, 'success');
    dayBox.style.borderColor = '';
    return;
    }

    // --- Drop onto a timeline item (reorder within same day) ---
    if (timelineItem) {
    const targetId = timelineItem.dataset.eventId;
    if (targetId === draggedEventId) return;
    const day = currentOpenDay;
    if (!day) return;
    const dayEvents = events.filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start));
    const draggedIndex = dayEvents.findIndex(e => e.id == draggedEventId);
    const targetIndex = dayEvents.findIndex(e => e.id == targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

      // Reorder in the full events array
    saveStateForUndo();
    const draggedEventObj = events.find(e => e.id == draggedEventId);
    const targetEventObj = events.find(e => e.id == targetId);
      // Remove dragged, insert before target
    const dragIndexGlobal = events.indexOf(draggedEventObj);
    const targetIndexGlobal = events.indexOf(targetEventObj);
    events.splice(dragIndexGlobal, 1);
    const newIndex = dragIndexGlobal < targetIndexGlobal ? targetIndexGlobal - 1 : targetIndexGlobal;
    events.splice(newIndex, 0, draggedEventObj);
    saveEvents();
    renderSchedule();
    openDayDiagram(day);
    showToast('Task reordered', 'info');
    timelineItem.style.borderColor = '';
    }
});
}
