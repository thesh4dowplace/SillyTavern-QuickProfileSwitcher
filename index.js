/**
 * Quick Profile Switcher v2.0.0 — SillyTavern Extension
 *
 * Adds a quick-access button to the chat input bar for switching
 * Connection Profiles without leaving the conversation.
 * 
 * Author: custom
 * License: MIT
 */

const EXT_NAME = 'Quick Profile Switcher';

class QuickProfileSwitcher {
    constructor() {
        this.executeSlashCommands = null;
        this.dropdownEl = null;
        this.btnEl = null;
        this.isOpen = false;
        this.isClosing = false;

        this.cachedProfiles = [];
        this.activeProfile = null;

        this.isRouletteEnabled = false;
        this.hasInitialized = false;

        // Bind methods
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleDropdownClick = this.handleDropdownClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onMessageRendered = this.onMessageRendered.bind(this);
        this.refreshState = this.refreshState.bind(this);
        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.injectButton = this.injectButton.bind(this);
    }

    async init() {
        if (this.hasInitialized) return;
        this.hasInitialized = true;

        await this.loadSlashCommandRunner();
        this.createDropdown();
        this.injectButton();
        this.registerEvents();
    }

    async loadSlashCommandRunner() {
        try {
            const mod = await import('../../../script.js');
            this.executeSlashCommands = mod.executeSlashCommandsWithOptions ?? mod.executeSlashCommands;
        } catch {
            const ctx = SillyTavern.getContext();
            this.executeSlashCommands = ctx.executeSlashCommandsWithOptions ?? ctx.executeSlashCommands ?? null;
        }
    }

