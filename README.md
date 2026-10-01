# Bodas de Prata — Cleide & Flávio

Um guia privado, mobile-first, para **uma viagem** de 08 a 16 de novembro de 2026: Estrada Real, cidades históricas de Minas, Cunha, Paraty e Trindade. Sem contas, painel administrativo ou cadastro de viagens. Datas usam `America/Sao_Paulo`.

## Instalar e executar

Use Node.js 22 ou 24 LTS e npm. O lockfile fixa as versões efetivamente instaladas.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

O servidor usa a porta 3000. Nenhuma credencial é necessária para instalar, navegar na prévia, lint, typecheck, testes de dados ou build. Com as variáveis vazias, a prévia avisa que checks e fotos dependem de configuração; **não simula persistência**. As APIs de alteração continuam recusando acesso sem sessão.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm run test:e2e` testa a versão compilada em 3100 com Playwright e credenciais efêmeras geradas durante o teste. Usa `/usr/bin/chromium`; em outro computador instale Chromium (`npx playwright install chromium`) e configure `PLAYWRIGHT_CHROMIUM_PATH` com o caminho do executável. Os testes de interface simulam respostas do banco e do Drive; **não validam acesso às suas contas externas**. `npm run format` formata o código.

## Arquitetura e pastas

- `app/`: página Next.js e APIs Node.js. Segredos existem exclusivamente no backend.
- `components/`: navegação, roteiro, cards, detalhes em dialog, onboarding, mapas, uploader e galeria.
- `data/trip.ts`: identidade da viagem e checklist pré-viagem.
- `data/events.ts`: todos os eventos e horários dos nove dias.
- `data/customize.ts`: reservas, estabelecimentos, fotos e ajustes, com exemplos comentados e TODOs.
- `data/places.ts`: centros aproximados das cidades, sequência da ida e volta.
- `data/types.ts`: modelos de evento, lugar, rota, dia e foto.
- `lib/maps.ts`: funções centralizadas de URLs oficiais do Google Maps.
- `lib/time.ts`: data e estados antes/durante/depois, no fuso de São Paulo.
- `lib/server.ts`: autenticação, validação de origem e cliente Supabase privilegiado.
- `lib/drive.ts`: OAuth, pastas, download privado e envio retomável ao Drive.
- `lib/compress.ts`: compressão no dispositivo.
- `supabase/migrations/001_trip.sql`: tabelas, RLS e trava de upload.
- `scripts/authorize-drive.mjs`: autorização inicial no computador da Duda.
- `public/`: mapa/arte própria em SVG, ícones PWA, manifest e service worker.
- `tests/`: testes de dados/Maps/fuso e fluxos de navegador.

A interface usa fundo branco, tokens CSS em `app/globals.css`, tipografia editorial nos títulos, ícones Lucide e Tailwind CSS 4 disponível. Não depende de fontes externas. A arte da abertura é uma **ilustração autoral**, não uma foto de referência de algum estabelecimento. Leaflet carrega somente quando o mapa é aberto. O fundo funcional usa CARTO Positron (dados OpenStreetMap), com atribuição aos dois provedores e sem chave de API. A origem das requisições é identificada pelo navegador; a URL com token continua protegida por `no-referrer` na rota de sessão. Os dois mapas têm funções distintas: SVG emocional e mapa interativo funcional, sem chave paga.

## Completar o roteiro pelo código

### Cronograma

Edite os dados de `data/events.ts`, ou substitua campos de um evento em `data/customize.ts`. Cada linha possui horário, título, categoria, descrição, cidade e rota opcional. `~` na interface significa horário aproximado. O jantar das Bodas tem 20h30 e destaque; a escuna permanece provisória até a reserva ser confirmada.

**IDs estão associados aos checks e fotos.** Os IDs atuais seguem `day-8-1`, `day-8-2` etc. Depois de começar a usar persistência, não remova nem reordene as linhas existentes; para mudar horários, prefira overrides. Se precisar inserir/reordenar eventos, atribua IDs estáveis explicitamente em `events.ts` e preserve os já utilizados no banco. Não copie simplesmente um ID de outro evento.

Exemplo de atualização de horário:

```ts
'day-13-4': {
  startTime: '10:30',
  approximateTime: false,
  description: 'Embarque conforme reserva confirmada.',
}
```

### Local, restaurante e hospedagem

Substitua `location` com os dados reais. Campos desconhecidos ficam ausentes; nunca preencha endereço, estacionamento, preço ou telefone fictícios. `location` é substituído por inteiro: inclua cidade e estado.

```ts
'day-14-8': {
  description: 'Informações reais da reserva.',
  location: {
    name: 'Nome do restaurante reservado',
    city: 'Paraty',
    state: 'RJ',
    address: 'Endereço confirmado',
  },
}
```

As hospedagens são `day-8-12`, `day-10-10`, `day-11-13` e `day-12-7`. Use `accommodation` com `checkIn`, `checkOut`, `phone`, `parking` e `breakfast` somente quando conhecidos. Troque `title` se desejar mostrar o nome da pousada no cronograma. Os botões de localização aparecem automaticamente quando o lugar está definido.

### Fotos de referência

Coloque as imagens em `public/referencias/` e preencha:

```ts
referenceImages: [
  {src: '/referencias/fachada.jpg', alt: 'Fachada da pousada reservada'},
]
```

São exibidas em um carrossel horizontal como **Fotos do local**. Use imagens suas ou que você tenha permissão para utilizar. **Fotos de vocês** vêm do Drive, por uma API autenticada, e nunca desta pasta.

### Passaporte e carimbos

Todas as cidades indicadas possuem eventos de Passaporte, sem estabelecimentos oficiais inventados. Verifique a informação atual junto à Estrada Real e ao estabelecimento. Depois preencha `stampPlace: {verified: true, name, address, mapsUrl}` e a `location` correspondente. Inclua horários nas notas, fotos da fachada e coordenadas verificadas. Enquanto `verified` for falso, o site informa **Local do carimbo a confirmar** e não oferece uma rota fictícia ao carimbo. Cruzília é opcional; seu ponto não foi inventado.

### Coordenadas

Os valores de `cities` são centros aproximados apenas para cartografia. Para um pin de estabelecimento no mapa funcional, preencha `location.latitude`, `location.longitude` e **`coordinatesVerified: true`** após conferir a localização. Pins não são gerados a partir de endereços inventados. Os símbolos distinguem cidade, hospedagem, restaurante, atração, carimbo, parada e evento especial. O mapa ilustrado converte latitude/longitude com uma projeção simples e mostra o retorno separado. Linhas de ambos os mapas são esquemáticas, não trajetos de GPS.

### Google Maps

Use `buildGoogleMapsDirectionsUrl(route)` para deslocamentos com origem fixa, destino e `waypoints`; `buildGoogleMapsPlaceUrl(location)` abre somente o destino e deixa a origem a cargo do celular. Nenhum desses botões pede geolocalização ao site. Uma URL de lugar verificada pode ser cadastrada em `googleMapsUrl`.

A volta mantém **Paraty → Angra dos Reis → Barra Mansa → Volta Redonda → Três Rios → Juiz de Fora → Barbacena → Conselheiro Lafaiete → Belo Horizonte**. Os dois trechos têm três waypoints cada, respeitando a limitação mobile documentada das Google Maps URLs. O primeiro termina em Três Rios e o segundo começa ali. A rota inteira é uma opção secundária com aviso de compatibilidade. Nenhuma cidade é descartada silenciosamente.

## Supabase: persistência compartilhada

1. Crie um projeto no Supabase.
2. No SQL Editor, execute **todo** `supabase/migrations/001_trip.sql` uma vez. Pode executar novamente: criação das tabelas é idempotente e a função é substituída.
3. Copie Project URL para `SUPABASE_URL` e a chave **service_role** legada para `SUPABASE_SERVICE_ROLE_KEY`, somente no servidor.
4. Não crie permissões para `anon` ou `authenticated`. RLS está habilitado, sem políticas de acesso público. A função de trava só pode ser executada por `service_role`.

`checks` guarda somente conclusão e data de atualização. “Próximo” é calculado no cliente a partir da ordem dos eventos ainda não concluídos. `photos` guarda metadados e o ID privado no Drive. `photo_uploads` é uma trava temporária de concorrência, não uma segunda galeria.

A interface atualiza checks imediatamente, bloqueia duplo clique e reverte em caso de erro. Outros aparelhos recebem alterações ao abrir/focar a página e a cada 12 segundos enquanto ela está visível. Não há login Supabase no cliente. Em falha de rede, dados já carregados continuam visíveis e há opção de tentar novamente. Sem sinal, alterações não são enfileiradas: o usuário recebe aviso para repetir ao reconectar.

## Google Drive: OAuth da sua conta

Foi escolhido **OAuth 2.0 com a conta da Duda**, não Service Account. Isso mantém os arquivos no seu próprio Drive, sem consentimento Google para Cleide e Flávio. O escopo é `drive.file`, limitado às pastas/arquivos criados ou autorizados para esta aplicação.

### Autorização inicial e refresh token

Execute esta etapa **no seu computador**, com um navegador; não na Vercel.

1. No Google Cloud Console, crie um projeto e habilite a **Google Drive API**.
2. Configure a tela de consentimento OAuth. Adicione sua conta Google como usuário de teste enquanto configurar.
3. Crie um cliente OAuth de tipo **Web application** e inclua o redirect URI exato `http://localhost:8787/callback`.
4. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em `.env.local` no seu computador.
5. Execute:

