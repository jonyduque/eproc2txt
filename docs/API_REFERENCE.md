# Referência de API e Protocolo - eproc2txt 📝

Este documento especifica a interface de programação de aplicações (API), as assinaturas dos hooks, métodos do coordenador e o protocolo de mensagens de Web Workers utilizado no `eproc2txt`.

---

## 1. Custom Hook `usePipeline`

O hook `usePipeline` encapsula o estado global de execução do pipeline.

### Assinatura do Retorno

```javascript
const pipeline = usePipeline();
```

#### Propriedades de Estado
- **`status`** (`string`): Estado atual do pipeline. Valores: `"idle"`, `"configuring"`, `"processing"`, `"completed"`.
- **`globalLoading`** (`boolean`): Indica se o arquivo ZIP está sendo carregado e pré-processado na memória.
- **`zipName`** (`string`): Nome do arquivo ZIP carregado.
- **`tree`** (`Array`): Árvore estruturada de eventos e documentos gerada pelo parse do ZIP.
- **`ignoredFiles`** (`Array`): Lista de arquivos presentes no ZIP que foram rejeitados por nomenclatura ou formato.
- **`selectedPaths`** (`Set<string>`): Conjunto de caminhos de arquivos selecionados pelo usuário para processamento.
- **`isPaused`** (`boolean`): Indica se o pipeline foi pausado pelo usuário.
- **`pdfPages`** (`number`): Total de páginas de PDF processadas via texto nativo.
- **`ocrPages`** (`number`): Total de páginas processadas através de OCR.
- **`progressPercentage`** (`number`): Porcentagem de conclusão global (0 a 100).
- **`progressText`** (`string`): Texto descritivo do status do progresso atual.
- **`consolidatedXml`** (`string`): O XML final consolidado gerado.
- **`workerStatuses`** (`Array`): Status individual de cada um dos 5 slots de workers. Exemplo: `[{ index: 1, status: "active", job: "OCR..." }]`.
- **`docStatuses`** (`Object`): Dicionário contendo o estado detalhado de processamento de cada arquivo.
- **`mockState`** (`string|null`): Indica se a interface está rodando em modo simulação (`"loaded"`, `"processing"`, `"completed"` ou `null`).
- **`maxWorkers`** (`number`): Número máximo de workers de OCR simultâneos (1 a 5).
- **`tessModel`** (`string`): Modelo do Tesseract em execução (`"fast"`, `"standard"`, `"best"`).
- **`elapsedTime`** (`string`): Tempo de processamento decorrido formatado (`mm:ss.cc`).
- **`elapsedMs`** (`number`): Tempo decorrido em milissegundos.

#### Funções de Ação
- **`startPipeline(selectedFiles)`**: Inicia o processamento dos arquivos selecionados.
- **`cancelPipeline()`**: Cancela a execução ativa, finaliza os workers e retorna para o estado de configuração.
- **`resetPipeline()`**: Reinicia o pipeline completo limpando todos os estados e arquivos carregados.
- **`pausePipeline()`**: Pausa temporariamente o processamento dos arquivos.
- **`resumePipeline()`**: Retoma o processamento pausado.
- **`setWorkers(count)`**: Altera a quantidade de workers concorrentes (1 a 5).
- **`setTessModel(model)`**: Define o modelo de dados do Tesseract.
- **`setSelectedPaths(paths)`**: Define o conjunto de caminhos de arquivos selecionados na árvore.
- **`setMockState(state)`**: Ativa ou desativa simulações na UI.
- **`handleZipParsed(zipData, zipName, tree, ignoredFiles)`**: Inicializa o estado a partir do parse concluído de um arquivo ZIP.

---

## 2. Classe `PipelineCoordinator`

Localizada em `src/utils/PipelineCoordinator.js`, ela gerencia o fluxo de trabalho assíncrono entre a interface React e os Workers.

### Construtor

```javascript
import PipelineCoordinator from "./utils/PipelineCoordinator.js";

const coordinator = new PipelineCoordinator({
  onDocStart: (fileName) => {},
  onDocInfo: (fileName, pageCount) => {},
  onPageNative: (fileName, page, pageCount, content) => {},
  onPageOcrRequest: (fileName, page, pageCount, jobId) => {},
  onOcrSuccess: (jobId, text, fileName, page, pageCount) => {},
  onOcrError: (jobId, message, fileName, page, pageCount) => {},
  onFinished: (processedDocs, currentTree) => {},
  onError: (message) => {},
  onWorkerStatusUpdate: (index, status, jobText) => {}
});
```