    registerEvents() {
        try {
            const { eventSource, event_types } = SillyTavern.getContext();
            if (event_types.CONNECTION_PROFILE_LOADED) {
                eventSource.on(event_types.CONNECTION_PROFILE_LOADED, this.refreshState);
            }

            // Roulette triggers on messages
            if (event_types.USER_MESSAGE_RENDERED) {
                eventSource.on(event_types.USER_MESSAGE_RENDERED, this.onMessageRendered);
            }
            if (event_types.CHARACTER_MESSAGE_RENDERED) {
                eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, this.onMessageRendered);
            }
        } catch (e) {
            console.warn(`[${EXT_NAME}] Event registration issue:`, e);
        }
    }

    async onMessageRendered() {
        if (!this.isRouletteEnabled) return;
        if (this.cachedProfiles.length < 2) return;

        // Pick a random profile different from the current one
        const available = this.cachedProfiles.filter(p => p !== this.activeProfile);
        if (available.length === 0) return;

        const randomProfile = available[Math.floor(Math.random() * available.length)];
        console.log(`[${EXT_NAME}] Roulette rolling to: ${randomProfile}`);
        // Troca silenciosa para não poluir os toasts
        const success = await this.switchProfile(randomProfile, true);

        // Se trocou com sucesso, pisca o chevron com o efeito neon
        if (success && this.btnEl) {
            const icon = this.btnEl.querySelector('.qps-chevron-icon');
            if (icon) {
                icon.classList.remove('qps-roulette-success');
                void icon.offsetWidth; // Força reflow para reiniciar a animação CSS
                icon.classList.add('qps-roulette-success');
            }
        }
    }

    // ── Slash commands ────────────────────────────────────────────────────────

    async runCommand(cmd) {
        if (!this.executeSlashCommands) return null;
        try {
            const result = await this.executeSlashCommands(cmd, { showOutput: false, handleParserErrors: false });
            return result?.pipe ?? result?.output ?? result ?? null;
        } catch (e) {
            console.warn(`[${EXT_NAME}] Comando falhou: ${cmd}`, e);
            return null;
        }
    }

    async fetchProfiles() {
        try {
            const raw = await this.runCommand('/profile-list');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }

    async fetchActiveProfile() {
        try {
            const raw = await this.runCommand('/profile');
            return raw?.trim() || null;
        } catch { return null; }
    }

    async switchProfile(name, silent = false) {
        try {
            await this.runCommand(`/profile ${name}`);
            this.activeProfile = name;
            this.updateTooltip();
            if (this.isOpen) {
                this.renderItems();
            }
            return true;
        } catch (e) {
            console.error(`[${EXT_NAME}] Falha ao trocar:`, e);
            if (!silent && typeof toastr !== 'undefined') {
                toastr.error(`Não foi possível trocar para "${name}"`, EXT_NAME);
            }
            return false;
        }
    }

    // ── DOM: botão ────────────────────────────────────────────────────────────

    injectButton() {
        if (document.getElementById('quick-profile-btn')) return;

        const rightBar = document.getElementById('rightSendForm');
        if (!rightBar) {
            setTimeout(this.injectButton, 500);
            return;
        }

        this.btnEl = document.createElement('div');
        this.btnEl.id = 'quick-profile-btn';
        this.btnEl.className = 'interactable';
        this.btnEl.title = 'Connection Profiles';
        this.btnEl.setAttribute('tabindex', '0');
        this.btnEl.setAttribute('role', 'button');
        this.btnEl.setAttribute('aria-label', 'Open profile switcher');

        // Chevron Up SVG
        this.btnEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                 class="qps-chevron-icon">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
        `;

        this.btnEl.addEventListener('click', this.toggleDropdown);

        // Permitir Enter/Espaço no botão principal
        this.btnEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleDropdown();
            }
        });

        const sendBut = document.getElementById('send_but');
        sendBut ? rightBar.insertBefore(this.btnEl, sendBut) : rightBar.appendChild(this.btnEl);

        this.refreshState();
    }

    toggleDropdown() {
        if (this.isClosing) { this.isClosing = false; return; }
        this.isOpen ? this.closeDropdown() : this.openDropdown();
    }

    // ── DOM: dropdown ─────────────────────────────────────────────────────────

    createDropdown() {
        if (document.getElementById('qps-dropdown')) return;

        this.dropdownEl = document.createElement('div');
        this.dropdownEl.id = 'qps-dropdown';
        this.dropdownEl.setAttribute('role', 'listbox');
        this.dropdownEl.setAttribute('tabindex', '-1');
        document.body.appendChild(this.dropdownEl);

        // Delegação de eventos de clique no dropdown (Performance)
        this.dropdownEl.addEventListener('click', this.handleDropdownClick);

        // Clique fora fechar
        document.addEventListener('click', this.handleDocumentClick);
    }

    handleDocumentClick(e) {
        if (!this.isOpen) return;
        if (this.dropdownEl.contains(e.target) || this.btnEl?.contains(e.target)) return;
        this.isClosing = true;
        this.closeDropdown();
        setTimeout(() => { this.isClosing = false; }, 50);
    }

    handleDropdownClick(e) {
        // Toggle da Roleta
        const toggleBtn = e.target.closest('.qps-roulette-btn');
        if (toggleBtn) {
            e.stopPropagation();
            this.isRouletteEnabled = !this.isRouletteEnabled;
            toggleBtn.classList.toggle('active', this.isRouletteEnabled);
            toggleBtn.title = this.isRouletteEnabled ? 'Profile Roulette: ON' : 'Profile Roulette: OFF';
            return;
        }

        // Seleção de Perfil
        const item = e.target.closest('.qps-item');
        if (item) {
            e.stopPropagation();
            const name = item.dataset.profile;
            if (name && name !== this.activeProfile) {
                this.switchProfile(name); // Não é silent (mostra erro se houver)
            }
            this.closeDropdown();
        }
    }

    handleKeyDown(e) {
        if (!this.isOpen) return;

        const items = Array.from(this.dropdownEl.querySelectorAll('.qps-item'));
        if (!items.length) {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeDropdown();
            }
            return;
        }

        const focusedIndex = items.findIndex(item => item === document.activeElement);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
            items[next].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
            items[prev].focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.closeDropdown();
        } else if (e.key === 'Enter' || e.key === ' ') {
            if (focusedIndex !== -1) {
                e.preventDefault();
                items[focusedIndex].click();
            }
        }
    }

    buildHeader() {
        // Ícone de dado (Dice)
        const diceSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M8 8h.01"></path>
            <path d="M16 8h.01"></path>
            <path d="M12 12h.01"></path>
            <path d="M8 16h.01"></path>
            <path d="M16 16h.01"></path>
        </svg>`;

        return `
            <div class="qps-header">
                <span class="qps-title">Connection Profiles</span>
                <div class="qps-roulette-btn ${this.isRouletteEnabled ? 'active' : ''}" 
                     title="Profile Roulette: ${this.isRouletteEnabled ? 'ON' : 'OFF'}"
                     role="button" tabindex="0">
                    ${diceSvg}
                </div>
            </div>
            <div class="qps-items-container"></div>
        `;
    }

    renderItems() {
        const container = this.dropdownEl.querySelector('.qps-items-container');
        if (!container) return;

        if (!this.cachedProfiles.length) {
            container.innerHTML = `<div class="qps-empty">Nenhum perfil encontrado.<br>Crie um em API Connections.</div>`;
            return;
        }

        container.innerHTML = this.cachedProfiles.map(name => {
            const active = name === this.activeProfile;
            return `<div class="qps-item ${active ? 'active' : ''}"
                         role="option" tabindex="0" data-profile="${this.escapeHtml(name)}">
                        <span class="qps-dot">${active ? '●' : ''}</span>
                        <span class="qps-name">${this.escapeHtml(name)}</span>
                        ${active ? '<span class="qps-check">✓</span>' : ''}
                    </div>`;
        }).join('');
    }

    async openDropdown() {
        if (!this.dropdownEl || !this.btnEl || this.isOpen) return;

        // Renderização imediata (Stale-while-revalidate)
        this.dropdownEl.innerHTML = this.buildHeader();
        this.renderItems();

        // Setup temporário (invisível) para medir
        this.dropdownEl.style.visibility = 'hidden';
        this.dropdownEl.style.display = 'flex';

        const rect = this.btnEl.getBoundingClientRect();
        const h = this.dropdownEl.offsetHeight;
        const w = this.dropdownEl.offsetWidth;

        let top = rect.top - h - 6;
        if (top < 8) top = rect.bottom + 6;
        let left = rect.left;
        if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;

        this.dropdownEl.style.top = `${top}px`;
        this.dropdownEl.style.left = `${left}px`;
        this.dropdownEl.style.visibility = '';

        requestAnimationFrame(() => {
            this.dropdownEl.classList.add('open');
            this.btnEl.classList.add('active');
        });

        this.isOpen = true;

        // Listener de teclado
        document.addEventListener('keydown', this.handleKeyDown);

        // Fetch de dados atuais (background)
        const [freshProfiles, freshActive] = await Promise.all([this.fetchProfiles(), this.fetchActiveProfile()]);

        let needsUpdate = false;
        if (JSON.stringify(freshProfiles) !== JSON.stringify(this.cachedProfiles) || freshActive !== this.activeProfile) {
            this.cachedProfiles = freshProfiles || [];
            this.activeProfile = freshActive;
            needsUpdate = true;
        }

        if (needsUpdate && this.isOpen) {
            this.renderItems();
            this.updateTooltip();
        }
    }

    closeDropdown() {
        if (!this.isOpen) return;
        this.dropdownEl?.classList.remove('open');
        this.btnEl?.classList.remove('active');
        this.btnEl?.focus(); // Devolve o foco ao botão
        this.isOpen = false;

        document.removeEventListener('keydown', this.handleKeyDown);
    }

    async refreshState() {
        const [freshProfiles, freshActive] = await Promise.all([this.fetchProfiles(), this.fetchActiveProfile()]);
        this.cachedProfiles = freshProfiles || [];
        this.activeProfile = freshActive;
        this.updateTooltip();

        if (this.isOpen) {
            this.renderItems();
        }
    }

    updateTooltip() {
        if (this.btnEl) {
            this.btnEl.title = this.activeProfile ? `Perfil: ${this.activeProfile}` : 'Connection Profiles';
        }
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

// ── Init ──────────────────────────────────────────────────────────────────

const quickProfileSwitcher = new QuickProfileSwitcher();

jQuery(async () => {
    try {
        const { eventSource, event_types } = SillyTavern.getContext();
        eventSource.on(event_types.APP_READY, () => quickProfileSwitcher.init());

        // Failsafe caso APP_READY já tenha disparado
        setTimeout(() => quickProfileSwitcher.init(), 1500);
    } catch (e) {
        console.error(`[${EXT_NAME}] Erro crítico no setup:`, e);
        setTimeout(() => quickProfileSwitcher.init(), 2000);
    }
});
