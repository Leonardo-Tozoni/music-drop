# Music Drop

Hub da banda: agenda de shows e ensaios, votação de presença, repertórios, cifras com transposição
e músicas (upload de MP3 ou importação por link do YouTube) com ferramenta para mudar o tom em tempo real.

Login por e-mail e senha; só entram membros criados no painel do Supabase.

Stack: React 19 + Vite + TypeScript, Supabase (Auth, Postgres, Storage, Realtime), importador do
YouTube em Python (yt-dlp + ffmpeg) que roda no computador de um membro.

## Configuração

### 1. Supabase

1. Rode `supabase/migrations/001_band.sql` no SQL Editor (depois das tabelas originais `tracks`,
   `playlists`, `playlist_tracks` e do bucket público `music`).
2. **Authentication → Sign In / Providers → Email**: deixe habilitado e **desative "Allow new users to sign up"**.
3. **Authentication → Users → Add user → Create new user**: para cada membro, informe e-mail e uma senha
   inicial e marque **Auto Confirm User**. Nenhum e-mail é enviado (o plano free limita envios a poucos por hora).
   O membro troca a senha clicando no próprio nome no topo do app. Para redefinir uma senha esquecida, abra o
   usuário no painel e defina uma nova.
4. **Storage → Policies**: remova políticas antigas do bucket `music` que liberavam escrita para `anon`.
   A migration cria as políticas de escrita para usuários logados.

### 2. Web app

```bash
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Na Vercel, configure as mesmas variáveis. O `vercel.json` já redireciona as rotas para o `index.html`.

### 3. Importador do YouTube (`server/`)

> Baixar áudio do YouTube viola os Termos de Uso do YouTube. Use por sua conta e risco, apenas para
> material que a banda tem direito de usar.

O app grava o link como música `pending`. O importador roda num computador com internet de casa
(o YouTube bloqueia servidores de nuvem como o Render), procura músicas pendentes a cada 10 s, baixa o
áudio e envia para o Storage. Com o computador desligado, os imports ficam "processando…" e são baixados
quando ele voltar.

```bash
cd server
cp .env.example .env   # SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
docker build -t music-drop-import .
docker run -d --name music-drop-import --restart unless-stopped --env-file .env music-drop-import
docker logs -f music-drop-import   # acompanhar
```

Com `--restart unless-stopped` o importador volta sozinho sempre que o Docker Desktop iniciar. O yt-dlp é
atualizado a cada início do container; se o YouTube mudar algo e os imports falharem,
`docker restart music-drop-import` costuma resolver. A service role key fica **só** no `server/.env`.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — oxlint
- `npm test` — testes (vitest) da transposição de cifras

## Como funciona

- **Tom**: o player passa o `<audio>` pelo [Signalsmith Stretch](https://npmjs.com/package/signalsmith-stretch)
  (WASM/AudioWorklet) ao mudar o tom, sem alterar a velocidade e com a mesma qualidade para subir ou baixar. O ajuste fica salvo por música no navegador e também transpõe a cifra.
- **Cifras**: cole o texto com acordes na linha de cima da letra. Linhas só de acordes são transpostas
  mantendo o alinhamento; o tom da música define sustenidos ou bemóis.
- **Agenda**: links `/agenda/<id>` podem ser enviados no grupo da banda; cada membro vota Vou / Talvez / Não vou
  e o resultado atualiza em tempo real.
