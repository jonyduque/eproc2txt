## Documento de Requisitos do Produto (PRD) — eproc2txt

## 1. Visão Geral do Produto
O aplicativo eproc2txt é um pipeline web de alta performance para descompressão, ordenação lógica e extração unificada de textos a partir de pacotes .zip. O sistema lê arquivos mistos (PDF e HTML), identifica sua hierarquia cronológica através do nome do arquivo, limpa códigos de marcação e aplica processamento híbrido (Extração Nativa + OCR Inteligente com Tesseract.js) para gerar um documento consolidado estruturado em XML customizado.

## 2. Arquitetura Tecnológica Core

* Descompressão: FFlate (alternativa ultraleve ao JSZip, focada em velocidade de descompressão em blocos).
* Processamento HTML: DOMParser nativo do navegador (executado em memória/sandbox).
* Processamento PDF: PDFium.js (WASM) para renderização e extração nativa de texto.
* Motor de OCR: Tesseract.js executado em Web Workers com dicionário em português (por).
* Multithreading: Pipeline Worker (`pipeline.worker.js`) coordenando um pool dinâmico de até 5 `ocr.worker.js`.

------------------------------
## 3. Regra de Negócio: Parsing de Arquivo e Ordenação Híbrida

## 3.1 Padrão de Nomenclatura
O sistema deve aceitar e validar arquivos dentro do ZIP que sigam estritamente o padrão:

* Evento {número do evento} - {TIPODEDOCUMENTO}{Número do documento}.{extensão}
* Exemplo: Evento 1 - CONTRATO4021.pdf ou Evento 2 - PETICAO1.html

### Capa do Processo
* A capa do processo possui nomenclatura diferenciada: `Capa do processo.pdf` ou `Capa do processo.html`
* É sempre agrupada no topo do arquivo final (evento 0).

## 3.2 Algoritmo de Ordenação (Sorting)
Antes de iniciar qualquer extração, o sistema lerá a lista de arquivos do ZIP e aplicará uma ordenação em dois níveis:

   1. Nível 1: Agrupamento e ordenação crescente pelo Número do Evento (evento 0 para Capa, depois eventos 1..N). Arquivos fora do padrão são agrupados no final (evento -1).
   2. Nível 2: Ordenação crescente pelo Número do Documento (doc n) dentro de seu respectivo evento.

------------------------------
## 4. Estrutura de Dados Interna (Árvore de Consolidação)
O processamento preencherá uma árvore ordenada antes de gerar o output final textual:

```
[
  {
    "eventoId": 0,  // Capa
    "documentos": [
      {
        "docId": 0,
        "tipo": "Capa",
        "paginas": [
          { "pagId": 1, "conteudo": "Texto da capa..." }
        ]
      }
    ]
  },
  {
    "eventoId": 1,
    "documentos": [
      {
        "docId": 1,
        "tipo": "PDF",
        "paginas": [
          { "pagId": 1, "conteudo": "Texto nativo da pág 1..." },
          { "pagId": 2, "conteudo": "Texto extraído via OCR da pág 2..." }
        ]
      },
      {
        "docId": 2,
        "tipo": "HTML",
        "paginas": [
          { "pagId": 1, "conteudo": "Texto limpo extraído do HTML..." }
        ]
      }
    ]
  },
  {
    "eventoId": -1,  // Fora do padrão
    "documentos": [
      {
        "docId": 1,
        "tipo": "Fora do Padrão",
        "paginas": [
          { "pagId": 1, "conteudo": "Texto extraído..." }
        ]
      }
    ]
  }
]
```

------------------------------
## 5. Requisitos Funcionais e Fluxo de Processamento

## Épico 1: Descompressão e Mapeamento Estrutural

* RF1.1: O usuário faz o upload do arquivo .zip.
* RF1.2: O sistema extrai a lista de arquivos na memória e aplica a Expressão Regular de validação. Arquivos fora do padrão são listados em um log de avisos, mas ignorados no pipeline padrão (agrupados em evento -1).
* RF1.3: O sistema monta o índice ordenado de Eventos e Documentos conforme a Regra de Negócio 3.2.
* RF1.4 (Seleção de Escopo pelo Usuário): O índice gerado será renderizado na tela para o usuário em formato de árvore hierárquica interativa (Evento > Documentos). Cada nó de documento possuirá um checkbox (caixa de seleção) pré-marcado por padrão. O usuário poderá desmarcar documentos ou eventos inteiros que deseja excluir do processamento final. Apenas os itens que permanecerem checados serão enviados para a Fase 2 (HTML/PDF) e Fase 3 (OCR).

