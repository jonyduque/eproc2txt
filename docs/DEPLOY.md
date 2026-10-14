# Deploy — https://eproc2text.duque.cloud

O app é uma SPA estática (build do Vite em `dist/`) servida pelo nginx bare-metal da VPS
Hostinger (`root@duque.cloud`, Ubuntu 24.04). Não há backend: leitura do ZIP, PDFium e
Tesseract rodam todos no navegador.

## Pré-requisitos (uma vez)

1. DNS na Hostinger: `A eproc2text → 179.197.64.48` e `AAAA eproc2text → 2a02:4780:6e:fbc2::1`.
   O instalador se recusa a pedir certificado enquanto o registro A não apontar para a VPS.
2. Chave SSH autorizada em `root@duque.cloud` (a mesma dos outros projetos).

## Publicar

```bash
npm run deploy                 # lint + build + envio + instalação + verificação
node scripts/deploy.mjs --skip-build # reaproveita o dist/ atual (no PowerShell, `npm run deploy -- ...` perde o `--`)
```

`scripts/deploy.mjs`:

1. anota o status HTTP dos sites vizinhos (`duque.cloud`, `dejesp`, `jur`, `sorteio`,
   `vieiraduque.com.br`);
2. roda `npm run lint` e `npm run build`;
3. envia `dist.tgz`, `deploy/remote-install.sh` e `deploy/nginx/eproc2text.duque.cloud.conf`
   para `/tmp/eproc2text/` e executa o instalador;
4. confere que `https://eproc2text.duque.cloud/` responde `200` com
   `Cross-Origin-Embedder-Policy: require-corp` e que cada vizinho continua respondendo o
   mesmo status de antes.

`deploy/remote-install.sh` (na VPS):

- troca `/var/www/eproc2text/html` atomicamente (`html.new` → `html`, a versão anterior fica
  em `html.old`) e normaliza permissões (dirs 755, arquivos 644, dono `www-data`);
- só na primeira execução, instala um vhost apenas HTTP e emite o certificado com
  `certbot certonly --webroot` (a renovação continua funcionando por
  `/.well-known/acme-challenge/` na porta 80);
- instala o vhost final. Toda mudança passa por `nginx -t`; se falhar, o vhost anterior é
  restaurado (ou o nosso removido) antes do reload, então os outros sites nunca são afetados.

## O que é tocado na VPS

Só `/var/www/eproc2text/`, `/etc/nginx/sites-{available,enabled}/eproc2text.duque.cloud`,
`/var/log/nginx/eproc2text.duque.cloud.*.log` e o certificado `eproc2text.duque.cloud`.
Nenhuma configuração global do nginx é alterada.

## Headers

COOP `same-origin` / COEP `require-corp` vão em toda resposta. Os
recursos de outra origem que o app carrega (Google Fonts, jsDelivr para o wasm do PDFium e o
worker do Tesseract, `tessdata.projectnaptha.com`) mandam headers CORS/CORP, então carregam
sob COEP. `/assets/` fica em cache por 1 ano (nomes com hash); `index.html` é `no-cache`.

## Rollback

```bash
ssh root@duque.cloud 'cd /var/www/eproc2text && mv html html.bad && mv html.old html'
```
