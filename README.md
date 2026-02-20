# Quick Profile Switcher V2

Uma extensão avançada para [SillyTavern](https://github.com/SillyTavern/SillyTavern) que adiciona um botão rápido na barra de entrada de texto (chat input bar) para trocar seus Perfis de Conexão (API Providers/Models) de forma flúida e sem sair da conversa.
Esta é uma evolução massiva (V2) de antigas versões base, trazendo um visual premium adaptável e sistema de "Roleta" inteligente.

---

## ✨ Features (O que há de novo na V2)

- **Menu Drop-up Avançado** — Clique no chevron na barra de envio e um menu flutuante responsivo surgirá.
- **Integração Total de Tema (CSS Nativo)** — Sem quebras visuais. O plugin injeta e puxa automaticamente a paleta atual do SillyTavern (`--SmartThemeBodyColor`, `--SmartThemeQuoteColor`, etc), não importa se é Claro ou Escuro.
- **🎲 Roleta Inteligente (Modo Dado)** — Modo ativado por clique que permite selecionar múltiplos perfis por *checkbox*.
- **Interceptação Dinâmica** — Assim que você clica em enviar a mensagem, a extensão *gira o dado*, trocando a máquina no backend na velocidade da luz para o próximo perfil sorteado da sua pool.
- **Anti-Repetição:** O algoritmo da roleta evita sortear o mesmo provedor ativo se as opções forem maiores que 1.
- **Feedback Visual (Fa-Spin)** — Os ícones disparam animações da biblioteca nativa quando uma troca ou requisição ocorre.
- **Ordem Alfabética Automática** — Fim da bagunça, seus perfis sempre aparecerão em ordem de A-Z.
- **Salvamento Persistente** — A lista de roleta sobrevive a reloads pelo objeto global `extension_settings`.

---

## 💻 Instalação

**Pelo terminal do GIT/Arquivos (Para Devs):**

1. Clone ou baixe esse repositório zipado.
2. Jogue a pasta raiz inteira (`Quick-Profile-Switcher`) no seguinte caminho da sua instância local:
   ```
   SillyTavern/public/scripts/extensions/third-party/
   ```
3. Feche ou recarregue a página (F5) do SillyTavern.

---

## 🕹️ Como Usar

1. Note o ícone de **seta para cima (Chevron)** ao lado esquerdo do seu botão de enviar principal.
2. Clique nele para expôr a lista de seus perfis. A bolinha e cores fortes apontam para quem está operando agora.
3. Se quiser pular manualmente, basta **clicar em um deles**, o menu fecha, o ST pisca o olho, e você está em nova sintonia.
4. Para a Loucura Aleatória: clique no ícone de **Dado**. Checkboxes visuais aparecerão ao lado direito dos itens.
5. Marque seus favoritos para participar da mesa. Quando terminar, basta ignorar ou fechar o menu e começar a papear. A roleta cuidará do resto!

---

## 🛠️ Detalhes Técnicos

Esta extensão utiliza injeções no motor central através da `api` de Slash Commands. Métodos obsoletos baseados em `<select>`, `<input>` foram substituídos por constructos modulares HTML e a biblioteca *FontAwesome* nativa, o que corta em 95% o atrito de renderizações bizarras em browsers diferentes.

**License:** MIT
