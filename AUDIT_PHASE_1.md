# Auditoria — Fase 1

## Problemas confirmados

- Indicadores financeiros derivados de multiplicadores fixos, sem pedidos reais.
- Percentuais de comparação, pedidos recentes e ranking de produtos fictícios.
- Clientes persistidos apenas em `localStorage` e frequência preenchida manualmente.
- E-mail obrigatório apesar de telefone ser o contato principal.
- Navegação incompleta, botões com `href="#"` e uso de `alert()`.
- Nenhuma autenticação, autorização, RLS, banco, migration ou persistência em nuvem.
- Arquitetura concentrada nas páginas, sem camada de serviços ou domínio.
- Nenhuma separação entre status operacional, financeiro e de entrega.
- Ausência de testes automatizados e script de verificação de tipos dedicado.

## Escopo entregue neste incremento

- Cliente Supabase via variáveis públicas próprias para frontend (sem secrets).
- Migration inicial multiempresa com perfis, papéis, clientes, cardápio, ingredientes, fichas técnicas, pedidos, itens, pagamentos e auditoria.
- RLS por organização e papel; status de pedido, pagamento e entrega separados.
- Navegação responsiva para todos os módulos previstos.
- Remoção da apresentação de métricas, comparações e listas fictícias.
- Remoção de `localStorage`, frequência manual e obrigatoriedade de e-mail.

## Limite atual

A migration ainda precisa ser aplicada a um projeto Supabase real e validada com usuários de cada papel. A autenticação visual e as consultas React Query entram no próximo incremento da Fase 1 depois da conexão do projeto.
