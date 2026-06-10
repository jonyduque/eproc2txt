# Guia do Desenvolvedor - eproc2txt 💻

Este guia detalha o ambiente de desenvolvimento, padrões de codificação, regras de estilização (CSS customizado) e ferramentas de análise estática utilizadas no `eproc2txt`.

---

## 1. Configuração do Ambiente Local

### Pré-requisitos
- Node.js (versão 18 ou superior recomendado)
- Terminal PowerShell (ambiente Windows)

### Instalação e Desenvolvimento
Instale as dependências e inicie o Vite:
```powershell
npm install
npm run dev
```

### Scripts Disponíveis
- `npm run dev`: Inicia o Vite em modo desenvolvimento local.
- `npm run build`: Compila e otimiza a aplicação para a pasta `/dist`.
- `npm run preview`: Executa um servidor local servindo a pasta `/dist` gerada.
- `npm run lint`: Executa as verificações de código do **Biome**.
- `npm run lint:fix`: Aplica correções automáticas recomendadas pelo Biome.
- `npm run format`: Formata todos os arquivos de código-fonte.

---

## 2. Padrões de Estilo e Design System (Pure CSS)

O projeto adota uma política estrita de **CSS Customizado Puro** para manter controle total das animações, responsividade e layout espacial sem depender de utilitários pesados como TailwindCSS.

### Arquivo Central: `style.css`
Toda a estilização global e as variáveis CSS de design tokens residem em [style.css](file:///c:/Users/jonyd/Projetos/eproc2txt/style.css).

### Regras de Cores (Espaço `oklch`)
Evite usar cores genéricas (`red`, `blue`, etc.) ou formatos clássicos hexadecimais sem antes conferir a paleta `oklch`. O formato `oklch` garante uniformidade de brilho:
- **Fundo Escuro:** `oklch(0.16 0.02 260)` ➔ Variável `--color-bg-dark`
- **Superfície dos Painéis:** `oklch(0.20 0.025 260)` ➔ Variável `--color-bg-surface`
- **Ciano Elétrico (Destaque Principal):** `oklch(0.82 0.17 195)` ➔ Variável `--color-primary`
- **Cyber Magenta (Destaque Secundário):** `oklch(0.72 0.22 320)` ➔ Variável `--color-accent`

### Tipografia
- **Fontes Geométricas (Interface):** `"Space Grotesk"`, `system-ui`, `sans-serif`. Oferece visual tecnológico futurista e legibilidade.
- **Fontes Monospaced (Dados e Contadores):** `"JetBrains Mono"`, `monospace`. Utilizado para contadores numéricos, cronômetro e pré-visualizadores.
- **Layouts Estáveis:** Para cronômetros e contadores, sempre aplique a regra `font-variant-numeric: tabular-nums` para impedir que os números fiquem pulando lateralmente na tela a cada atualização de segundo ou milissegundo.

### Padrão de Componentes Visuais
1. **Painéis (`.panel`):** Utilizam fundo semi-transparente escuro, cantos arredondados, bordas de 1 pixel e filtro de desfoque de fundo (`backdrop-filter: blur(12px)`) para criar o efeito de glassmorphism de ficção científica.
2. **Painéis Ativos (`.panel-glow`):** Destacam painéis de controle e dados em execução ativa adicionando sombras e efeitos de reflexo na cor ciano elétrico.
3. **Efeitos de Hover:** Botões primários devem conter transições suaves com brilhos pulsantes (`animate-glow-pulse`) e efeitos de reflexo brilhante.

## 3. Práticas Recomendadas no Uso de Web Workers e APIs de Prevenção de Suspensão

Ao modificar ou estender o processamento em workers e rotinas de segundo plano:

- **Nunca Bloqueie a Main Thread:** Se você for executar qualquer rotina pesada de processamento de strings, manipulação de arquivos ou conversão de imagens, faça-o dentro do `pipeline.worker.js` ou em um worker separado.
- **Prevenção de Vazamento de Thread:** Toda inicialização ou encerramento da máquina de estados do pipeline deve chamar a limpeza explícita dos workers ativos através do método `coordinatorRef.current.terminateAllWorkers()` ou equivalente no hook cleanup.
- **Prevenção de Congelamento e Repouso:** Modificações no ciclo de vida do pipeline devem respeitar a aquisição e liberação das APIs de *Wake Lock* e *Silent Audio* (do módulo `src/utils/wake-lock-audio.js`). Sempre garanta que as funções `stopSilentAudio()` e `releaseWakeLock()` sejam acionadas em casos de erro, cancelamento, reinicialização ou unmount para evitar consumo desnecessário de bateria do dispositivo do usuário.
- **Transferência de Propriedade (Transferable Objects):** Ao postar dados de imagem gigantescos entre workers, sempre passe os buffers no segundo argumento de `postMessage(data, [transferables])`. Isso evita clonagem de memória lenta e protege o navegador contra travamentos por estouro de memória física.
- **Liberação Manual de Memória WASM:** O PDFium gerencia memória linear do WebAssembly. Lembre-se de explicitamente chamar `.destroy()` nas instâncias de página e documento no `pipeline.worker.js` assim que terminar o loop.

---

## 4. Análise Estática (Biome)

O projeto usa o **Biome** para linting e formatação rápida. O arquivo de configuração é o `biome.json`.

Antes de fazer qualquer commit ou entrega:
1. Execute `npm run lint` para checar erros de formatação ou de lógica.
2. Execute `npm run lint:fix` para corrigir o que for possível automaticamente.
3. Garanta que o código siga os padrões de consistência configurados (ex: aspas duplas, semicolons ativados, imports limpos).
