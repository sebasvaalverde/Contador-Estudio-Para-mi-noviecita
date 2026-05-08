// ============================================
// CONTADOR DE ESTUDIO - Main Application
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

'use strict';

// 🔥 TU CONFIGURACIÓN DE FIREBASE — no la compartas con nadie
const firebaseConfig = {
    apiKey: "AIzaSyC4c0aVEANhcKkOl4GAAlI2lqJfvkHiEtk",
    authDomain: "contador-de-tiempo-mi-novia.firebaseapp.com",
    databaseURL: "https://contador-de-tiempo-mi-novia-default-rtdb.firebaseio.com",
    projectId: "contador-de-tiempo-mi-novia",
    storageBucket: "contador-de-tiempo-mi-novia.firebasestorage.app",
    messagingSenderId: "1039929246595",
    appId: "1:1039929246595:web:984d1bb044b4e8e8112cb6"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const DB_REF = ref(db, "estudio");

// Guarda todos los datos en Firebase de una vez
function saveData() {
    set(DB_REF, { activities, sessions, goals, pomodoroSettings: pomoSettings })
        .catch(e => console.warn('Error al guardar en Firebase:', e));
}

let activities = [];
let sessions = [];
let goals = [];
let pomoSettings = { work: 25, short: 5, long: 15, cycles: 4 };

    let timerState = {
        running: false,
        paused: false,
        startTime: null,
        elapsed: 0,
        interval: null,
        activityId: null
    };

    let pomoState = {
        running: false,
        paused: false,
        phase: 'work',
        cycle: 0,
        timeLeft: 0,
        interval: null,
        totalSeconds: 0
    };

    let calendarState = {
        year: new Date().getFullYear(),
        month: new Date().getMonth()
    };

    // ============================================
    // NAVIGATION
    // ============================================
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById('view-' + view).classList.add('active');

            if (view === 'stats') updateStats();
            if (view === 'calendar') renderCalendar();
            if (view === 'dashboard') updateDashboard();
        });
    });

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    function formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function formatHours(seconds) {
        return (seconds / 3600).toFixed(1) + 'h';
    }

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function getTodaySessions() {
        const today = getToday();
        return sessions.filter(s => s.date === today);
    }

    function getTodayTotal() {
        return getTodaySessions().reduce((sum, s) => sum + s.duration, 0);
    }

    function getActivityName(id) {
        const act = activities.find(a => a.id === id);
        return act ? act.name : 'Sin actividad';
    }

    function populateActivitySelects() {
        const selects = [
            'quick-timer-activity', 'timer-activity', 'manual-activity', 'goal-activity'
        ];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const val = select.value;
            const firstOption = select.options[0].outerHTML;
            select.innerHTML = firstOption;
            activities.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = a.name;
                select.appendChild(opt);
            });
            select.value = val;
        });
    }

    function showConfetti() {
        const colors = ['#ffc2d1', '#c8b6ff', '#ffd6a5', '#fff3b0', '#ff9bb5', '#a18aff'];
        for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = (Math.random() * 50 + 40) + '%';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            particle.style.width = (Math.random() * 6 + 5) + 'px';
            particle.style.height = (Math.random() * 6 + 5) + 'px';
            if (Math.random() > 0.5) {
                particle.style.borderRadius = '2px';
                particle.style.transform = `rotate(${Math.random() * 360}deg)`;
            }
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 2000);
        }
    }

    // ============================================
    // LIVE CLOCK (syncs with real time)
    // ============================================
    function updateLiveClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const clockTime = document.getElementById('live-clock-time');
        const clockDate = document.getElementById('live-clock-date');
        if (clockTime) clockTime.textContent = timeStr;
        if (clockDate) clockDate.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }

    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    // ============================================
    // DASHBOARD
    // ============================================
    function updateDashboard() {
        const todaySeconds = getTodayTotal();
        document.getElementById('today-total').textContent = formatDuration(todaySeconds);

        const dailyGoal = 8 * 3600;
        const pct = Math.min((todaySeconds / dailyGoal) * 100, 100);
        document.getElementById('today-progress').style.width = pct + '%';

        updateWeeklyBars();
        updateRecentSessions();

        if (timerState.running || timerState.paused) {
            document.getElementById('quick-start').style.display = 'none';
            document.getElementById('quick-pause').style.display = timerState.running ? 'inline-flex' : 'none';
            document.getElementById('quick-stop').style.display = 'inline-flex';
        }
    }

    function updateWeeklyBars() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

        const bars = document.querySelectorAll('#weekly-bars .day-bar .bar-fill');
        let maxSeconds = 3600;

        const weekData = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const total = sessions.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.duration, 0);
            weekData.push(total);
            if (total > maxSeconds) maxSeconds = total;
        }

        bars.forEach((bar, i) => {
            const pct = (weekData[i] / maxSeconds) * 100;
            bar.style.height = Math.max(pct, 4) + '%';
        });
    }

    function updateRecentSessions() {
        const container = document.getElementById('recent-sessions');
        const recent = [...sessions].sort((a,b) => new Date(b.date + 'T' + (b.endTime||'23:59')) - new Date(a.date + 'T' + (a.endTime||'23:59'))).slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay sesiones recientes &#128522;</p>';
            return;
        }

        container.innerHTML = recent.map(s => `
            <div class="recent-item">
                <div>
                    <div class="ri-name">${getActivityName(s.activityId)}</div>
                    <div class="ri-time">${s.date} ${s.startTime || ''} - ${s.endTime || ''}</div>
                </div>
                <div class="ri-duration">${formatDuration(s.duration)}</div>
            </div>
        `).join('');
    }

    // ============================================
    // TIMER
    // ============================================
    function startTimer(activityId) {
        timerState.running = true;
        timerState.paused = false;
        timerState.startTime = Date.now();
        timerState.elapsed = 0;
        timerState.activityId = activityId || null;

        updateTimerButtons(true, false);
        timerState.interval = setInterval(updateTimerDisplay, 1000);
        updateTimerDisplay();
    }

    function pauseTimer() {
        timerState.paused = true;
        timerState.running = false;
        timerState.elapsed += Math.floor((Date.now() - timerState.startTime) / 1000);
        clearInterval(timerState.interval);
        updateTimerButtons(false, true);
    }

    function resumeTimer() {
        timerState.paused = false;
        timerState.running = true;
        timerState.startTime = Date.now();
        timerState.interval = setInterval(updateTimerDisplay, 1000);
        updateTimerButtons(true, false);
    }

    function stopTimer() {
        const totalSeconds = getCurrentTimerSeconds();
        clearInterval(timerState.interval);

        if (totalSeconds > 0) {
            showSessionModal(totalSeconds, timerState.activityId);
        }

        timerState.running = false;
        timerState.paused = false;
        timerState.elapsed = 0;
        timerState.startTime = null;
        updateTimerButtons(false, false);
        updateTimerDisplay();
    }

    function getCurrentTimerSeconds() {
        let seconds = timerState.elapsed;
        if (timerState.running) {
            seconds += Math.floor((Date.now() - timerState.startTime) / 1000);
        }
        return seconds;
    }

    function updateTimerDisplay() {
        const seconds = getCurrentTimerSeconds();
        const timeStr = formatTime(seconds);
        document.getElementById('timer-display').textContent = timeStr;
        document.getElementById('quick-timer-display').textContent = timeStr;

        if (timerState.running) {
            document.getElementById('timer-status').textContent = 'Estudiando...';
        } else if (timerState.paused) {
            document.getElementById('timer-status').textContent = 'Pausado';
        } else {
            document.getElementById('timer-status').textContent = 'Listo para estudiar';
        }
    }

    function updateTimerButtons(running, paused) {
        document.getElementById('timer-start').style.display = (!running && !paused) ? 'inline-flex' : 'none';
        document.getElementById('timer-pause').style.display = running ? 'inline-flex' : 'none';
        document.getElementById('timer-resume').style.display = paused ? 'inline-flex' : 'none';
        document.getElementById('timer-stop').style.display = (running || paused) ? 'inline-flex' : 'none';

        document.getElementById('quick-start').style.display = (!running && !paused) ? 'inline-flex' : 'none';
        document.getElementById('quick-pause').style.display = running ? 'inline-flex' : 'none';
        document.getElementById('quick-stop').style.display = (running || paused) ? 'inline-flex' : 'none';
    }

    document.getElementById('timer-start').addEventListener('click', () => {
        const actId = document.getElementById('timer-activity').value;
        startTimer(actId);
    });
    document.getElementById('timer-pause').addEventListener('click', pauseTimer);
    document.getElementById('timer-resume').addEventListener('click', resumeTimer);
    document.getElementById('timer-stop').addEventListener('click', stopTimer);

    document.getElementById('quick-start').addEventListener('click', () => {
        const actId = document.getElementById('quick-timer-activity').value;
        startTimer(actId);
    });
    document.getElementById('quick-pause').addEventListener('click', pauseTimer);
    document.getElementById('quick-stop').addEventListener('click', stopTimer);

    // ============================================
    // SESSION MODAL
    // ============================================
    function showSessionModal(seconds, activityId) {
        document.getElementById('session-modal').style.display = 'flex';
        document.getElementById('modal-time').textContent = formatTime(seconds);
        document.getElementById('modal-activity').textContent = getActivityName(activityId);
        document.getElementById('session-notes').value = '';

        document.getElementById('modal-save').onclick = () => {
            const notes = document.getElementById('session-notes').value;
            const now = new Date();
            const session = {
                id: generateId(),
                activityId: activityId,
                date: getToday(),
                startTime: new Date(now - seconds * 1000).toTimeString().slice(0,5),
                endTime: now.toTimeString().slice(0,5),
                duration: seconds,
                notes: notes
            };
            sessions.push(session);
            saveData();
            document.getElementById('session-modal').style.display = 'none';
            showConfetti();
            updateDashboard();
        };

        document.getElementById('modal-discard').onclick = () => {
            document.getElementById('session-modal').style.display = 'none';
        };
    }

    // ============================================
    // MANUAL ENTRY
    // ============================================
    document.getElementById('manual-date').value = getToday();

    document.getElementById('manual-save').addEventListener('click', () => {
        const actId = document.getElementById('manual-activity').value;
        const date = document.getElementById('manual-date').value;
        const startTime = document.getElementById('manual-start').value;
        const endTime = document.getElementById('manual-end').value;
        const notes = document.getElementById('manual-notes').value;

        if (!date || !startTime || !endTime) {
            alert('Por favor completa la fecha, hora de inicio y fin');
            return;
        }

        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        let duration = Math.floor((end - start) / 1000);

        if (duration <= 0) {
            alert('La hora de fin debe ser despues de la hora de inicio');
            return;
        }

        const session = {
            id: generateId(),
            activityId: actId || null,
            date: date,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            notes: notes
        };

        sessions.push(session);
        saveData();
        showConfetti();
        updateDashboard();

        document.getElementById('manual-start').value = '';
        document.getElementById('manual-end').value = '';
        document.getElementById('manual-notes').value = '';
        alert('Sesion registrada exitosamente!');
    });

    // ============================================
    // POMODORO
    // ============================================
    function initPomodoro() {
        pomoState.timeLeft = pomoSettings.work * 60;
        pomoState.totalSeconds = pomoSettings.work * 60;
        pomoState.phase = 'work';
        pomoState.cycle = 0;
        updatePomoDisplay();
        updatePomoCycles();
    }

    function startPomodoro() {
        pomoState.running = true;
        pomoState.paused = false;

        document.getElementById('pomo-start').style.display = 'none';
        document.getElementById('pomo-pause').style.display = 'inline-flex';
        document.getElementById('pomo-stop').style.display = 'inline-flex';
        document.getElementById('pomo-skip').style.display = 'inline-flex';

        pomoState.interval = setInterval(pomoTick, 1000);
    }

    function pausePomodoro() {
        pomoState.running = false;
        pomoState.paused = true;
        clearInterval(pomoState.interval);
        document.getElementById('pomo-pause').style.display = 'none';
        document.getElementById('pomo-start').style.display = 'inline-flex';
        document.getElementById('pomo-start').innerHTML = '&#9654; Reanudar';
    }

    function stopPomodoro() {
        clearInterval(pomoState.interval);
        pomoState.running = false;
        pomoState.paused = false;

        document.getElementById('pomo-start').style.display = 'inline-flex';
        document.getElementById('pomo-start').innerHTML = '&#9654; Iniciar Pomodoro';
        document.getElementById('pomo-pause').style.display = 'none';
        document.getElementById('pomo-stop').style.display = 'none';
        document.getElementById('pomo-skip').style.display = 'none';

        initPomodoro();
    }

    function skipPomodoro() {
        clearInterval(pomoState.interval);
        nextPomoPhase();
        if (pomoState.running) {
            pomoState.interval = setInterval(pomoTick, 1000);
        }
    }

    function pomoTick() {
        pomoState.timeLeft--;
        updatePomoDisplay();

        if (pomoState.timeLeft <= 0) {
            clearInterval(pomoState.interval);
            playNotificationSound();
            showConfetti();
            nextPomoPhase();
            pomoState.interval = setInterval(pomoTick, 1000);
        }
    }

    function nextPomoPhase() {
        if (pomoState.phase === 'work') {
            pomoState.cycle++;
            updatePomoCycles();

            if (pomoState.cycle >= pomoSettings.cycles) {
                pomoState.phase = 'long';
                pomoState.timeLeft = pomoSettings.long * 60;
                pomoState.totalSeconds = pomoSettings.long * 60;
                pomoState.cycle = 0;
                document.getElementById('pomodoro-label').textContent = 'Descanso largo';
            } else {
                pomoState.phase = 'short';
                pomoState.timeLeft = pomoSettings.short * 60;
                pomoState.totalSeconds = pomoSettings.short * 60;
                document.getElementById('pomodoro-label').textContent = 'Descanso corto';
            }
        } else {
            pomoState.phase = 'work';
            pomoState.timeLeft = pomoSettings.work * 60;
            pomoState.totalSeconds = pomoSettings.work * 60;
            document.getElementById('pomodoro-label').textContent = 'Estudio';
        }
        updatePomoDisplay();
    }

    function updatePomoDisplay() {
        const m = Math.floor(pomoState.timeLeft / 60);
        const s = pomoState.timeLeft % 60;
        document.getElementById('pomodoro-time').textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

        const circumference = 2 * Math.PI * 90;
        const progress = (pomoState.timeLeft / pomoState.totalSeconds);
        const offset = circumference * (1 - progress);
        document.getElementById('pomodoro-ring').style.strokeDashoffset = offset;

        const ring = document.getElementById('pomodoro-ring');
        if (pomoState.phase === 'work') {
            ring.style.stroke = '#ff9bb5';
        } else if (pomoState.phase === 'short') {
            ring.style.stroke = '#c8b6ff';
        } else {
            ring.style.stroke = '#a18aff';
        }
    }

    function updatePomoCycles() {
        const container = document.getElementById('pomodoro-cycles');
        container.innerHTML = '';
        for (let i = 0; i < pomoSettings.cycles; i++) {
            const dot = document.createElement('span');
            dot.className = 'cycle-dot';
            if (i < pomoState.cycle) dot.classList.add('completed');
            if (i === pomoState.cycle && pomoState.running) dot.classList.add('active');
            container.appendChild(dot);
        }
    }

    function playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.value = 0.3;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    }

    document.getElementById('pomo-start').addEventListener('click', startPomodoro);
    document.getElementById('pomo-pause').addEventListener('click', pausePomodoro);
    document.getElementById('pomo-stop').addEventListener('click', stopPomodoro);
    document.getElementById('pomo-skip').addEventListener('click', skipPomodoro);

    document.getElementById('pomo-save-settings').addEventListener('click', () => {
        pomoSettings.work = parseInt(document.getElementById('pomo-work').value) || 25;
        pomoSettings.short = parseInt(document.getElementById('pomo-short').value) || 5;
        pomoSettings.long = parseInt(document.getElementById('pomo-long').value) || 15;
        pomoSettings.cycles = parseInt(document.getElementById('pomo-cycles').value) || 4;
        saveData();
        initPomodoro();
        alert('Configuracion guardada!');
    });

    // ============================================
    // ACTIVITIES
    // ============================================
    function renderActivities(filter) {
        const container = document.getElementById('activities-list');
        let filtered = activities;
        if (filter && filter !== 'all') {
            filtered = activities.filter(a => a.priority === filter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay actividades aun. Agrega una! &#127800;</p>';
            return;
        }

        container.innerHTML = filtered.map(a => {
            const totalHours = sessions.filter(s => s.activityId === a.id).reduce((sum, s) => sum + s.duration, 0) / 3600;
            const goalPct = a.goalHours ? Math.min((totalHours / a.goalHours) * 100, 100) : 0;

            return `
                <div class="activity-item" data-id="${a.id}">
                    <div class="ai-priority ${a.priority}"></div>
                    <div class="ai-info">
                        <div class="ai-name">${a.name}</div>
                        <div class="ai-type">${a.type}</div>
                    </div>
                    <div class="ai-hours">${totalHours.toFixed(1)}h</div>
                    ${a.goalHours ? `
                        <div class="ai-progress">
                            <div class="ai-progress-fill" style="width:${goalPct}%"></div>
                        </div>
                    ` : ''}
                    <div class="ai-actions">
                        <button class="btn-icon edit" onclick="editActivity('${a.id}')">&#9997;</button>
                        <button class="btn-icon delete" onclick="deleteActivity('${a.id}')">&#10005;</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('add-activity').addEventListener('click', () => {
        const name = document.getElementById('activity-name').value.trim();
        const type = document.getElementById('activity-type').value;
        const priority = document.getElementById('activity-priority').value;
        const goalHours = parseFloat(document.getElementById('activity-goal-hours').value) || 0;

        if (!name) {
            alert('Escribe un nombre para la actividad');
            return;
        }

        activities.push({
            id: generateId(),
            name, type, priority, goalHours,
            createdAt: new Date().toISOString()
        });

        saveData();
        populateActivitySelects();
        renderActivities('all');
        document.getElementById('activity-name').value = '';
        document.getElementById('activity-goal-hours').value = '';
        showConfetti();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderActivities(btn.dataset.filter);
        });
    });

    window.editActivity = function(id) {
        const act = activities.find(a => a.id === id);
        if (!act) return;

        document.getElementById('edit-modal').style.display = 'flex';
        document.getElementById('edit-name').value = act.name;
        document.getElementById('edit-type').value = act.type;
        document.getElementById('edit-priority').value = act.priority;
        document.getElementById('edit-goal-hours').value = act.goalHours || '';

        document.getElementById('edit-save').onclick = () => {
            act.name = document.getElementById('edit-name').value.trim() || act.name;
            act.type = document.getElementById('edit-type').value;
            act.priority = document.getElementById('edit-priority').value;
            act.goalHours = parseFloat(document.getElementById('edit-goal-hours').value) || 0;
            saveData();
            populateActivitySelects();
            renderActivities('all');
            document.getElementById('edit-modal').style.display = 'none';
        };

        document.getElementById('edit-cancel').onclick = () => {
            document.getElementById('edit-modal').style.display = 'none';
        };
    };

    window.deleteActivity = function(id) {
        if (!confirm('Segura que quieres eliminar esta actividad?')) return;
        activities = activities.filter(a => a.id !== id);
        saveData();
        populateActivitySelects();
        renderActivities('all');
    };

    // ============================================
    // GOALS
    // ============================================
    function renderGoals() {
        const container = document.getElementById('goals-list');

        if (goals.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay metas aun. Crea una! &#128171;</p>';
            return;
        }

        container.innerHTML = goals.map(g => {
            const totalSeconds = sessions
                .filter(s => !g.activityId || s.activityId === g.activityId)
                .reduce((sum, s) => sum + s.duration, 0);
            const totalHours = totalSeconds / 3600;
            const goalHours = g.hours;
            const pct = Math.min((totalHours / goalHours) * 100, 100);
            const remaining = Math.max(goalHours - totalHours, 0);

            return `
                <div class="goal-item">
                    <div class="gi-header">
                        <div class="gi-name">${g.name}</div>
                        <span class="gi-type">${g.type}</span>
                        <button class="gi-delete" onclick="deleteGoal('${g.id}')">&#10005;</button>
                    </div>
                    <div class="gi-progress-bar">
                        <div class="gi-progress-fill" style="width:${pct}%"></div>
                    </div>
                    <div class="gi-stats">
                        <span class="gi-percent">${pct.toFixed(1)}%</span>
                        <span>${totalHours.toFixed(1)}h / ${goalHours}h</span>
                        <span class="gi-remaining">Faltan ${remaining.toFixed(1)}h</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('add-goal').addEventListener('click', () => {
        const name = document.getElementById('goal-name').value.trim();
        const activityId = document.getElementById('goal-activity').value;
        const hours = parseFloat(document.getElementById('goal-hours').value) || 5;
        const type = document.getElementById('goal-type').value;

        if (!name) {
            alert('Escribe un nombre para la meta');
            return;
        }

        goals.push({
            id: generateId(),
            name, activityId, hours, type,
            createdAt: new Date().toISOString()
        });

        saveData();
        renderGoals();
        document.getElementById('goal-name').value = '';
        showConfetti();
    });

    window.deleteGoal = function(id) {
        if (!confirm('Eliminar esta meta?')) return;
        goals = goals.filter(g => g.id !== id);
        saveData();
        renderGoals();
    };

    // ============================================
    // STATISTICS
    // ============================================
    function updateStats() {
        const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);
        document.getElementById('stat-total-hours').textContent = formatHours(totalSeconds);

        document.getElementById('stat-streak').textContent = calculateStreak();

        const activityTimes = {};
        sessions.forEach(s => {
            if (s.activityId) {
                activityTimes[s.activityId] = (activityTimes[s.activityId] || 0) + s.duration;
            }
        });
        const topId = Object.keys(activityTimes).sort((a,b) => activityTimes[b] - activityTimes[a])[0];
        document.getElementById('stat-top-subject').textContent = topId ? getActivityName(topId) : '-';

        document.getElementById('stat-sessions').textContent = sessions.length;

        drawDailyChart();
        drawActivitiesChart();
        renderHistory();
    }

    function calculateStreak() {
        const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
        if (dates.length === 0) return 0;

        let streak = 0;
        const today = new Date();

        for (let i = 0; i <= 365; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            if (dates.includes(dateStr)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    }

    function drawDailyChart() {
        const canvas = document.getElementById('chart-daily');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }

        const values = days.map(date => sessions.filter(s => s.date === date).reduce((sum, s) => sum + s.duration, 0) / 3600);
        const maxVal = Math.max(...values, 1);

        const padding = 40;
        const barWidth = (width - padding * 2) / 7 - 10;
        const chartHeight = height - padding * 2;

        ctx.strokeStyle = '#ffe0e8';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, '#c8b6ff');
        gradient.addColorStop(1, '#ffc2d1');

        days.forEach((date, i) => {
            const x = padding + i * ((width - padding * 2) / 7) + 5;
            const barH = (values[i] / maxVal) * chartHeight;
            const y = height - padding - barH;

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barH, 5);
            ctx.fill();

            ctx.fillStyle = '#8b7088';
            ctx.font = '11px Quicksand';
            ctx.textAlign = 'center';
            const dayName = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'][new Date(date + 'T12:00:00').getDay()];
            ctx.fillText(dayName, x + barWidth/2, height - 10);

            if (values[i] > 0) {
                ctx.fillStyle = '#a18aff';
                ctx.font = 'bold 11px Quicksand';
                ctx.fillText(values[i].toFixed(1)+'h', x + barWidth/2, y - 5);
            }
        });
    }

    function drawActivitiesChart() {
        const canvas = document.getElementById('chart-activities');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const activityTimes = {};
        sessions.forEach(s => {
            const name = s.activityId ? getActivityName(s.activityId) : 'Sin actividad';
            activityTimes[name] = (activityTimes[name] || 0) + s.duration;
        });

        const entries = Object.entries(activityTimes).sort((a,b) => b[1] - a[1]).slice(0, 6);
        if (entries.length === 0) {
            ctx.fillStyle = '#8b7088';
            ctx.font = '14px Quicksand';
            ctx.textAlign = 'center';
            ctx.fillText('No hay datos aun', width/2, height/2);
            return;
        }

        const maxVal = entries[0][1] / 3600;
        const colors = ['#ffc2d1', '#c8b6ff', '#ffd6a5', '#fff3b0', '#ff9bb5', '#a18aff'];
        const barHeight = 28;
        const padding = 20;
        const labelWidth = 100;

        entries.forEach(([name, seconds], i) => {
            const y = padding + i * (barHeight + 12);
            const val = seconds / 3600;
            const barW = ((width - padding * 2 - labelWidth) * val) / maxVal;

            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.roundRect(labelWidth + padding, y, barW, barHeight, 8);
            ctx.fill();

            ctx.fillStyle = '#5c4a5a';
            ctx.font = '12px Quicksand';
            ctx.textAlign = 'right';
            ctx.fillText(name.substring(0, 12), labelWidth + padding - 8, y + barHeight/2 + 4);

            ctx.fillStyle = '#8b7088';
            ctx.textAlign = 'left';
            ctx.fillText(val.toFixed(1)+'h', labelWidth + padding + barW + 8, y + barHeight/2 + 4);
        });
    }

    function renderHistory() {
        const container = document.getElementById('history-list');
        const sorted = [...sessions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

        if (sorted.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay historial aun &#128522;</p>';
            return;
        }

        container.innerHTML = sorted.map(s => `
            <div class="history-item">
                <span class="hi-date">${s.date}</span>
                <span class="hi-name">${getActivityName(s.activityId)}</span>
                <span class="hi-duration">${formatDuration(s.duration)}</span>
            </div>
        `).join('');
    }

    // ============================================
    // CALENDAR (synced with real date/time)
    // ============================================
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    function renderCalendar() {
        const now = new Date();
        const { year, month } = calendarState;
        document.getElementById('cal-month-year').textContent = `${monthNames[month]} ${year}`;

        const grid = document.getElementById('calendar-grid');
        const headers = grid.querySelectorAll('.cal-header');
        grid.innerHTML = '';
        headers.forEach(h => grid.appendChild(h));

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;

        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            const div = document.createElement('div');
            div.className = 'cal-day other-month';
            div.textContent = prevMonthDays - i;
            grid.appendChild(div);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
            const div = document.createElement('div');
            div.className = 'cal-day';
            div.textContent = d;

            if (dateStr === todayStr) div.classList.add('today');

            const daySessions = sessions.filter(s => s.date === dateStr);
            if (daySessions.length > 0) div.classList.add('has-data');

            div.addEventListener('click', () => {
                document.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                showCalendarDetails(dateStr, daySessions);
            });

            grid.appendChild(div);
        }

        const totalCells = firstDay + daysInMonth;
        const remaining = 7 - (totalCells % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                const div = document.createElement('div');
                div.className = 'cal-day other-month';
                div.textContent = i;
                grid.appendChild(div);
            }
        }
    }

    function showCalendarDetails(date, daySessions) {
        const container = document.getElementById('calendar-details');
        if (daySessions.length === 0) {
            container.innerHTML = `<p class="empty-msg">No hay sesiones el ${date}</p>`;
            return;
        }

        const total = daySessions.reduce((sum, s) => sum + s.duration, 0);
        container.innerHTML = `
            <h4 style="margin-bottom:10px; color: var(--pink-dark);">${date} - Total: ${formatDuration(total)}</h4>
            ${daySessions.map(s => `
                <div class="recent-item">
                    <div>
                        <div class="ri-name">${getActivityName(s.activityId)}</div>
                        <div class="ri-time">${s.startTime || ''} - ${s.endTime || ''}</div>
                        ${s.notes ? `<div style="font-size:0.75rem; color: var(--text-light); margin-top:3px;">${s.notes}</div>` : ''}
                    </div>
                    <div class="ri-duration">${formatDuration(s.duration)}</div>
                </div>
            `).join('')}
        `;
    }

    document.getElementById('cal-prev').addEventListener('click', () => {
        calendarState.month--;
        if (calendarState.month < 0) {
            calendarState.month = 11;
            calendarState.year--;
        }
        renderCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
        calendarState.month++;
        if (calendarState.month > 11) {
            calendarState.month = 0;
            calendarState.year++;
        }
        renderCalendar();
    });

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        populateActivitySelects();
        renderActivities('all');
        renderGoals();
        initPomodoro();
        updateDashboard();

        document.getElementById('pomo-work').value = pomoSettings.work;
        document.getElementById('pomo-short').value = pomoSettings.short;
        document.getElementById('pomo-long').value = pomoSettings.long;
        document.getElementById('pomo-cycles').value = pomoSettings.cycles;

        // Sync calendar to current real date
        calendarState.year = new Date().getFullYear();
        calendarState.month = new Date().getMonth();
    }

// ============================================
// STARTUP — carga desde Firebase antes de iniciar
// ============================================
async function startup() {
    try {
        const snapshot = await get(DB_REF);
        if (snapshot.exists()) {
            const data = snapshot.val();
            activities   = data.activities       || [];
            sessions     = data.sessions         || [];
            goals        = data.goals            || [];
            pomoSettings = data.pomodoroSettings || { work: 25, short: 5, long: 15, cycles: 4 };
        }
    } catch(e) {
        console.warn('No se pudo cargar desde Firebase:', e);
    }
    init();
}

startup();
