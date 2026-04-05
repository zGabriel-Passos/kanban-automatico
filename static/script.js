const API_URL = '/api';

const modal          = document.getElementById('taskModal');
const planModal      = document.getElementById('planModal');
const detailModal    = document.getElementById('detailModal');
const addBtn         = document.getElementById('addTaskBtn');
const closeBtn       = document.querySelector('.close');
const closePlanBtn   = document.querySelector('.close-plan');
const closeDetailBtn = document.querySelector('.close-detail');
const taskForm       = document.getElementById('taskForm');
const themeBtn       = document.getElementById('theme');
const confirmBuildBtn = document.getElementById('confirmBuild');

let activeTask = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTheme();
});

// ─── Theme ────────────────────────────────────────────────────────────────────

function loadTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'light') {
        document.body.classList.add('light-theme');
        themeBtn.textContent = '🌙';
    }
}

themeBtn.onclick = () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeBtn.textContent = isLight ? '🌙' : '🌞';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
};

// ─── Modals ───────────────────────────────────────────────────────────────────

addBtn.onclick = () => modal.classList.add('open');

document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'q') modal.classList.add('open');
    if (e.key === 'Escape') {
        modal.classList.remove('open');
        planModal.classList.remove('open');
        detailModal.classList.remove('open');
    }
});
closeBtn.onclick = () => modal.classList.remove('open');
closePlanBtn.onclick = () => planModal.classList.remove('open');
closeDetailBtn.onclick = () => detailModal.classList.remove('open');
window.onclick = (e) => {
    if (e.target === modal)       modal.classList.remove('open');
    if (e.target === planModal)   planModal.classList.remove('open');
    if (e.target === detailModal) detailModal.classList.remove('open');
};

// ─── Load Tasks ───────────────────────────────────────────────────────────────

async function loadTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks`);
        if (!res.ok) throw new Error('Failed to load tasks');
        const tasks = await res.json();

        document.querySelectorAll('.tasks-container').forEach(c => c.innerHTML = '');
        tasks.forEach(renderTask);
        updateTaskCounter();
    } catch (e) {
        showNotification('Failed to load tasks', 'error');
    }
}

// ─── Create Task ──────────────────────────────────────────────────────────────

taskForm.onsubmit = async (e) => {
    e.preventDefault();

    const title    = document.getElementById('taskTitle').value.trim();
    const folder   = document.getElementById('taskFolder').value.trim();
    const fileType = document.getElementById('taskFileType').value;
    const prompt   = document.getElementById('taskPrompt').value.trim();

    if (!title || !folder || !prompt) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, folder, fileType, prompt })
        });

        if (!res.ok) throw new Error('Failed to create task');

        const task = await res.json();
        renderTask(task);
        taskForm.reset();
        modal.classList.remove('open');
        updateTaskCounter();
        showNotification('Tarefa criada!', 'success');
    } catch (e) {
        showNotification('Erro ao criar tarefa', 'error');
    }
};

// ─── Render Task ──────────────────────────────────────────────────────────────

function renderTask(task) {
    const container = document.querySelector(`[data-column="${task.column}"]`);
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'task';
    el.draggable = true;
    el.dataset.id           = task.id;
    el.dataset.folder       = task.folder || '';
    el.dataset.filetype     = task.fileType || 'md';
    el.dataset.prompt       = task.prompt || '';
    el.dataset.plan         = task.plan || '';
    el.dataset.generatedfile = task.generatedFile || '';
    el.dataset.createdat    = task.createdAt || '';

    el.innerHTML = `
        <h4>${escapeHtml(task.title)}</h4>
        ${task.folder ? `<p class="task-meta">📁 ${escapeHtml(task.folder)} &nbsp;|&nbsp; .${escapeHtml(task.fileType)}</p>` : ''}
        ${task.column === 'plan' || task.column === 'build' ? `<p class="task-status">${statusLabel(task.column)}</p>` : ''}
        <button class="info-btn" onclick="openDetail(event, '${task.id}')" title="Ver detalhes">ℹ</button>
        <button class="delete-btn" onclick="deleteTask(event, '${task.id}')">🗑️</button>
    `;

    setupDragEvents(el);
    container.appendChild(el);
}

function statusLabel(column) {
    const labels = { plan: '🤔 Planejando...', build: '⚙️ Buildando...' };
    return labels[column] || '';
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

function setupDragEvents(task) {
    let columnBeforeDrag = null;

    task.addEventListener('dragstart', () => {
        task.classList.add('dragging');
        columnBeforeDrag = task.closest('.tasks-container')?.dataset.column || null;
    });

    task.addEventListener('dragend', async () => {
        task.classList.remove('dragging');
        const newColumn = task.closest('.tasks-container').dataset.column;
        const taskId = task.dataset.id;

        if (newColumn === 'plan' && columnBeforeDrag === 'idle') {
            await moveToColumn(task, taskId, 'plan');
            await runPlanPhase(task);
        } else if (newColumn === 'idle' && columnBeforeDrag !== 'idle') {
            await moveToColumn(task, taskId, 'idle');
        } else if (newColumn !== columnBeforeDrag && newColumn !== 'plan') {
            loadTasks();
        }
    });
}

document.querySelectorAll('.tasks-container').forEach(container => {
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (dragging) container.appendChild(dragging);
    });
});

// ─── AI Pipeline ──────────────────────────────────────────────────────────────

async function runPlanPhase(taskEl) {
    const taskId   = taskEl.dataset.id;
    const prompt   = taskEl.dataset.prompt;
    const fileType = taskEl.dataset.filetype;
    const title    = taskEl.querySelector('h4').textContent;

    setRunningStatus(true);
    showNotification('🤔 IA planejando...', 'info');

    try {
        const res = await fetch(`${API_URL}/ai/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, prompt, fileType, title })
        });

        if (!res.ok) throw new Error('Plan failed');
        const data = await res.json();

        taskEl.dataset.plan = data.plan;

        activeTask = { taskEl, taskId, prompt, fileType, title, folder: taskEl.dataset.folder, plan: data.plan };
        document.getElementById('planText').value = data.plan;
        planModal.classList.add('open');

        const buildContainer = document.querySelector('[data-column="build"]');
        buildContainer.appendChild(taskEl);

    } catch (e) {
        setRunningStatus(false);
        showNotification('Erro no planejamento', 'error');
        loadTasks();
    }
}