```sh
node --env-file=.env.local scripts/authorize-drive.mjs
```

6. Abra a URL apresentada no seu navegador, com sua conta Google, e autorize. O callback confere `state` e usa PKCE.
7. O script cria no seu Drive a pasta **Bodas de Prata — Cleide e Flávio** e salva `GOOGLE_REFRESH_TOKEN` e `GOOGLE_DRIVE_FOLDER_ID` no arquivo privado `.env.drive` (permissões 0600). Não imprime tokens. Esse arquivo é ignorado pelo Git.
8. Copie os dois valores para `.env.local` e, depois, para as variáveis de ambiente da Vercel. Nunca cole valores em commits, screenshots ou chat. Preserve também client ID e client secret do mesmo cliente OAuth.

O script não sobrescreve um `.env.drive` já existente. Se precisar autorizar novamente, mova esse arquivo privado antes. Se a autorização do Google estiver em modo **Testing**, refresh tokens de aplicações externas podem expirar em sete dias. Antes da viagem, ajuste o estado de publicação da tela de consentimento conforme o console Google, mantenha somente sua conta autorizada e **reautorize/teste com antecedência**. Não deixe a viagem depender de um token de teste prestes a expirar.

### Pasta e organização

Use preferencialmente a pasta criada pelo script. Com `drive.file`, apontar arbitrariamente para uma pasta antiga não garante acesso. Para usar outra pasta, ela precisa ter sido criada ou explicitamente autorizada para esse mesmo aplicativo (por exemplo via Google Picker durante uma configuração própria); não amplie o escopo por conveniência.

