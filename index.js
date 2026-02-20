/**
 * Quick Profile Switcher V2
 * 
 * Uma extensão completa para troca e sorteio inteligente de provedores de API / Connections baseada 
 * numa arquitetura CSS modular livre de bugs de inputs nativos.
 * Evolução da extensão base. Projetada para fluidez total.
 */

import { extension_settings, getContext } from "../../../extensions.js";

const extensionName = "Quick-Profile-Switcher";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Configurações padrão caso o usuário esteja abrindo pela primeira vez
const defaultSettings = {
    is_random_active: false,
    selected_profiles_list: []
};

let qpsSettings = defaultSettings;

/**
 * Função principal que injeta o UI no botão de enviar e cria o Menu Drop-up.
 * Analogia: É como soldar uma peça extra no motor do carro.
 */
function createChevronUI() {
    const sendForm = document.getElementById('send_form');
    if (!sendForm) return;

    // 1. Criamos o nosso botão Chevron
    const chevronBtn = document.createElement('div');
    chevronBtn.id = 'qps-chevron-btn';
    chevronBtn.title = 'Quick Profile Switcher';
    chevronBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';

    // 2. Criamos a "Janelinha" do Menu Drop-up
    const menuContainer = document.createElement('div');
    menuContainer.id = 'qps-menu-container';

    // O esqueleto da nossa janela com "Header" (apenas o botão de dado alinhado à direita) e "Body" (a lista)
    menuContainer.innerHTML = `
        <div class="qps-menu-header">
            <i id="qps-dice-btn" class="fa-solid fa-dice" title="Toggle Random Mode" style="cursor: pointer; transition: all 0.2s ease; font-size: 1.1rem;"></i>
        </div>
        <div class="qps-menu-body" id="qps-profiles-list">
            <div style="text-align: center; color: var(--SmartThemeQuoteColor); font-style: italic;">
                Loading profiles...
            </div>
        </div>
    `;

    // 2.5 Configurando o Dado (Estado Inicial) e Efeito
    const diceBtn = menuContainer.querySelector('#qps-dice-btn');
    if (qpsSettings.is_random_active) {
        diceBtn.style.color = 'var(--SmartThemeQuoteColor)';
        diceBtn.style.textShadow = '0 0 8px var(--SmartThemeQuoteColor)';
    }

    diceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        qpsSettings.is_random_active = !qpsSettings.is_random_active;
        extension_settings[extensionName] = qpsSettings;

        // Efeito Visual do Dado (Acende e dá "Glow")
        if (qpsSettings.is_random_active) {
            diceBtn.style.color = 'var(--SmartThemeQuoteColor)';
            diceBtn.style.textShadow = '0 0 8px var(--SmartThemeQuoteColor)';
        } else {
            diceBtn.style.color = '';
            diceBtn.style.textShadow = '';
        }

        // Ativa a exibição das checkboxes na lista
        const listBody = document.getElementById('qps-profiles-list');
        if (listBody) {
            if (qpsSettings.is_random_active) {
                listBody.classList.add('roulette-mode');
            } else {
                listBody.classList.remove('roulette-mode');
            }
        }
    });

    // 3. Adicionamos a ação de clique do Chevron para abrir/fechar o Menu
    chevronBtn.addEventListener('click', (e) => {
        // Evita que clicar no chevron "vaze" o clique para fora e feche o menu na mesma hora
        e.stopPropagation();

        chevronBtn.classList.toggle('active'); // Gira a setinha
        menuContainer.classList.toggle('show'); // Mostra/Esconde a caixa do menu
    });

    // Truque mestre: Se o usuário clicar fora do menu, ele fecha sozinho (como um popup real)
    document.addEventListener('click', (e) => {
        if (!menuContainer.contains(e.target) && e.target !== chevronBtn) {
            chevronBtn.classList.remove('active');
            menuContainer.classList.remove('show');
        }
    });

    // Evita o menu fechar se o cara clicar dentro dele
    menuContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 4. Injetamos O MANU na mesma "zona" do botão de envio
    sendForm.appendChild(menuContainer);

    // 5. Injetamos o CHEVRON exatamente à esquerda do botão de enviar (send_but)
    const sendBtn = document.getElementById('send_but');
    if (sendBtn) {
        sendBtn.parentNode.insertBefore(chevronBtn, sendBtn);
    } else {
        sendForm.appendChild(chevronBtn);
    }
}

