# Especificação de Design: Interface 3D Isométrica para eproc2txt

Esta especificação detalha a arquitetura visual, comportamento de animações e coreografia de transições da nova interface 3D isométrica para o conversor de processos judiciais `eproc2txt`.

---

## 1. Visão Geral e Objetivos
O objetivo deste design é modernizar a experiência visual do usuário, tornando-a premium, dinâmica e imersiva. Através de uma projeção isométrica vetorial pura (HTML5, SVG e CSS3), a interface dará feedback físico direto e tangível sobre as fases do pipeline (Aguardando ZIP ➔ Configuração ➔ Processando OCR ➔ Concluído).

---

## 2. Arquitetura Visual Isométrica

O cenário 3D será renderizado dentro de um viewport responsivo com perspectiva controlada por CSS:
*   **Viewport CSS:** `.isometric-viewport` configurado com `perspective: 1000px`.
*   **Grade Isométrica (Fundo):** Linhas de grade suaves em ângulo isométrico usando `background-image` linear-gradient rotacionado em 3D.
*   **Giro e Foco do Cenário:** O cenário será rotacionado usando `transform: rotateX(52deg) rotateZ(-35deg)` e `transform-style: preserve-3d`. Esta rotação específica traz o lado direito (o arquivo de saída final) mais próximo do espectador (zoom natural).

### Componentes do Cenário 3D

1.  **Pilha de Documentos (Entrada - Esquerda):**
    *   Representa os arquivos extraídos do ZIP judicial na fila.
    *   Renderizada com camadas empilhadas de SVGs que imitam folhas de papel físicas.
    *   A altura física da pilha de papel diminui gradualmente à medida que o processamento avança.

2.  **Processador Central (CPU - Centro):**
    *   Um bloco isométrico representando o processador.
    *   Possui 5 núcleos secundários ("Mini-Cores" W1 a W5) correspondentes aos 5 slots máximos de Workers.
    *   Apenas os núcleos correspondentes aos Workers configurados pelo usuário acendem (ex: se o usuário escolher 3 Workers, W1, W2 e W3 acendem e os outros ficam apagados/cinza).
    *   Cada núcleo ativo possui uma linha laser horizontal pulsante (`core-laser`) que se move de cima para baixo simulando a varredura OCR.

3.  **Ícone de Arquivo de Texto Final (Saída - Direita):**
    *   Um ícone grande de documento 3D com a dobra superior clássica de arquivo, com etiqueta destacada de `.TXT`/`.XML`.
    *   Possui escala de **1.25x** em relação aos outros elementos para dar destaque ao resultado.
    *   Glow verde neon pulsante na base e flutuação suave vertical controlada por animação CSS (`translateZ(15px)` até `translateZ(30px)`).

---

## 3. Comportamento das Animações e Sincronização com OCR (Multithread)

A animação do fluxo de dados não é meramente cosmética; ela é conectada diretamente aos eventos emitidos pelo `PipelineCoordinator`.

*   **Mapeamento de Lanes Paralelas:**
    *   O número de Workers ativos selecionado (1 a 5) cria exatamente o mesmo número de caminhos (lanes) físicos de animação ligando a Pilha de Documentos ao respectivo Mini-Core no processador, e deste ao arquivo de texto na direita.
*   **Sequência do Fluxo Híbrido:**
    1.  **Páginas Físicas:** Uma folha de papel SVG se eleva da Pilha de Entrada e voa até o Mini-Core ativo da respectiva thread de processamento.
    2.  **Varredura OCR:** No Mini-Core, o laser azul varre o documento. A folha de papel pisca em azul/roxo e dissolve (sua opacidade vai a zero).
    3.  **Fluxo de Texto (Palavras):** Imediatamente, uma linha textual brilhante contendo o nome real do arquivo sendo processado naquele momento (ex: `SENTENÇA_04.pdf`) emerge do processador e viaja até o documento final à direita.
*   **Feedback de Latência Real:**
    *   Se o OCR de uma página for rápido, o ciclo da animação corre rápido.
    *   Se um arquivo PDF pesado travar o OCR, a página correspondente permanece "estacionada" no Mini-Core sob o laser piscando e a emissão de palavras cessa naquela lane até que o Worker conclua, dando feedback físico imediato de gargalo de processamento.

---

## 4. Coreografia das Transições de Tela

Os elementos 3D se movem e se transformam dinamicamente para guiar o foco visual nas diferentes fases:

1.  **Aguardando ZIP (`LoadingScreen`):**
    *   Apenas a Pilha de Documentos (vazia/desativada) é visível no centro do viewport.
    *   *Interação:* Arrastar o ZIP sobre o drop zone faz a pilha brilhar e a "tampa" se abrir em 3D. Soltar o ZIP enche a pilha de folhas.
2.  **Configurações (`ConfigScreen`):**
    *   A Pilha de Documentos desliza suavemente para a esquerda.
    *   O Processador Central e o Arquivo de Texto Final surgem de baixo para cima (`fade-in` + `translateZ` positivo).
3.  **Processando (`ProcessingScreen`):**
    *   O painel de configurações desaparece por completo da interface.
    *   O viewport 3D ganha destaque central e os Mini-Cores ativos acendem, disparando o fluxo de páginas e palavras em tempo real.
4.  **Finalizado (`DoneScreen`):**
    *   O fluxo de dados cessa. Os lasers do processador se apagam.
    *   O Arquivo de Texto Final à direita se eleva mais alto, brilha intensamente em verde neon e ativa os botões de "Baixar XML" e "Copiar" posicionados logo abaixo ou acoplados ao objeto em 3D.

---

## 5. Plano de Verificação

### Testes Visuais e Interativos (Visual Companion)
*   Verificar alinhamento de caminhos de animação em resoluções de tela variadas (responsividade).
*   Testar transição entre os estados disparando eventos mockados no console do navegador.
*   Validar se o número de partículas geradas simultaneamente não causa queda na taxa de quadros (FPS) do navegador.

### Testes de Integração com o Pipeline Real
*   Confirmar que o mapeamento `workerStatuses.length` liga/desliga os lasers e lanes correspondentes corretos.
*   Garantir que os nomes de arquivos reais enviados no progresso do pipeline de workers sejam alimentados corretamente nas partículas de texto `.text-particle`.
