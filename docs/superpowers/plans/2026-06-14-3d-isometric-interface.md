# Plano de Implementação: Interface 3D Isométrica para eproc2txt

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar um cenário 3D isométrico unificado que se transforma dinamicamente de acordo com o estado do pipeline do eproc2txt, eliminando as representações 3D fragmentadas anteriores (ProcessBinder3D, DataVortex3D, HolographicSonar3D) e as substituindo por um fluxo fluido integrado.

**Architecture:** Criar o componente central `IsometricViewport3D` que recebe os estados do pipeline do React (`status`, `maxWorkers`, `workerStatuses`, `docStatuses`, `globalLoading`) e renderiza os elementos (Pilha, Processador CPU, e Ícone TXT Final) aplicando transições de translação espacial CSS3 e animações de fluxo em lote.

**Tech Stack:** React 18, TypeScript, CSS 3D Transforms (`transform-style: preserve-3d`), SVG.

---

### Task 1: Criar o componente `IsometricViewport3D` e estilos CSS

**Files:**
*   Create: `src/components/Layout/IsometricViewport3D.tsx`
*   Create: `src/components/Layout/IsometricViewport3D.css`

- [ ] **Passo 1: Criar o arquivo de estilos CSS com variáveis de cores e animações de fluxo**
    Crie o arquivo `src/components/Layout/IsometricViewport3D.css` com o suporte isométrico (`rotateX(52deg) rotateZ(-35deg)`) e animações de fluxo de página e stream de palavras.
    ```css
    .isometric-viewport {
      height: 400px;
      background: #090d16;
      border-radius: var(--border-radius-lg);
      position: relative;
      overflow: hidden;
      border: 1px solid var(--border-color);
      perspective: 1000px;
      margin-bottom: var(--space-6);
    }
    .iso-grid {
      position: absolute;
      width: 200%;
      height: 200%;
      background-image: 
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 45px 45px;
      transform: rotateX(52deg) rotateZ(-35deg) translateZ(-50px);
      opacity: 0.5;
    }
    .scene-container {
      position: absolute;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .object-3d {
      position: absolute;
      transform-style: preserve-3d;
      transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .pile-container {
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(-190px, 0, 0);
    }
    .pile-box {
      width: 80px; height: 100px;
      background: var(--surface-elevated);
      border: 2px solid var(--border-color);
      border-radius: var(--border-radius-md);
      position: relative;
      transform-style: preserve-3d;
    }
    .doc-sheet {
      position: absolute;
      width: 76px; height: 96px;
      background: #ffffff;
      border: 1.5px solid var(--color-text-muted);
      border-radius: var(--border-radius-sm);
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .doc-sheet::after {
      content: '';
      position: absolute;
      top: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 12px 12px 0;
      border-color: transparent #cbd5e1 transparent transparent;
    }
    .doc-line {
      height: 3px; background: #cbd5e1; border-radius: 1px;
    }
    .doc-line.sh { width: 40%; }
    .doc-line.md { width: 70%; }
    .doc-sheet:nth-child(1) { transform: translate3d(2px, 2px, 16px); }
    .doc-sheet:nth-child(2) { transform: translate3d(4px, 0px, 12px); }
    .doc-sheet:nth-child(3) { transform: translate3d(0px, 4px, 8px); }
    .doc-sheet:nth-child(4) { transform: translate3d(2px, 2px, 4px); }

    .processor-container {
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(0, 0, 0);
      width: 140px; height: 140px;
    }
    .proc-box {
      width: 140px; height: 140px;
      background: #0f172a;
      border: 3px solid #334155;
      border-radius: var(--border-radius-lg);
      box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
      position: relative;
      transform-style: preserve-3d;
    }
    .mini-core {
      position: absolute;
      width: 30px; height: 30px;
      background: var(--surface);
      border: 1.5px solid var(--border-color);
      border-radius: var(--border-radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-weight: bold; font-family: var(--font-mono);
      color: var(--color-text-secondary);
      transition: all 0.3s;
    }
    .mini-core.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--background);
      box-shadow: 0 0 12px var(--color-primary-glow);
    }
    .core-laser {
      position: absolute;
      width: 26px; height: 2px;
      background: #ffffff;
      box-shadow: 0 0 8px var(--color-primary);
      opacity: 0;
    }
    .mini-core.active .core-laser {
      opacity: 1;
      animation: coreScan 1s infinite alternate;
    }
    @keyframes coreScan {
      0% { top: 2px; }
      100% { top: 26px; }
    }

    .output-file-container {
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(180px, -20px, 0) scale(1.25);
      transform-style: preserve-3d;
    }
    .output-platform {
      width: 90px; height: 110px;
      background: rgba(20, 184, 166, 0.05);
      border: 2px dashed var(--color-success);
      border-radius: var(--border-radius-lg);
      position: relative;
      transform-style: preserve-3d;
      box-shadow: 0 0 15px rgba(20, 184, 166, 0.1);
      display: flex; align-items: center; justify-content: center;
    }
    .isometric-text-file {
      width: 70px; height: 90px;
      background: #ecfdf5;
      border: 2.5px solid var(--color-success);
      border-radius: var(--border-radius-md);
      position: absolute;
      transform-style: preserve-3d;
      transform: translateZ(15px);
      box-shadow: 6px 10px 25px rgba(0,0,0,0.35), 0 0 20px rgba(20, 184, 166, 0.25);
      display: flex; flex-direction: column;
      padding: 10px; gap: 4px;
      transition: transform 0.3s;
    }
    .isometric-text-file::after {
      content: '';
      position: absolute;
      top: -2.5px; right: -2.5px;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 14px 14px 0;
      border-color: transparent var(--color-success) transparent transparent;
    }
    .file-line {
      height: 4px; background: #a7f3d0; border-radius: 2px;
    }
    .file-line.title {
      background: var(--color-success); width: 50%; margin-bottom: 2px;
    }
    .file-line.sh { width: 40%; }
    .file-line.md { width: 75%; }
    .file-type-badge {
      position: absolute; bottom: 8px; right: 8px;
      font-size: 8px; font-family: var(--font-mono); font-weight: 900;
      background: var(--color-success); color: white;
      padding: 1px 4px; border-radius: 3px;
    }
    .output-platform.active .isometric-text-file {
      animation: filePulse 2s infinite alternate;
    }
    @keyframes filePulse {
      0% { transform: translateZ(15px); box-shadow: 6px 10px 25px rgba(0,0,0,0.35); }
      100% { transform: translateZ(28px); box-shadow: 10px 16px 35px rgba(0,0,0,0.45), 0 0 25px var(--color-success); }
    }

    #dynamic-lanes-container {
      position: absolute; width: 0; height: 0;
      transform-style: preserve-3d; z-index: 100;
    }
    .page-particle {
      position: absolute;
      width: 24px; height: 32px;
      background: #ffffff;
      border: 1.5px solid var(--color-text-muted);
      border-radius: 2px;
      box-shadow: 2px 2px 5px rgba(0,0,0,0.15);
      margin-left: -12px; margin-top: -16px;
      opacity: 0; pointer-events: none;
      transform-style: preserve-3d;
    }
    .text-particle {
      position: absolute;
      font-family: var(--font-mono);
      font-size: 8px; font-weight: bold;
      color: var(--color-primary);
      text-shadow: 0 0 6px var(--color-primary);
      white-space: nowrap;
      opacity: 0; pointer-events: none;
      transform-style: preserve-3d;
    }

    /* Coreografia de Estados */
    .viewport-idle .pile-container {
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(0, 0, 0) scale(1.2);
    }
    .viewport-idle .processor-container,
    .viewport-idle .output-file-container {
      opacity: 0;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(0, 0, -50px) scale(0);
      pointer-events: none;
    }
    .viewport-configuring .pile-container {
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(-190px, 0, 0) scale(1);
    }
    .viewport-configuring .processor-container {
      opacity: 0.8;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(0, 0, 0) scale(1);
    }
    .viewport-configuring .output-file-container {
      opacity: 0.8;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(180px, -20px, 0) scale(1.25);
    }
    .viewport-processing .pile-container {
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(-190px, 0, 0) scale(0.95);
    }
    .viewport-processing .processor-container {
      opacity: 1;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(0, 0, 0) scale(1);
    }
    .viewport-processing .output-file-container {
      opacity: 1;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(180px, -20px, 0) scale(1.25);
    }
    .viewport-completed .pile-container {
      opacity: 0.5;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(-190px, 0, 0) scale(0.85);
    }
    .viewport-completed .processor-container {
      opacity: 0.5;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(0, 0, 0) scale(0.85);
    }
    .viewport-completed .output-file-container {
      opacity: 1;
      transform: rotateX(52deg) rotateZ(-35deg) translate3d(0, -10px, 20px) scale(1.5);
    }
    ```