// ==========================================
// Comunicação com o SillyTavern Core (Slash Commands)
// ==========================================

let executeSlashCommands = null;

async function loadSlashCommandRunner() {
    try {
        const mod = await import('../../../script.js');
        executeSlashCommands = mod.executeSlashCommandsWithOptions ?? mod.executeSlashCommands;
    } catch {
        const ctx = getContext();
        executeSlashCommands = ctx.executeSlashCommandsWithOptions ?? ctx.executeSlashCommands ?? null;
    }
}

async function runCommand(cmd) {
    if (!executeSlashCommands) return null;
    try {
        const result = await executeSlashCommands(cmd, { showOutput: false, handleParserErrors: false });
        return result?.pipe ?? result?.output ?? result ?? null;
    } catch (e) {
        console.warn(`[Quick-Profile-Switcher] Command failed: ${cmd}`, e);
        return null;
    }
}

async function populateProfilesList() {
    const listContainer = document.getElementById('qps-profiles-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; color: var(--SmartThemeQuoteColor); font-style: italic;">Loading...</div>';

    try {
        const rawList = await runCommand('/profile-list');
        const activeProfile = (await runCommand('/profile'))?.trim();

        let profiles = rawList ? JSON.parse(rawList) : [];

        if (!Array.isArray(profiles) || profiles.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--SmartThemeQuoteColor);">No profiles found.</div>';
            return;
        }

        // Ordenando Alfabeticamente (A-Z)
        profiles.sort((a, b) => a.localeCompare(b));

        listContainer.innerHTML = ''; // Limpa o "Loading"

        // Se o dropdown iniciar com a roleta ligada, a classe já garante as ticks na tela
        if (qpsSettings.is_random_active) {
            listContainer.classList.add('roulette-mode');
        }

        profiles.forEach(name => {
            const isActive = name === activeProfile;

            // Criando visual de cada "linha" da lista via CSS classes
            const item = document.createElement('div');
            item.className = 'qps-profile-item' + (isActive ? ' active-profile' : '');

            // --- LADO ESQUERDO (Nome do Perfil) ---
            const leftBlock = document.createElement('div');
            leftBlock.className = 'qps-profile-left-block';
            leftBlock.innerHTML = `<span>${name}</span> ${isActive ? '<i class="fa-solid fa-check"></i>' : ''}`;

            // --- LADO DIREITO (Checkbox visual via FontAwesome no roulette-mode) ---
            const rightBlock = document.createElement('div');
            rightBlock.className = 'qps-profile-checkbox-container';
            rightBlock.title = 'Add to roulette';

            const checkboxIcon = document.createElement('i');
            const isChecked = qpsSettings.selected_profiles_list.includes(name);

            // Define o visual inicial baseado em estar na lista ou não
            checkboxIcon.className = 'qps-profile-checkbox-icon ' + (isChecked ? 'fa-solid fa-square-check' : 'fa-regular fa-square');
            if (isChecked) checkboxIcon.style.color = 'var(--SmartThemeQuoteColor)';

            rightBlock.appendChild(checkboxIcon);

            // Mudança interativa ao clicar e salvamento
            rightBlock.addEventListener('click', (e) => {
                e.stopPropagation();

                const currentlyChecked = qpsSettings.selected_profiles_list.includes(name);

                if (currentlyChecked) {
                    // Desmarcar
                    qpsSettings.selected_profiles_list = qpsSettings.selected_profiles_list.filter(n => n !== name);
                    checkboxIcon.className = 'qps-profile-checkbox-icon fa-regular fa-square';
                    checkboxIcon.style.color = '';
                } else {
                    // Marcar
                    qpsSettings.selected_profiles_list.push(name);
                    checkboxIcon.className = 'qps-profile-checkbox-icon fa-solid fa-square-check';
                    checkboxIcon.style.color = 'var(--SmartThemeQuoteColor)';
                }

                extension_settings[extensionName] = qpsSettings;
            });

            // Adiciona blocos à linha
            item.appendChild(leftBlock);
            item.appendChild(rightBlock);

            // Clicar em literalmente qualquer área da linha além do checkbox
            item.addEventListener('click', async () => {
                await runCommand(`/profile ${name}`);

                // Recarrega o state para trocar a bolinha
                populateProfilesList();

                document.getElementById('qps-menu-container').classList.remove('show');
                document.getElementById('qps-chevron-btn').classList.remove('active');
            });

            listContainer.appendChild(item);
        });

    } catch (e) {
        console.error("Erro ao puxar profiles:", e);
        listContainer.innerHTML = '<div style="color: red;">Failed to load.</div>';
    }
}

