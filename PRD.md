## Documento de Requisitos do Produto (PRD) — eproc2txt

## 1. Visão Geral do Produto
O aplicativo eproc2txt é um pipeline web de alta performance para descompressão, ordenação lógica e extração unificada de textos a partir de pacotes .zip. O sistema lê arquivos mistos (PDF e HTML), identifica sua hierarquia cronológica através do nome do arquivo, limpa códigos de marcação e aplica processamento híbrido (Extração Nativa + OCR Inteligente com Paddle) para gerar um documento consolidado estruturado em XML customizado.

## 2. Arquitetura Tecnológica Core

* Descompressão: FFlate (alternativa ultraleve ao JSZip, focada em velocidade de descompressão em blocos).
* Processamento HTML: DOMParser nativo do navegador (executado em memória/sandbox).
* Processamento PDF e OCR: PDFium.js (WASM) + PaddleOCR (ONNX Runtime Web), gerenciados via Web Workers.

------------------------------
## 3. Regra de Negócio: Parsing de Arquivo e Ordenação Híbrida## 3.1 Padrão de Nomenclatura
O sistema deve aceitar e validar arquivos dentro do ZIP que sigam estritamente o padrão:

* Evento {número do evento} - {TIPODEDOCUMENTO}{Número do documento}.{extensão}
* Exemplo: Evento 1 - CONTRATO4021.pdf ou Evento 2 - PETICAO1.html

## 3.2 Algoritmo de Ordenação (Sorting)
Antes de iniciar qualquer extração, o sistema lerá a lista de arquivos do ZIP e aplicará uma ordenação em dois níveis:

   1. Nível 1: Agrupamento e ordenação crescente pelo Número do Evento (evento n).
   2. Nível 2: Ordenação crescente pelo Número do Documento (doc n) dentro de seu respectivo evento.

------------------------------
## 4. Estrutura de Dados Interna (Árvore de Consolidação)
O processamento preencherá uma árvore ordenada antes de gerar o output final textual:

[
  {
    "eventoId": 1,
    "documentos": [
      {
        "docId": 1,
        "tipo": "PDF",
        "paginas": [
          { "pagId": 1, "conteudo": "Texto nativo da pág 1..." },
          { "pagId": 2, "conteudo": "Texto extraído via PaddleOCR da maior imagem da pág 2..." }
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
  }
]

------------------------------
## 5. Requisitos Funcionais e Fluxo de Processament

## Épico 1: Descompressão e Mapeamento Estrutural

* RF1.1: O usuário faz o upload do arquivo .zip.
* RF1.2: O sistema extrai a lista de arquivos na memória e aplica a Expressão Regular de validação. Arquivos fora do padrão são listados em um log de avisos, mas ignorados no pipeline.
* RF1.3: O sistema monta o índice ordenado de Eventos e Documentos conforme a Regra de Negócio 3.2.
* RF1.4 (Seleção de Escopo pelo Usuário): O índice gerado será renderizado na tela para o usuário em formato de árvore hierárquica interativa (Evento > Documentos). Cada nó de documento possuirá um checkbox (caixa de seleção) pré-marcado por padrão. O usuário poderá desmarcar documentos ou eventos inteiros que deseja excluir do processamento final. Apenas os itens que permanecerem checados serão enviados para a Fase 2 (HTML/PDF) e Fase 3 (OCR).

## Épico 2: Processamento de Arquivos HTML

* RF2.1 (Sanitização Absoluta): Para cada arquivo .html, o sistema lê seu conteúdo como texto e o instancia em um DOMParser().
* RF2.2 (Extração de Texto Corrido): O sistema captura o document.body.innerText ou aplica uma limpeza agressiva removendo nós de <script>, <style>, <svg> e tags de imagem <img>. Apenas o texto visível renderizável é mantido, eliminando excessos de quebras de linha e espaços duplos.
* RF2.3 (Mapeamento de Página): O texto resultante é alocado em uma única página fictícia (pag n=1).

## Épico 3: Processamento Híbrido de Arquivos PDF

* RF3.1 (Triagem por Página): Para cada página do PDF, o PDFium tenta extrair texto nativo. Se houver texto válido, salva e passa para a próxima página.
* RF3.2 (OCR Condicional): Se a página não tiver texto, o sistema isola a imagem de maior área gráfica da página, submete ao pipeline de pré-processamento (Escala de cinza, binarização e redimensionamento múltiplo de 32px) e executa o OCR via PaddleOCR.

## Épico 4: Gerenciamento Estrito de Memória (Anti-Crash Global)

* RF4.1 (Desalocação Sequencial): Como o pipeline processará múltiplos arquivos sequencialmente, o array de bytes (ArrayBuffer) de cada arquivo extraído do ZIP deve ser liberado da memória Javascript assim que o processamento daquele documento (PDF ou HTML) terminar.
* RF4.2 (Garbage Collection WASM): Manter a regra rígida de chamar .destroy() nos contextos de página e texto do PDFium e limpar os tensores do ONNX Runtime a cada ciclo.

------------------------------
## 6. Especificação do Formato de Saída (Output Final)
O resultado consolidado final gerado a partir da leitura linear da Árvore de Consolidação deve seguir exatamente a sintaxe XML limpa solicitada:

```
<indice>
- Evento 1
	- Doc 1: 2 páginas
	- Doc 2: 1 página
- Evento 2
	- Doc 1: 1 página
</indice>
<evento n=1>
	<doc n=1>
		<pag n=1>
		Este é o texto da página 1 do primeiro documento do evento 1 (Originalmente PDF).
		</pag>
		<pag n=2>
		Este texto foi obtido via OCR porque a página 2 deste PDF era escaneada.
		</pag>
	</doc>
	<doc n=2>
		<pag n=1>
		Este é o texto limpo, corrido e sem nenhuma tag, imagem ou estilo CSS que veio do arquivo HTML que estava nomeado como o segundo documento do evento 1.
		</pag>
	</doc>
</evento>
<evento n=2>
	<doc n=1>
		<pag n=1>
		Início dos documentos pertencentes ao Evento 2...
		</pag>
	</doc>
</evento>
```