- [ ] **Passo 2: Criar o arquivo de componente React TypeScript**
    Crie o arquivo `src/components/Layout/IsometricViewport3D.tsx` que recebe os status e renderiza a cena isométrica e anima as lanes e nomes de arquivos.
    ```tsx
    import { useEffect, useState } from "react";
    import "./IsometricViewport3D.css";

    interface WorkerStatusItem {
      index: number;
      status: string;
      job?: string;
    }

    interface IsometricViewport3DProps {
      status: string;
      maxWorkers: number;
      workerStatuses: WorkerStatusItem[];
      docStatuses: Record<string, { status: string; fileName: string }>;
      globalLoading: boolean;
      isDragHovered?: boolean;
    }

    export default function IsometricViewport3D({
      status,
      maxWorkers,
      workerStatuses,
      docStatuses,
      globalLoading,
      isDragHovered = false,
    }: IsometricViewport3DProps) {
      const activeWorkers = workerStatuses.filter((w) => w.status === "active").length;
      
      // Calculate dynamic stack size
      const queuedCount = Object.values(docStatuses).filter((d) => d.status === "queued").length;
      const stackHeight = Math.min(4, Math.max(1, Math.round(queuedCount / 3)));

      const getStageClass = () => {
        if (status === "completed") return "viewport-completed";
        if (status === "processing") return "viewport-processing";
        if (status === "configuring") return "viewport-configuring";
        return "viewport-idle";
      };

      const [styleMarkup, setStyleMarkup] = useState<string>("");
      const [laneElements, setLaneElements] = useState<JSX.Element[]>([]);

      useEffect(() => {
        if (status !== "processing" || activeWorkers === 0) {
          setStyleMarkup("");
          setLaneElements([]);
          return;
        }

        const corePositions = [
          { x: -48, y: -48 }, // W1
          { x: 48, y: -48 },  // W2
          { x: -48, y: 48 },  // W3
          { x: 48, y: 48 },   // W4
          { x: 0, y: 0 }      // W5
        ];

        let rules = "";
        const elements: JSX.Element[] = [];

        workerStatuses.forEach((worker, index) => {
          if (worker.status !== "active" || index >= 5) return;
          const pos = corePositions[index];

          // Parse filename
          let jobFileName = "";
          if (worker.job) {
            const match = worker.job.match(/OCR\s+(.+?)\s+\(Pág/);
            jobFileName = match ? match[1] : worker.job.split(" ")[0] || "arquivo.pdf";
          }
          if (jobFileName.length > 18) jobFileName = jobFileName.substring(0, 16) + "...";

          elements.push(
            <div
              key={`page-${worker.index}`}
              className="page-particle"
              style={{
                animation: `flowPageLane-${index} 4s infinite cubic-bezier(0.4, 0, 0.2, 1)`,
                animationDelay: `${index * 0.8}s`
              }}
            />
          );

          elements.push(
            <div
              key={`text-${worker.index}`}
              className="text-particle"
              style={{
                animation: `flowTextLane-${index} 4s infinite linear`,
                animationDelay: `${index * 0.8 + 1.8}s`
              }}
            >
              {jobFileName}
            </div>
          );

          rules += `
            @keyframes flowPageLane-${index} {
              0% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(-190px, 0, 20px) scale(0.95); opacity: 0; }
              10% { opacity: 1; }
              40% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 20px) scale(0.7); opacity: 1; background: #ffffff; border-color: var(--color-primary); }
              45%, 55% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 5px) scale(0.6); opacity: 0.8; background: var(--color-primary-glow); border-color: var(--color-primary); }
              60% { opacity: 0; transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 5px) scale(0.45); }
              100% { opacity: 0; }
            }
            @keyframes flowTextLane-${index} {
              0% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(${pos.x}px, ${pos.y}px, 10px); opacity: 0; }
              10% { opacity: 1; color: var(--color-primary); }
              80% { opacity: 1; color: var(--color-success); }
              100% { transform: rotateX(52deg) rotateZ(-35deg) translate3d(180px, -20px, 30px); opacity: 0; }
            }
          `;
        });

        setStyleMarkup(rules);
        setLaneElements(elements);
      }, [status, activeWorkers, workerStatuses]);

      const coreIndexes = [0, 1, 2, 3, 4];
      const coreStyles = [
        { top: "15px", left: "15px" },
        { top: "15px", left: "111px" },
        { top: "111px", left: "15px" },
        { top: "111px", left: "111px" },
        { top: "63px", left: "63px" }
      ];

      return (
        <div className={`isometric-viewport ${getStageClass()}`}>
          <div className="iso-grid" />
          {styleMarkup && <style>{styleMarkup}</style>}
          
          <div className="scene-container">
            <div id="dynamic-lanes-container">{laneElements}</div>

            {/* Pile */}
            <div className="object-3d pile-container">
              <div className="pile-box" style={{ borderColor: isDragHovered ? "var(--color-accent)" : "" }}>
                {Array.from({ length: stackHeight }).map((_, i) => (
                  <div key={i} className="doc-sheet" style={{ transform: `translate3d(${i * 2}px, ${-i * 2}px, ${i * 4}px)` }}>
                    <div className="doc-line md" />
                    <div className="doc-line" />
                    <div className="doc-line sh" />
                  </div>
                ))}
              </div>
            </div>

            {/* Processor */}
            <div className="object-3d processor-container">
              <div className="proc-box">
                {coreIndexes.map((i) => {
                  const isActive = status === "processing" && i < maxWorkers;
                  const isWorking = isActive && workerStatuses[i]?.status === "active";
                  return (
                    <div
                      key={i}
                      className={`mini-core ${isWorking ? "active" : ""}`}
                      style={coreStyles[i]}
                    >
                      {`W${i + 1}`}
                      <div className="core-laser" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Output File */}
            <div className="object-3d output-file-container">
              <div className={`output-platform ${status === "completed" || status === "processing" ? "active" : ""}`}>
                <div className="isometric-text-file">
                  <div className="file-line title" />
                  <div className="file-line md" />
                  <div className="file-line sh" />
                  <div className="file-line md" />
                  <div className="file-line" />
                  <div className="file-type-badge">{status === "completed" ? "XML" : "TXT"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    ```