## Épico 2: Processamento de Arquivos HTML

* RF2.1 (Decodificação de Encoding): Para cada arquivo .html, o sistema detecta o encoding (UTF-8, ISO-8859-1, Windows-1252) a partir das tags `<meta>` e decodifica corretamente.
* RF2.2 (Sanitização Absoluta): O sistema remove blocos `<script>`, `<style>`, `<svg>`, tags HTML e decodifica entidades HTML (named, decimal, hex). Apenas o texto visível renderizável é mantido, eliminando excessos de quebras de linha e espaços duplos.
* RF2.3 (Mapeamento de Página): O texto resultante é alocado em uma única página fictícia (pag n=1).

## Épico 3: Processamento Híbrido de Arquivos PDF

* RF3.1 (Triagem por Página): Para cada página do PDF, o PDFium tenta extrair texto nativo. Se houver texto válido (mais de 5 caracteres), salva e passa para a próxima página.
* RF3.2 (OCR Condicional): Se a página não tiver texto, o sistema renderiza a página como um pixel buffer de alta resolução (escala 2.0x, espaço de cor BGRA), aplica binarização local (Otsu) convertendo para RGBA, e envia o buffer transferível para o pool de OCR Workers com Tesseract.js.

## Épico 4: Gerenciamento Estrito de Memória (Anti-Crash Global)

* RF4.1 (Desalocação Sequencial): Os bytes descompactados de cada arquivo do ZIP são explicitamente deletados do escopo (`delete unzipped[targetPath]`) logo após o processamento daquele arquivo.
* RF4.2 (Padrão `using`/`dispose`): O projeto utiliza o padrão `using` (TC39 Explicit Resource Management) com `Symbol.dispose` para garantir a liberação automática de recursos WASM (documentos e páginas do PDFium), buffers de imagem e URLs de objetos (`URL.revokeObjectURL`).
* RF4.3 (Backpressure): Se a fila de OCR crescer além de `maxWorkers * 3`, o pipeline é pausado automaticamente até a fila reduzir para `maxWorkers * 1.5`.

## Épico 5: Prevenção de Suspensão

* RF5.1: O sistema utiliza Screen Wake Lock API para impedir a suspensão da tela.
* RF5.2: O sistema reproduz áudio silencioso em loop via AudioContext para impedir o congelamento da aba (Tab Freeze) pelo navegador.

------------------------------
## 6. Especificação do Formato de Saída (Output Final)
O resultado consolidado final gerado a partir da leitura linear da Árvore de Consolidação segue a sintaxe XML limpa:

```xml
<indice>
- Capa do processo: 1 página
- Evento 1
	- Doc 1: 2 páginas
	- Doc 2: 1 página
- Evento 2
	- Doc 1: 1 página
</indice>
<capa>
	<pag n="1">
	Este é o texto da página 1 da capa do processo.
	</pag>
</capa>
<evento n="1">
	<doc n="1">
		<pag n="1">
		Este é o texto da página 1 do primeiro documento do evento 1 (Originalmente PDF).
		</pag>
		<pag n="2">
		Este texto foi obtido via OCR porque a página 2 deste PDF era escaneada.
		</pag>
	</doc>
	<doc n="2">
		<pag n="1">
		Este é o texto limpo, corrido e sem nenhuma tag, imagem ou estilo CSS que veio do arquivo HTML.
		</pag>
	</doc>
</evento>
<evento n="2">
	<doc n="1">
		<pag n="1">
		Início dos documentos pertencentes ao Evento 2...
		</pag>
	</doc>
</evento>
```

Arquivos fora do padrão são incluídos em:
```xml
<arquivo_fora_padrao nome="arquivo_invalido.pdf">
	<pag n="1">
	Texto extraído do arquivo fora do padrão.
	</pag>
</arquivo_fora_padrao>
```

O arquivo é salvo com extensão `.txt` (texto plano com estrutura XML interna).