confirmBuildBtn.onclick = async () => {
    if (!activeTask) return;
    activeTask.plan = document.getElementById('planText').value;
    planModal.classList.remove('open');
    showNotification('⚙️ Criando arquivo...', 'info');
    setRunningStatus(true);
    await runBuildPhase(activeTask);
};

async function runBuildPhase({ taskEl, taskId, prompt, fileType, title, folder, plan }) {
    try {
        const res = await fetch(`${API_URL}/ai/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, prompt, fileType, title, folder, plan })
        });

        if (!res.ok) throw new Error('Build failed');
        const data = await res.json();

        taskEl.dataset.generatedfile = data.file_path;
        showNotification(`✅ Arquivo criado: ${data.file_path}`, 'success');

        const reviewContainer = document.querySelector('[data-column="review"]');
        reviewContainer.appendChild(taskEl);

        await runReviewPhase({ fileType, filePath: data.file_path });

    } catch (e) {
        setRunningStatus(false);
        showNotification('Erro no build: ' + e.message, 'error');
        loadTasks();
    }
}

async function runReviewPhase({ fileType, filePath }) {
    try {
        const res = await fetch(`${API_URL}/ai/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: filePath, fileType })
        });

        if (!res.ok) throw new Error('Review failed');
        showNotification('🚀 Arquivo aberto!', 'success');
    } catch (e) {
        showNotification('Erro ao abrir arquivo', 'error');
    } finally {
        setRunningStatus(false);
    }
}

// ─── Move column ──────────────────────────────────────────────────────────────

async function moveToColumn(taskEl, taskId, column) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column })
        });
        const statusEl = taskEl.querySelector('.task-status');
        if (statusEl) statusEl.textContent = statusLabel(column);
    } catch (e) {
        showNotification('Erro ao mover tarefa', 'error');
    }
}

// ─── Delete Task ──────────────────────────────────────────────────────────────

async function deleteTask(e, taskId) {
    e.stopPropagation();
    if (!confirm('Deletar esta tarefa?')) return;
    try {
        const res = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        document.querySelector(`[data-id="${taskId}"]`).remove();
        updateTaskCounter();
        showNotification('Tarefa deletada', 'success');
    } catch (e) {
        showNotification('Erro ao deletar', 'error');
    }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function openDetail(e, taskId) {
    e.stopPropagation();
    const el = document.querySelector(`[data-id="${taskId}"]`);
    if (!el) return;

    const title     = el.querySelector('h4').textContent;
    const folder    = el.dataset.folder;
    const fileType  = el.dataset.filetype;
    const prompt    = el.dataset.prompt;
    const plan      = el.dataset.plan;
    const generated = el.dataset.generatedfile;
    const createdAt = el.dataset.createdat;
    const column    = el.closest('.tasks-container').dataset.column;

    const colLabels = { idle: '⚪ IDLE', plan: '🔵 Plan', build: '🟠 Build', review: '🟣 Review' };

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Tarefa</span>
            <span class="detail-value">${escapeHtml(title)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value">${colLabels[column] || column}</span>
        </div>
        ${createdAt ? `
        <div class="detail-row">
            <span class="detail-label">Criada em</span>
            <span class="detail-value">${new Date(createdAt).toLocaleString('pt-BR')}</span>
        </div>` : ''}
        <div class="detail-divider"></div>
        <div class="detail-row">
            <span class="detail-label">Pasta de destino</span>
            <span class="detail-value mono">📁 ${escapeHtml(folder || '—')} / .${escapeHtml(fileType)}</span>
        </div>
        ${generated ? `
        <div class="detail-row">
            <span class="detail-label">Arquivo gerado</span>
            <span class="detail-value mono">✅ ${escapeHtml(generated)}</span>
        </div>` : ''}
        <div class="detail-divider"></div>
        <div class="detail-row">
            <span class="detail-label">Prompt original</span>
            <div class="detail-plan">${escapeHtml(prompt || '—')}</div>
        </div>
        ${plan ? `
        <div class="detail-row">
            <span class="detail-label">Plano da IA</span>
            <div class="detail-plan">${escapeHtml(plan)}</div>
        </div>` : ''}
    `;

    detailModal.classList.add('open');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function updateTaskCounter() {
    const total = document.querySelectorAll('.task').length;
    document.getElementById('status-text').textContent = `${total} task${total !== 1 ? 's' : ''}`;
}

function setRunningStatus(running) {
    const dot  = document.getElementById('circle-status');
    const text = document.getElementById('status-text');
    if (running) {
        dot.textContent  = '🟡';
        text.textContent = '1 task running';
    } else {
        dot.textContent = '🟢';
        updateTaskCounter();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 10);
    setTimeout(() => {
        n.classList.remove('show');
        setTimeout(() => n.remove(), 300);
    }, 4000);
}