- [ ] **Passo 3: Executar a verificação com o Biome para certificar que não existem erros de formatação**
    Run: `npm run lint`
    Expected: PASS

- [ ] **Passo 4: Realizar o commit das modificações**
    ```bash
    git add src/components/Layout/IsometricViewport3D.tsx src/components/Layout/IsometricViewport3D.css
    git commit -m "feat: create IsometricViewport3D component and CSS styles"
    ```

---

### Task 2: Integrar `IsometricViewport3D` no `App.jsx`

**Files:**
*   Modify: `src/App.jsx`

- [ ] **Passo 1: Modificar `App.jsx` para importar e renderizar o componente `IsometricViewport3D`**
    Abra `src/App.jsx`. Adicione o import de `IsometricViewport3D` e passe o estado do pipeline a ele.
    ```jsx
    // ... no topo do arquivo ...
    import IsometricViewport3D from "./components/Layout/IsometricViewport3D";
    // ... dentro de App() ...
    ```
    Posicione-o no topo da seção de conteúdo wrapper:
    ```jsx
    	return (
    		<main className="app-main-layout">
    			<BackgroundGradientAnimation
    				containerClassName="app-fixed-background-gradient"
    				interactive={true}
    			/>
    			<BackgroundFX />
    			<Header statusClass={statusClass} statusLabel={statusLabel} />
    			<section className="app-content-wrapper">
    				<IsometricViewport3D
    					status={status}
    					maxWorkers={maxWorkers}
    					workerStatuses={workerStatuses}
    					docStatuses={docStatuses}
    					globalLoading={globalLoading}
    				/>
    				{renderScreen()}
    			</section>
    			<Footer mockState={mockState} setMockState={setMockState} />
    		</main>
    	);
    ```