### Métodos Principais
- **`start(zipData, selectedFiles, maxOcrWorkers, tessModel, currentTree)`**: Inicializa os pools de workers, abre a thread do `PipelineWorker` e inicia o processamento do array buffer.
- **`pause()`**: Pausa o `PipelineWorker`.
- **`resume()`**: Retoma o `PipelineWorker` e despacha tarefas da fila de OCR.
- **`cancel()` / `reset()`**: Encerra todas as threads ativas.
- **`terminateAllWorkers()`**: Finaliza de forma segura as threads ativas para evitar vazamento de memória.

---

## 3. Utilitários de Prevenção de Suspensão (`wake-lock-audio.js`)

Localizado em `src/utils/wake-lock-audio.js`, fornece as funções auxiliares para evitar o congelamento da aba em segundo plano e a suspensão do sistema.

### Funções Exportadas
- **`startSilentAudio()`**: Inicializa e inicia um `AudioContext` tocando um buffer silencioso em loop infinito. Isso simula atividade de mídia para impedir o *Tab Freeze* do navegador.
- **`stopSilentAudio()`**: Para o oscilador e encerra o `AudioContext` de silêncio de forma limpa.
- **`requestWakeLock()`**: Solicita um Screen Wake Lock assincronamente ao navegador, impedindo que a tela e o computador entrem em repouso.
- **`releaseWakeLock()`**: Libera o Screen Wake Lock ativo.

---

## 4. Protocolo de Mensagens dos Web Workers

A comunicação entre a thread principal e as threads dos workers ocorre por mensagens estruturadas baseadas em um atributo `type`.

### 3.1 Canal: Main Thread ➔ Pipeline Worker
- **`{ type: "start", zipData: ArrayBuffer, selectedFiles: Array }`**: Inicia o processamento sequencial. O `zipData` é passado como transferível.
- **`{ type: "pause" }`**: Solicita a interrupção da leitura de páginas.
- **`{ type: "resume" }`**: Retoma a leitura após a pausa ou liberação de contra-pressão.

### 3.2 Canal: Pipeline Worker ➔ Main Thread
- **`{ type: "status", message: string }`**: Atualização genérica de status de inicialização.
- **`{ type: "log", level: "success"|"info"|"error", message: string }`**: Logs para exibição no console.
- **`{ type: "doc_start", fileName: string }`**: Indica início do processamento de um documento.
- **`{ type: "doc_info", fileName: string, pageCount: number }`**: Fornece o número total de páginas descobertas no documento.
- **`{ type: "page_native", fileName: string, page: number, pageCount: number, content: string }`**: Entrega o texto nativo extraído da página.
- **`{ type: "page_ocr_request", fileName: string, page: number, pageCount: number, width: number, height: number, imageBuffer: ArrayBuffer }`**: Solicita processamento OCR da página enviando o pixel buffer da imagem renderizada de forma transferível.
- **`{ type: "pipeline_finished" }`**: Indica que a varredura do arquivo ZIP foi concluída pelo worker.
- **`{ type: "error", message: string }`**: Erro crítico ocorrido no pipeline.

### 3.3 Canal: Main Thread ➔ OCR Worker
- **`{ type: "ocr_job", jobId: number, width: number, height: number, imageBuffer: ArrayBuffer, tessDataPath: string }`**: Envia uma tarefa de OCR contendo o pixel buffer de forma transferível.
- **`{ type: "terminate" }`**: Solicita o encerramento seguro da instância interna do Tesseract e fechamento do Worker.

### 3.4 Canal: OCR Worker ➔ Main Thread
- **`{ type: "ocr_success", jobId: number, text: string, imageBuffer: ArrayBuffer }`**: Retorna o texto extraído com sucesso, devolvendo o buffer de imagem de forma transferível para reciclagem ou descarte.
- **`{ type: "ocr_error", jobId: number, message: string, imageBuffer: ArrayBuffer }`**: Retorna a mensagem de erro do OCR.
