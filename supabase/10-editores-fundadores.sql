-- 16/09/2026: os três convidados viram editores do painel (nome + foto).
-- Rodar depois dos convites em Authentication > Users. Idempotente.
insert into public.editores (user_id, nome, foto_url)
select u.id, v.nome, v.foto_url
from (values
  ('decildo@hotmail.com',          'Decildo Lopes',          'https://www.ibpr.com.br/assets/images/fundadores/decildo-lopes.jpg'),
  ('fernandamariela@hotmail.com',  'Fernanda Mariela Lopes', 'https://www.ibpr.com.br/assets/images/fundadores/fernanda-mariela-lopes.jpg'),
  ('raunyviana@hotmail.com',       'Rauny Viana',            'https://www.ibpr.com.br/assets/images/fundadores/rauny-viana.jpg')
) as v(email, nome, foto_url)
join auth.users u on lower(u.email) = v.email
on conflict (user_id) do update set nome = excluded.nome, foto_url = excluded.foto_url;

select e.nome, u.email, e.foto_url is not null as tem_foto
from public.editores e join auth.users u on u.id = e.user_id
order by e.nome;