- [ ] **Passo 2: Executar Biome lint**
    Run: `npm run lint`
    Expected: PASS

- [ ] **Passo 3: Fazer o commit da integração**
    ```bash
    git add src/App.jsx
    git commit -m "feat: integrate IsometricViewport3D into App.jsx layout"
    ```

---

### Task 3: Limpar e refatorar `LoadingScreen`

**Files:**
*   Modify: `src/components/LoadingScreen/LoadingScreen.jsx`
*   Modify: `src/components/LoadingScreen/Dropzone/Dropzone.tsx`
*   Delete: `src/components/LoadingScreen/Dropzone/DataVortex3D.tsx`

- [ ] **Passo 1: Remover o uso do `DataVortex3D` em `Dropzone.tsx`**
    Abra `Dropzone.tsx`. Remova o import de `DataVortex3D`. Remova o elemento `<DataVortex3D ... />` e substitua-o por um ícone estático ou remova os elementos secundários de órbita do vortex.
    ```tsx
    // Substituir:
    // <DataVortex3D isHovered={hover} isLoading={loading} />
    // Por nada, pois a animação isométrica acima agora serve como o visual principal do estado Idle!
    ```

- [ ] **Passo 2: Atualizar `LoadingScreen.jsx`**
    Remova qualquer estilo redundante. Como o `IsometricViewport3D` está no wrapper pai, certifique-se de que a `LoadingScreen` flui abaixo do viewport de forma limpa.

