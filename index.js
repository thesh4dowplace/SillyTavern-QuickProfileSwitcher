/**
 * Quick Profile Switcher v1.0.0 — SillyTavern Extension
 *
 * Adds a quick-access button to the chat input bar for switching
 * Connection Profiles without leaving the conversation.
 *
 * Author: see GitHub
 * License: MIT
 */

let executeSlashCommands = null;

async function loadSlashCommandRunner() {
    try {
        const mod = await import('../../../script.js');
        executeSlashCommands = mod.executeSlashCommandsWithOptions ?? mod.executeSlashCommands;
    } catch {
        const ctx = SillyTavern.getContext();
        executeSlashCommands = ctx.executeSlashCommandsWithOptions ?? ctx.executeSlashCommands ?? null;
    }
}

const EXT_NAME = 'Quick Profile Switcher';
let dropdownEl = null;
let btnEl = null;
let isOpen = false;
let isClosing = false;
let cachedProfiles = [];
let activeProfile = null;

// ── Slash commands ────────────────────────────────────────────────────────

async function runCommand(cmd) {
    if (!executeSlashCommands) return null;
    try {
        const result = await executeSlashCommands(cmd, { showOutput: false, handleParserErrors: false });
        return result?.pipe ?? result?.output ?? result ?? null;
    } catch (e) {
        console.warn(`[${EXT_NAME}] Comando falhou: ${cmd}`, e);
        return null;
    }
}

async function fetchProfiles() {
    try {
        const raw = await runCommand('/profile-list');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

async function fetchActiveProfile() {
    try {
        const raw = await runCommand('/profile');
        return raw?.trim() || null;
    } catch { return null; }
}

async function switchProfile(name) {
    try {
        await runCommand(`/profile ${name}`);
        activeProfile = name;
        updateTooltip();
    } catch (e) {
        console.error(`[${EXT_NAME}] Falha ao trocar:`, e);
        toastr?.error(`Não foi possível trocar para "${name}"`, EXT_NAME);
    }
}

// ── DOM: botão ────────────────────────────────────────────────────────────

function injectButton() {
    if (document.getElementById('quick-profile-btn')) return;

    const rightBar = document.getElementById('rightSendForm');
    if (!rightBar) { setTimeout(injectButton, 500); return; }

    btnEl = document.createElement('div');
    btnEl.id = 'quick-profile-btn';
    btnEl.className = 'interactable';
    btnEl.title = 'Connection Profiles';
    btnEl.setAttribute('tabindex', '0');

    // Ícone: dois retângulos empilhados com seta — representa "trocar camada/perfil"
    btnEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12h20"/>
            <path d="M2 6h20"/>
            <path d="M2 18h12"/>
            <path d="M19 15l3 3-3 3"/>
        </svg>
    `;

    btnEl.addEventListener('click', () => {
        if (isClosing) { isClosing = false; return; }
        isOpen ? closeDropdown() : openDropdown();
    });

    const sendBut = document.getElementById('send_but');
    sendBut ? rightBar.insertBefore(btnEl, sendBut) : rightBar.appendChild(btnEl);

    refreshState();
}

// ── DOM: dropdown ─────────────────────────────────────────────────────────

function createDropdown() {
    if (document.getElementById('qps-dropdown')) return;

    dropdownEl = document.createElement('div');
    dropdownEl.id = 'qps-dropdown';
    dropdownEl.setAttribute('role', 'listbox');
    document.body.appendChild(dropdownEl);

    document.addEventListener('click', (e) => {
        if (!isOpen) return;
        if (dropdownEl.contains(e.target) || btnEl?.contains(e.target)) return;
        isClosing = true;
        closeDropdown();
        setTimeout(() => { isClosing = false; }, 50);
    });
}

function buildItems() {
    if (!cachedProfiles.length) {
        return `<div class="qps-empty">Nenhum perfil encontrado.<br>Crie um em API Connections.</div>`;
    }
    return cachedProfiles.map(name => {
        const active = name === activeProfile;
        return `<div class="qps-item ${active ? 'active' : ''}"
                     role="option" data-profile="${escapeHtml(name)}">
                    <span class="qps-dot">${active ? '●' : ''}</span>
                    <span class="qps-name">${escapeHtml(name)}</span>
                    ${active ? '<span class="qps-check">✓</span>' : ''}
                </div>`;
    }).join('');
}

async function openDropdown() {
    if (!dropdownEl || !btnEl || isOpen) return;

    [cachedProfiles, activeProfile] = await Promise.all([fetchProfiles(), fetchActiveProfile()]);
    updateTooltip();

    dropdownEl.innerHTML = `
        <div class="qps-header">Connection Profiles</div>
        <div class="qps-items">${buildItems()}</div>
    `;

    // ── Posicionamento sem layout shift ───────────────────────────────────
    // O problema anterior: setar display:flex fazia o elemento aparecer por
    // um frame na posição errada (top:0 left:0), causando um "salto" visível.
    // Solução: renderizar invisível (visibility:hidden) para medir, calcular
    // a posição correta, aí tornar visível. Zero flash.
    dropdownEl.style.visibility = 'hidden';
    dropdownEl.style.display = 'flex';

    const rect = btnEl.getBoundingClientRect();
    const h = dropdownEl.offsetHeight;
    const w = dropdownEl.offsetWidth;

    let top = rect.top - h - 6;
    if (top < 8) top = rect.bottom + 6;
    let left = rect.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;

    dropdownEl.style.top = `${top}px`;
    dropdownEl.style.left = `${left}px`;
    dropdownEl.style.visibility = '';

    // Ativa animação no próximo frame (após posição estar definida)
    requestAnimationFrame(() => {
        dropdownEl.classList.add('open');
        btnEl.classList.add('active');
    });

    isOpen = true;

    // Registra cliques nos itens
    dropdownEl.querySelectorAll('.qps-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            const name = item.dataset.profile;
            // Fecha imediatamente — sem delay
            closeDropdown();
            // Troca o perfil em background
            await switchProfile(name);
        });
    });
}

function closeDropdown() {
    if (!isOpen) return;
    dropdownEl?.classList.remove('open');
    btnEl?.classList.remove('active');
    isOpen = false;
}

async function refreshState() {
    [cachedProfiles, activeProfile] = await Promise.all([fetchProfiles(), fetchActiveProfile()]);
    updateTooltip();
}

function updateTooltip() {
    if (btnEl) btnEl.title = activeProfile ? `Perfil: ${activeProfile}` : 'Connection Profiles';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────

jQuery(async () => {
    await loadSlashCommandRunner();
    try {
        const { eventSource, event_types } = SillyTavern.getContext();
        eventSource.on(event_types.APP_READY, () => { createDropdown(); injectButton(); });
        if (event_types.CONNECTION_PROFILE_LOADED) {
            eventSource.on(event_types.CONNECTION_PROFILE_LOADED, () => refreshState());
        }
    } catch (e) {
        console.error(`[${EXT_NAME}] Erro:`, e);
        setTimeout(() => { createDropdown(); injectButton(); }, 2000);
    }
});
