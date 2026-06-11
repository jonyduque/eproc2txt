# Spec de Configuração do Netlify para eproc2txt

Este documento especifica a configuração do Netlify para o projeto **eproc2txt**, garantindo suporte a SPAs e a execução correta de Web Workers multithreaded (usados pelo PDFium.js WASM e Tesseract.js) por meio de cabeçalhos de isolamento cross-origin.

## Contexto e Requisitos

1. **Vite SPA**: O projeto é uma Single Page Application desenvolvida com React e Vite. Quando o usuário recarrega a página em rotas internas do SPA, o servidor precisa redirecionar a requisição de volta para o `index.html` com o status `200` para que o roteamento no lado do cliente assuma o controle.
2. **Isolamento de Origem Cruzada (Cross-Origin Isolation)**: O processamento de PDFs e OCR por meio de Workers multithreaded requer cabeçalhos específicos para habilitar o uso de `SharedArrayBuffer` de forma segura:
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Embedder-Policy: require-corp`
3. **Segurança básica**: Cabeçalhos adicionais de segurança para mitigar ataques como Clickjacking (`X-Frame-Options`) e sniffing de tipos MIME (`X-Content-Type-Options`).

## Configurações Propostas

Criaremos o arquivo `netlify.toml` na raiz do repositório com o seguinte conteúdo:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Plano de Verificação

1. **Verificação do arquivo**: Garantir que o arquivo `netlify.toml` foi criado na raiz com a sintaxe correta.
2. **Build Local**: Validar se a build continua funcionando localmente sem conflitos com as novas configurações do Netlify.
3. **Deploy**: O Netlify detectará automaticamente o arquivo na raiz do repositório no próximo commit/push ou ao rodar a CLI.