- [ ] **Passo 3: Excluir o arquivo `DataVortex3D.tsx` do diretório**
    Run: `rm src/components/LoadingScreen/Dropzone/DataVortex3D.tsx`

- [ ] **Passo 4: Rodar o Biome para validação**
    Run: `npm run lint`
    Expected: PASS

- [ ] **Passo 5: Fazer o commit**
    ```bash
    git add src/components/LoadingScreen/
    git commit -m "refactor: clean up LoadingScreen and delete DataVortex3D"
    ```

---

### Task 4: Limpar e refatorar `ConfigScreen`

**Files:**
*   Modify: `src/components/ConfigScreen/ConfigScreen.jsx`
*   Delete: `src/components/ConfigScreen/ProcessBinder3D.tsx`
*   Delete: `src/components/ConfigScreen/ProcessBinder3D.css`

- [ ] **Passo 1: Remover o binder de `ConfigScreen.jsx`**
    Abra `src/components/ConfigScreen/ConfigScreen.jsx`. Remova o import de `ProcessBinder3D`.
    Remova `<ProcessBinder3D ... />` da renderização. A grid `.loaded-layout-grid` passará a ter apenas duas colunas (Tree de arquivos e painel de configuração), que ocupará a largura restante de forma limpa.

- [ ] **Passo 2: Excluir os arquivos do Binder**
    Run: `rm src/components/ConfigScreen/ProcessBinder3D.tsx`, `rm src/components/ConfigScreen/ProcessBinder3D.css`

- [ ] **Passo 3: Validar a formatação**
    Run: `npm run lint`
    Expected: PASS

- [ ] **Passo 4: Fazer o commit das mudanças**
    ```bash
    git add src/components/ConfigScreen/
    git commit -m "refactor: remove ProcessBinder3D from ConfigScreen"
    ```

---

### Task 5: Limpar e refatorar `ProcessingScreen`

**Files:**
*   Modify: `src/components/ProcessingScreen/ProcessingScreen.tsx`
*   Delete: `src/components/ProcessingScreen/HolographicSonar3D.tsx`
*   Delete: `src/components/ProcessingScreen/HolographicSonar3D.css`

- [ ] **Passo 1: Limpar os computadores retro e o radar de `ProcessingScreen.tsx`**
    Abra `src/components/ProcessingScreen/ProcessingScreen.tsx`.
    Remova o componente `RetroComputer`, `HolographicSonar3D`, as posições de computadores e a renderização do `.radar-console-board`.
    A `ProcessingScreen` passará a exibir apenas a barra superior de estatísticas de progresso, e na parte de baixo a lista de documentos e status de arquivos, de forma muito mais legível e limpa.

- [ ] **Passo 2: Remover os arquivos do HolographicSonar3D**
    Run: `rm src/components/ProcessingScreen/HolographicSonar3D.tsx`, `rm src/components/ProcessingScreen/HolographicSonar3D.css`

- [ ] **Passo 3: Validar com o Biome**
    Run: `npm run lint`
    Expected: PASS

- [ ] **Passo 4: Fazer o commit da limpeza**
    ```bash
    git add src/components/ProcessingScreen/
    git commit -m "refactor: remove retro computers and HolographicSonar3D from ProcessingScreen"
    ```

---

### Task 6: Validar e buildar a aplicação localmente

- [ ] **Passo 1: Rodar o lint final na aplicação**
    Run: `npm run lint`
    Expected: PASS (Sem lints pendentes em nenhum arquivo)

- [ ] **Passo 2: Executar o build de produção com o Vite**
    Run: `npm run build`
    Expected: PASS (Build concluída com sucesso no diretório dist, garantindo que não existem imports quebrados ou erros de compilação do TypeScript/React)
