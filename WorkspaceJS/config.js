// js/config.js
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_UNDO_STEPS = 20;

// Global state variables (used throughout the app)
let events = JSON.parse(localStorage.getItem('scheduleEvents')) || [];
let currentOpenDay = null;
let typingTimer = null;
let undoStack = [];
let redoStack = [];
let draggedEvent = null;