O backend cria subpastas por dia e evento:

```text
Bodas de Prata — Cleide e Flávio
├── 08-11
│   ├── day-8-3 - BH → Ouro Preto
│   └── day-8-4 - Chegada a Ouro Preto
├── 14-11 - Bodas
└── 16-11 - Volta para BH
```

Não torne a pasta pública. A API `/api/photos/[id]` exige cookie e lê o arquivo privado usando OAuth. Os mesmos registros alimentam a galeria do evento e Memórias. Excluir uma foto exige confirmação, move o arquivo à lixeira do Drive e remove o registro; não o apaga permanentemente.

### Compressão, limites e retomada

O celular reduz a imagem para até 2048 px e comprime em JPEG, tentando preservar qualidade (86% inicialmente). Aceita seleção até 30 MB; o arquivo preparado deve ficar até **3 MB**, abaixo do limite de payload de funções Vercel. HEIC e outros formatos dependem da capacidade do navegador; se não abrirem, o site pede JPEG/PNG/WebP. A preparação usa canvas e a validação server-side usa Sharp, limites de pixels, MIME permitido e decodificação real. Metadados EXIF não são preservados na versão enviada.

O trecho **backend → Drive** usa upload resumable, chunks de 1 MiB e consulta de offset após interrupção, dentro da mesma execução. O trecho **celular → backend** usa um request pequeno e não é retomável entre requests: uma queda exige reenviar a versão comprimida. A prévia e o arquivo preparado permanecem em memória para tentar novamente sem escolher a foto outra vez. Recarregar/fechar a página perde essa seleção ainda não enviada. Não há promessa de retomada entre recarregamentos.

Um UUID por seleção, a trava no banco e `appProperties` no Drive recuperam um envio finalizado cuja resposta ou persistência falhou e evitam duplicação por retry. Em timeout da função, a trava expira em dois minutos. Nenhuma imagem é gravada no filesystem da Vercel. Limite da função: 60 segundos; conexão problemática pode exigir tentativa posterior. A pasta de um evento recebe somente IDs validados; o cliente não escolhe folder IDs nem drive IDs.

## Acesso privado, sem tela de login

Gere **dois valores diferentes** no seu computador:

```sh
openssl rand -hex 32
openssl rand -hex 32
```

Configure o primeiro em `TRIP_SECRET` e o segundo em `SESSION_SECRET`. Configure `APP_ORIGIN` com a origem exata do site, sem caminho: em produção `https://seu-dominio.vercel.app`; em desenvolvimento `http://localhost:3000`.

Envie individualmente aos seus pais o link:

