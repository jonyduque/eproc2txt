# Guia do Usuário - eproc2txt 📖

Este guia prático explica como utilizar o `eproc2txt` para extrair e consolidar textos de pacotes de processos do e-Proc.

---

## 1. Como Funciona o Sistema

O `eproc2txt` foi desenhado para advogados, analistas jurídicos e desenvolvedores que precisam extrair textos de processos judiciais de forma rápida e segura. Toda a descompressão e OCR acontecem no seu navegador. Os seus arquivos **nunca são enviados para servidores externos**, garantindo privacidade absoluta do segredo de justiça.

O fluxo de processamento é composto por 4 etapas simples:
1. **Upload / Leitura do ZIP:** O arquivo é descompactado temporariamente na memória.
2. **Seleção de Escopo:** O usuário escolhe quais eventos e documentos deseja processar.
3. **Extração Paralela:** O motor lê os textos nativos e aplica OCR nas páginas escaneadas.
4. **Download:** O usuário copia ou baixa o XML estruturado resultante.

---

## 2. Regras de Nomenclatura e Validação de Arquivos

Para que o pipeline ordene corretamente a cronologia dos eventos, os arquivos de documentos jurídicos dentro do ZIP devem seguir o padrão e-Proc:

### Padrão e-Proc Geral
- **Sintaxe:** `Evento {numero_evento} - {TIPO_DO_DOCUMENTO}{numero_documento}.{pdf|html}`
- **Exemplo 1:** `Evento 1 - INICIAL1.pdf` (Evento 1, documento 1, formato PDF)
- **Exemplo 2:** `Evento 2 - CONTRATO2.html` (Evento 2, documento 2, formato HTML)
- **Exemplo 3:** `Evento 15 - PROCURACAO1.pdf` (Evento 15, documento 1, formato PDF)

### Capa do Processo
- A capa do processo possui nomenclatura diferenciada e é sempre agrupada no topo do arquivo final.
- **Sintaxe:** `Capa do processo.pdf` ou `Capa do processo.html`

### Arquivos fora do padrão
- Arquivos de áudio, planilhas ou PDFs/HTMLs que não sigam a nomenclatura acima são identificados como **"Fora do Padrão"**.
- Eles serão listados na tela de configuração em uma aba de alertas para que você saiba quais foram ignorados no pipeline padrão, mas você poderá optar por processá-los caso queira que eles sejam indexados sob uma seção especial de anexos não-identificados.

---

## 3. Guia Passo a Passo

### Passo 1: Upload do Arquivo ZIP
Arraste e solte o arquivo `.zip` do processo judicial na área demarcada na tela inicial, ou clique em "Selecionar Arquivo ZIP" para buscar em seu computador.

### Passo 2: Configuração e Seleção de Escopo
Após a leitura do ZIP, a tela de configuração será exibida:
- **Árvore de Documentos:** Expanda os eventos clicando neles. Por padrão, todos os documentos compatíveis vêm selecionados. Você pode desmarcar documentos ou eventos inteiros que não deseja incluir na consolidação final (ex: custas, guias de pagamento ou petições redundantes).
- **Número de Workers:** Escolha entre **1 e 5 threads**. Quanto mais threads, mais rápido será o OCR, porém maior será o consumo de processamento da sua máquina. O recomendado é usar o valor padrão sugerido (baseado no número de núcleos de CPU de seu computador).
- **Modelo do OCR (Tesseract):**
  - `fast`: Execução ultra-rápida, menor precisão.
  - `standard`: Recomendado (equilíbrio entre velocidade e acurácia).
  - `best`: Máxima qualidade de leitura, porém mais lento e pesado.

Clique em **"Iniciar Processamento"** para começar.

### Passo 3: Acompanhamento de Processamento
Durante a execução, você verá um painel completo com:
- **Cronômetro ativo:** Mostrando o tempo decorrido em alta precisão.
- **Status dos Workers:** Cards exibindo em tempo real o que cada slot de thread está lendo ou processando.
- **Lista de Documentos:** Status individual de cada arquivo (na fila, processando, extraído ou concluído via OCR).

*Nota: Você pode usar os botões "Pausar" ou "Cancelar" se precisar interromper o processo.*

### Passo 4: Download do XML Consolidado
Ao terminar o pipeline, você será redirecionado para a tela de conclusão:
- **Painel de Estatísticas:** Exibe o total de documentos processados, páginas convertidas por texto nativo e páginas lidas via OCR.
- **Visualizador:** Um leitor interativo contendo a estrutura do XML gerado para visualização rápida.
- **Ações:** 
  - Clique em **"Copiar para Área de Transferência"** para colar em outro aplicativo.
  - Clique em **"Baixar XML Consolidado"** para salvar o arquivo final `.xml` em seu computador.

---

## 4. Estrutura do XML de Saída

O arquivo gerado é estruturado de forma a facilitar o parse por outras ferramentas de inteligência artificial ou armazenamento:

```xml
<indice>
- Capa do processo: 1 página
- Evento 1
	- Doc 1: 1 página
- Evento 2
	- Doc 1: 2 páginas
</indice>
<capa>
	<pag n="1">
	[Conteúdo em texto da Capa do Processo...]
	</pag>
</capa>
<evento n="1">
	<doc n="1">
		<pag n="1">
		[Texto extraído do documento 1 do Evento 1...]
		</pag>
	</doc>
</evento>
<evento n="2">
	<doc n="1">
		<pag n="1">
		[Texto nativo da página 1...]
		</pag>
		<pag n="2">
		[Texto extraído via OCR da página 2 (que era escaneada)...]
		</pag>
	</doc>
</evento>
```

---

## 5. Processamento em Segundo Plano e Suspensão

Para garantir que grandes volumes de documentos sejam processados mesmo se você alternar de aba ou deixar o computador sozinho, a aplicação inclui mecanismos automáticos de prevenção de suspensão:

* **Wake Lock Automático:** O sistema bloqueia a suspensão da tela e o repouso do computador enquanto o processamento estiver ativo.
* **Prevenção de Tab Freeze:** O navegador (Chrome, Edge, Safari) costuma suspender abas em segundo plano para economizar energia. O `eproc2txt` impede isso reproduzindo um sinal de áudio silencioso imperceptível em loop durante a extração, sinalizando que a aba reproduz mídia ativa.

**Recomendação de Uso:** Se você precisar realizar outras tarefas em seu computador durante a extração de pacotes muito grandes:
1. **Evite minimizar** a janela do navegador.
2. É preferível **arrastar a aba do eproc2txt para uma janela separada** e mantê-la visível em segundo plano (atrás do programa que você está utilizando ou em um segundo monitor). Isso garante prioridade máxima de processamento da CPU para o WebAssembly (WASM) e o Tesseract OCR.
