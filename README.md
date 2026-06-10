# eproc2txt 🚀

`eproc2txt` é um pipeline web de alta performance executado totalmente no navegador (client-only SPA) para descompressão, ordenação lógica e extração unificada de textos a partir de pacotes `.zip` de processos judiciais (padrão e-Proc).

O sistema lê arquivos mistos (PDF e HTML), identifica sua hierarquia cronológica e estrutural a partir do nome dos arquivos, realiza a limpeza e sanitização de marcações e aplica processamento híbrido (Extração Nativa + OCR Multithreaded com Tesseract.js) para gerar um documento consolidado estruturado em XML customizado.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** React 18 (Vite-powered, client-only SPA)
- **Descompressão:** [FFlate](https://github.com/101arrowz/fflate) (descompressor leve e ultraveloz em blocos)
- **Visualização & Extração de PDF:** PDFium.js (WASM) para renderização e extração nativa de texto
- **Motor de OCR:** Tesseract.js executado concorrentemente em Web Workers
- **Multithreading:** Pipeline Worker (`pipeline.worker.js`) coordenando um pool dinâmico de até 5 `ocr.worker.js`
- **Linting & Formatação:** [Biome](https://biomejs.dev/)

---

## 📂 Estrutura de Documentação

Para informações detalhadas sobre design, arquitetura e desenvolvimento, consulte os documentos abaixo:

1. **[Arquitetura do Sistema (docs/ARCHITECTURE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/ARCHITECTURE.md)**: Detalhes sobre o fluxo multithreaded de Workers, contra-pressão de memória e o ciclo de vida dos arquivos.
2. **[Referência de API (docs/API_REFERENCE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/API_REFERENCE.md)**: Interfaces de comunicação, assinaturas do hook principal `usePipeline` e formato do protocolo dos Workers.
3. **[Guia do Desenvolvedor (docs/DEVELOPER_GUIDE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/DEVELOPER_GUIDE.md)**: Configurações de ambiente, padrões visuais (Custom CSS, OKLCH, Glassmorphism) e regras do Biome.
4. **[Guia do Usuário (docs/USER_GUIDE.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/docs/USER_GUIDE.md)**: Regras de nomenclatura de arquivos, configuração do pipeline e formato do XML consolidado gerado.
5. **[Guia de Design (DESIGN.md)](file:///c:/Users/jonyd/Projetos/eproc2txt/DESIGN.md)**: Definições visuais, paleta de cores baseada em `oklch`, tipografia e estilos de componentes.

---

## ⚡ Começando

### Pré-requisitos

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Instalação

1. Clone o repositório:
   ```powershell
   git clone https://github.com/jonyduque/eproc2txt.git
   cd eproc2txt
   ```

2. Instale as dependências:
   ```powershell
   npm install
   ```

### Executando em Desenvolvimento

Inicie o servidor de desenvolvimento do Vite:
```powershell
npm run dev
```

Abra o navegador no endereço indicado (geralmente `http://localhost:5173`).

### Linting e Formatação

Para verificar erros e formatar o código utilizando o Biome:
```powershell
# Verifica erros de lint
npm run lint

# Corrige erros automaticamente
npm run lint:fix

# Formata o código
npm run format
```

### Build de Produção

Para gerar o build otimizado para produção na pasta `/dist`:
```powershell
npm run build
```

Para pré-visualizar o build localmente:
```powershell
npm run preview
```

---

## 📝 Licença

Este projeto é de uso privado e confidencial. Todos os direitos reservados.