```text
https://seu-dominio.vercel.app/api/session?token=SEU_TOKEN_LONGO
```

O servidor valida o token com comparação de tempo constante, emite cookie assinado de 60 dias, HttpOnly, SameSite=Lax e Secure em produção, e redireciona para `/`. Nenhum segredo é entregue ao JavaScript ou salvo no localStorage. Todas as APIs, inclusive leitura de fotos e checks, exigem sessão. Alterações também validam Origin contra `APP_ORIGIN`, protegendo contra CSRF. Não existe endpoint público para criar dados ou consentimento Google durante a viagem. Para revogar sessões, troque `SESSION_SECRET`; para revogar o link, troque também `TRIP_SECRET`.

**Link privado é uma credencial de acesso compartilhada.** Quem receber esse link terá o mesmo acesso; não há contas individuais. Não o publique em redes sociais. A primeira URL contém o token como solicitado e pode aparecer em histórico e logs de infraestrutura; não habilite analytics/captura de query strings nessa rota. A rota com token usa `Referrer-Policy: no-referrer`. As páginas limpas usam `strict-origin-when-cross-origin`, enviando somente a origem a serviços externos como o mapa, sem transmitir o caminho ou token. As respostas privadas não são cacheadas por CDN. O navegador pode guardar localmente o roteiro público/estático para offline, mas nunca fotos ou respostas das APIs. O acesso à prévia sem segredos não autoriza as APIs; não publique a versão de produção sem os dois segredos.

## PWA e conexão ruim

Manifest, ícones 192/512, theme color e instruções de instalação estão incluídos. Service worker guarda SVG, ícones, bundles estáticos já carregados e o HTML inicial visitado/autorizado. Não guarda token, query strings, API responses nem imagens privadas. Ele dá preferência à rede para o documento e usa a cópia já visitada quando a rede cai. Tiles CARTO/OpenStreetMap, navegação Google, sincronização e uploads precisam de internet. O mapa ilustrado e os nove dias de dados são locais. Não é offline completo; atualizações do app podem exigir conexão e uma visita para atualizar os assets. O aparelho deve ficar protegido por senha, pois mantém o roteiro e cookie da viagem.

Para testar offline: abra a aplicação com sinal, espere o service worker instalar, recarregue ainda com sinal para guardar o documento sob controle do worker, abra as abas desejadas e só então simule offline. Nunca conclua que primeira abertura sem internet vai funcionar.

## Deploy na Vercel

1. Coloque este projeto no branch `main` do repositório e importe-o na Vercel como Next.js. Root Directory: raiz do repositório.
2. Selecione Node.js 22 ou 24. Build: `npm run build`; instalação: `npm ci`.
3. Cadastre todas as variáveis de `.env.example` em **Settings → Environment Variables**, para Production. Nenhuma usa `NEXT_PUBLIC_`.
4. Preencha `APP_ORIGIN` com a origem do domínio final; para previews, use a origem exata daquele deployment ou mantenha as mutações desativadas até configurar.
5. Aplique o SQL no Supabase, faça OAuth no seu computador e preencha as quatro variáveis do Google.
6. Faça deploy/redeploy depois de mudar variáveis. Não coloque `.env.local` ou `.env.drive` no Git.
7. Abra o link privado num celular, marque/desfaça um check e verifique o resultado num segundo aparelho.
8. Envie uma foto, confirme pasta/arquivo privado no seu Drive, abra em Memórias e teste exclusão com confirmação.
9. Confirme todas as reservas, carimbos e dados reais nos TODOs antes de 08/11. Baixe mapas offline nos dois celulares.

## O que depende de configuração manual

- **Supabase**: projeto, migration completa, URL e service_role. Sem isso não há persistência de checks/fotos.
- **Google**: projeto, Drive API, cliente OAuth, autorização da sua conta, refresh token durável e pasta. Sem isso não há envio/leitura de fotos reais.
- **Acesso**: TRIP_SECRET, SESSION_SECRET e APP_ORIGIN. Sem isso o projeto é apenas uma prévia, sem ações autenticadas.
- **Conteúdo real**: pousadas, restaurantes, ponto oficial de cada carimbo, reserva da escuna, praia das Bodas, cachoeiras, endereços, contatos e fotos de referência.
- **Publicação**: GitHub/Vercel e domínio final. Nenhum deploy acontece automaticamente por instalar ou salvar instruções de ambiente.

As integrações estão implementadas, mas só podem ser validadas de ponta a ponta depois que você configurar suas contas. O checklist de dois celulares e foto privada acima faz parte da verificação antes da viagem.

