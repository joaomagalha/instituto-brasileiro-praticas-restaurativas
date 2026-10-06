-- =====================================================================
-- IBPR · 18 · Travas da tabela de inscritos (06/10/2026)
-- =====================================================================
-- Auditoria do "Receber publicações" (17-inscritos.sql), antes de avisar
-- o cliente. Corrige:
--   1. Robô enchendo a tabela: a API aceita uma lista inteira num envio só;
--      sem trava, poucos envios lotariam os 500 MB do plano grátis, e banco
--      lotado fica só leitura (o painel pararia de publicar). Agora: no
--      máximo 30 inscrições a cada 10 minutos no site todo.
--   2. A data do aceite (prova da LGPD) vinha de quem envia; agora é sempre
--      a hora do servidor, e o visitante só pode mandar nome, e-mail,
--      página e aceite.
--   3. Logado que não é editor ficava com permissões de sobra; ficam só
--      ler, inserir e apagar (e o RLS continua exigindo editor).
--   4. E-mail com aspas, vírgula ou < passava e podia bagunçar o Cco.
-- Rodar inteiro no SQL Editor. Pode rodar de novo sem estragar.
-- =====================================================================

create or replace function public.inscritos_trava()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  new.criado_em := now();
  new.id := gen_random_uuid();
  if (select count(*) from public.inscritos
       where criado_em > now() - interval '10 minutes') >= 30 then
    raise exception 'Muitas inscrições em pouco tempo. Tente de novo em alguns minutos.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists inscritos_trava on public.inscritos;
create trigger inscritos_trava
  before insert on public.inscritos
  for each row execute function public.inscritos_trava();

-- visitante: só as colunas que o formulário manda
revoke all on public.inscritos from anon;
grant insert (nome, email, origem, consentimento) on public.inscritos to anon;

-- logado: só o que o painel usa (o RLS ainda exige editor pra ler e apagar)
revoke all on public.inscritos from authenticated;
grant select, delete on public.inscritos to authenticated;
grant insert (nome, email, origem, consentimento) on public.inscritos to authenticated;

-- e-mail: só caracteres comuns de endereço
alter table public.inscritos drop constraint if exists inscritos_email_check;
alter table public.inscritos add constraint inscritos_email_check
  check (char_length(email) between 5 and 254
         and email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Conferência: o gatilho e as permissões
select tgname from pg_trigger where tgrelid = 'public.inscritos'::regclass and not tgisinternal;
