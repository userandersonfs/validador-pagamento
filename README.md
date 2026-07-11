# Comprovantes PIX → Telegram

App web (mobile) pra registrar comprovantes de PIX da igreja: bate a foto, o
Tesseract tenta ler **nome, data/hora, valor, banco e ID/E2E**, você confere e
corrige na tela, e o app manda a **foto + os dados** pro Telegram. Nada é salvo
em banco — o próprio Telegram vira o arquivo.

## Rodar local

```bash
npm install
cp .env.example .env   # e preencha o token e o chat_id
npm run dev            # http://localhost:3000
```

> A 1ª leitura pode demorar alguns segundos: o Tesseract baixa o pacote de
> português (`por`) no primeiro uso.

## 1) Criar o bot (Telegram)

1. No Telegram, fale com **@BotFather** → `/newbot` → escolha nome e usuário.
2. Ele te dá um **token** tipo `123456:ABC-DEF...`. Cole em `TELEGRAM_BOT_TOKEN`.

## 2) Descobrir o `TELEGRAM_CHAT_ID`

**Grupo** (recomendado pra igreja):
1. Crie o grupo e **adicione o bot** nele.
2. Mande qualquer mensagem no grupo.
3. Abra no navegador: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
4. Procure `"chat":{"id":-100123...}` — esse número (com o `-`) é o `chat_id`.

**Canal**: adicione o bot como **administrador** do canal, poste algo e use o
mesmo `getUpdates` (ou o id no formato `-100...`).

## Deploy no Fly

```bash
fly launch --no-deploy        # confirme o nome/região (gru = São Paulo)
fly secrets set TELEGRAM_BOT_TOKEN=xxxx TELEGRAM_CHAT_ID=-100xxxx
fly deploy
```

Depois é só abrir a URL `https://<seu-app>.fly.dev` no celular.

## Trocar o OCR depois

Toda a leitura fica isolada em `src/extractor.js` (+ `src/parser.js`). Pra usar
Gemini/Claude/Google Vision no lugar do Tesseract, basta reescrever a função
`extract()` — o resto da app não muda.
