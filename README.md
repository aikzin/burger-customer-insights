# Hamburgueria Central

Sistema web responsivo para a operação de uma hamburgueria, com dados reais e isolamento multiempresa.

## Funcionalidades

- autenticação e onboarding da empresa
- dashboard operacional
- clientes, cardápio e categorias
- pedidos, cozinha e pagamentos
- estoque, fornecedores e compras
- campanhas, avaliações e relatórios
- configurações da organização

## Tecnologias

- React, TypeScript e Vite
- Tailwind CSS e shadcn/ui
- Supabase (Postgres, Auth e RLS)
- Vercel

## Desenvolvimento

Requer Node.js e npm.

```sh
npm install
npm run dev
```

Validação antes de publicar:

```sh
npm run lint
npm run build
```

## Banco de dados

As migrations versionadas estão em `supabase/migrations`. Variáveis públicas necessárias:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca adicione chaves privadas ou `service_role` ao frontend.