## Validação nesta implementação

- Instalação reproduzida com `npm ci` pelo lockfile; lint, TypeScript e build passaram sem credenciais externas.
- 8 testes de dados e processamento de imagens: fuso, cronograma, IDs, Maps, volta sem perder cidades, decodificação, formato e remoção de metadados.
- 9 testes de navegador Chromium: 360/390/430 px sem overflow horizontal, onboarding, navegação, ausência de erros JavaScript de runtime, acesso privado/cookie/CSRF, checks entre dois contextos com API simulada, rollback/offline, detalhes, carimbos pendentes, uploads com retry/exclusão e shell PWA offline, dimensões das modais mobile com conteúdo curto/longo e recuperação do mapa após falha.
- Auditoria npm: nenhuma vulnerabilidade conhecida nas versões do lockfile durante a verificação.
- O provedor anterior OpenStreetMap direto apresentou bloqueio de uso no Windows. O fundo agora usa a CDN CARTO Positron; o header das páginas também foi corrigido para identificar a origem, mantendo `no-referrer` na sessão. Em falha de rede, a camada de ruas é removida, os pontos/rotas permanecem e há um botão para tentar novamente. A política desta máquina da nuvem bloqueia também o acesso real à CDN (CONNECT 403); os testes de carregamento/recuperação usam imagens simuladas. Os domínios `a.basemaps.cartocdn.com`, `b.basemaps.cartocdn.com`, `c.basemaps.cartocdn.com` e `d.basemaps.cartocdn.com` foram adicionados ao rascunho de rede, preservando os anteriores. Confirme o carregamento real no seu navegador após atualizar o projeto.
- Supabase e OAuth/Drive reais ainda não foram testados: credenciais não foram fornecidas. Teste esses serviços antes de entregar o link definitivo aos seus pais.

## Trabalhar no Windows e continuar na nuvem

O código está no branch `main` de `Eduarda-Camilo/bodas-de-prata`. Use um clone Git, não um ZIP, para preservar o vínculo e o histórico.

O script `scripts/setup-windows.ps1` clona na pasta solicitada no Windows (ou atualiza um checkout limpo no branch `main`), instala pelo lockfile e inicia o site. Requer Git for Windows e Node.js 24 LTS. Ele recusa pastas não vazias sem Git, alterações locais, outro repositório e outro branch. Usa `git pull --ff-only`: um histórico divergente interrompe a operação, sem merge automático, reset ou exclusão de arquivos.

Você pode baixar esse script pelo botão Raw no GitHub e executá-lo no PowerShell. Para outro caminho:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1 -Destination 'C:\caminho\bodas-de-prata'
```

A opção de ExecutionPolicy vale somente para esse processo, não altera a política permanente do Windows. Se a política da sua organização impedir scripts, execute manualmente `git clone`, `npm ci` e `npm run dev` conforme as instruções acima; não altere políticas corporativas.

Antes de editar em qualquer máquina: `git status`, seguido de `git pull --ff-only origin main` com a árvore limpa. Depois de editar: revise `git diff`, faça commit e `git push origin main`. Antes de pedir continuação nesta nuvem, envie suas alterações locais ao GitHub; antes de continuar no Windows, puxe os commits publicados daqui. Não edite os mesmos arquivos simultaneamente nas duas máquinas. Isso reduz conflitos; nenhum fluxo pode garantir ausência absoluta de conflitos quando existem alterações paralelas.

Nunca use `git reset --hard`, `git clean -fd`, `git push --force` ou substitua a pasta `.git` para sincronizar. Se `--ff-only` falhar, pare e resolva os commits divergentes preservando os dois lados. `.env.local`, `.env.drive`, `node_modules` e `.next` são locais/ignorados e não devem ser copiados para o GitHub.


## Comportamento das modais

Detalhes, foto ampliada e mapa ilustrado usam `components/BottomSheet.tsx`. No celular, a ficha ocupa toda a largura, fica centralizada na base e cresce conforme o conteúdo, até 92% da altura disponível. Conteúdo longo rola internamente; o X fica no cabeçalho sempre visível. A abertura sobe da base, o fundo fica escurecido e o scroll da página é bloqueado enquanto a ficha estiver aberta. Escape e toque no fundo fecham a ficha; foco é contido pelo dialog nativo. As animações respeitam `prefers-reduced-motion`.

O cache PWA só é registrado em produção. Em desenvolvimento, o app remove seu próprio service worker/cache antigo para que mudanças de layout não fiquem presas no navegador. Depois de atualizar o projeto local, reinicie `npm run dev` e use Ctrl+F5 na primeira abertura.
