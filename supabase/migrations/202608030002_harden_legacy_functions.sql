-- Impede que uma função administrativa legada seja chamada pela API.
-- Ela não pertence ao fluxo da aplicação e não precisa ser exposta.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