async function triggerRandomProfile() {
    const pool = qpsSettings.selected_profiles_list;

    // Se não tiver ninguém selecionado, não faz nada
    if (!pool || pool.length === 0) return;

    const activeProfile = (await runCommand('/profile'))?.trim();

    // Cuidando para tentar não repetir o mesmo perfil de sempre (se houver mais de 1 opção)
    let candidates = pool;
    if (pool.length > 1 && pool.includes(activeProfile)) {
        candidates = pool.filter(p => p !== activeProfile);
    }

    // Sorteio
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosenProfile = candidates[randomIndex];

    // Efeitos Visuais de Processamento usando as classes nativas do FontAwesome do ST
    const chevronIcon = document.querySelector('#qps-chevron-btn i');
    if (chevronIcon) {
        chevronIcon.classList.add('fa-spin');
        setTimeout(() => chevronIcon.classList.remove('fa-spin'), 1000);
    }

    const diceBtn = document.getElementById('qps-dice-btn');
    if (diceBtn) {
        diceBtn.classList.add('fa-spin');
        setTimeout(() => diceBtn.classList.remove('fa-spin'), 1000);
    }

    // Pede educadamente pro ST mudar a config instantaneamente
    await runCommand(`/profile ${chosenProfile}`);

    // Atualiza o painel no fundo (caso esteja aberto, pra bolinha "check" pular)
    populateProfilesList();
}

/**
 * Ponto de entrada da extensão.
 * O SillyTavern roda isso quando toda a página termina de carregar.
 */
jQuery(async () => {
    // Carrega as configurações guardadas ou usa as padrões
    const settings = extension_settings[extensionName] || defaultSettings;

    // Assegura estrutura do objeto para configs antigas ou nulas
    if (!Array.isArray(settings.selected_profiles_list)) settings.selected_profiles_list = [];

    qpsSettings = settings;
    extension_settings[extensionName] = qpsSettings;

    // Prepara a injeção do runner
    await loadSlashCommandRunner();

    // Constrói a UI
    createChevronUI();

    // Assim que a interface carrega, já busca os perfis no fundo
    populateProfilesList();

    // ==========================================
    // Eventos do Sistema: A Roleta "Dice" 
    // ==========================================
    try {
        const { eventSource, event_types } = getContext();
        if (eventSource && event_types && event_types.GENERATION_STARTED) {
            // Em cada vez que o SillyTavern começa a gerar uma reposta ou a gente envia...
            eventSource.on(event_types.GENERATION_STARTED, async () => {
                // ...Só rodamos a roleta se o dado estiver ligado e existir perfis tickados!
                if (qpsSettings.is_random_active) {
                    await triggerRandomProfile();
                }
            });
        }
    } catch (e) {
        console.error("[Quick-Profile-Switcher] Erro ao engatar os eventos de roleta:", e);
    }
});
