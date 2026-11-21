-- Feriados exibidos na Agenda (/schedule) — puramente informativos: nunca
-- contam como cirurgia, nunca alteram status de agendamento, nunca
-- bloqueiam o cadastro de uma cirurgia naquele dia.
--
-- scope + state/city permite feriados estaduais e municipais no futuro,
-- quando o cadastro de hospital tiver cidade/UF pra fazer o "match"
-- automático (por ora só feriados nacionais são semeados abaixo — ver
-- docs/ARCHITECTURE.md). state/city ficam livres pra cadastro manual via
-- /settings/holidays desde já, mesmo sem o matching automático.
create table holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  scope text not null check (scope in ('national', 'state', 'municipal')),
  state text,
  city text,
  is_facultative boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_holidays_date on holidays (date);
create trigger trg_holidays_updated_at before update on holidays
  for each row execute function set_updated_at();

alter table holidays enable row level security;
create policy holidays_full_access_authenticated on holidays
  for all to authenticated using (true) with check (true);

-- Feriados nacionais fixos + móveis (Carnaval, Sexta-feira Santa, Corpus
-- Christi — datas calculadas pelo algoritmo de Gauss/Meeus a partir da
-- Páscoa), 2025-2030. Carnaval e Corpus Christi são tradicionalmente
-- pontos facultativos (não feriado nacional por lei), por isso
-- is_facultative = true nesses; os demais são feriados nacionais de fato.
-- Pra anos além de 2030, cadastrar manualmente em /settings/holidays —
-- não precisa de nova migration pra isso.
insert into holidays (name, date, scope, is_facultative) values
  ('Confraternização Universal', '2025-01-01', 'national', false),
  ('Carnaval (segunda-feira)', '2025-03-03', 'national', true),
  ('Carnaval (terça-feira)', '2025-03-04', 'national', true),
  ('Sexta-feira Santa', '2025-04-18', 'national', false),
  ('Tiradentes', '2025-04-21', 'national', false),
  ('Dia do Trabalho', '2025-05-01', 'national', false),
  ('Corpus Christi', '2025-06-19', 'national', true),
  ('Independência do Brasil', '2025-09-07', 'national', false),
  ('Nossa Senhora Aparecida', '2025-10-12', 'national', false),
  ('Finados', '2025-11-02', 'national', false),
  ('Proclamação da República', '2025-11-15', 'national', false),
  ('Dia Nacional de Zumbi e da Consciência Negra', '2025-11-20', 'national', false),
  ('Natal', '2025-12-25', 'national', false),
  ('Confraternização Universal', '2026-01-01', 'national', false),
  ('Carnaval (segunda-feira)', '2026-02-16', 'national', true),
  ('Carnaval (terça-feira)', '2026-02-17', 'national', true),
  ('Sexta-feira Santa', '2026-04-03', 'national', false),
  ('Tiradentes', '2026-04-21', 'national', false),
  ('Dia do Trabalho', '2026-05-01', 'national', false),
  ('Corpus Christi', '2026-06-04', 'national', true),
  ('Independência do Brasil', '2026-09-07', 'national', false),
  ('Nossa Senhora Aparecida', '2026-10-12', 'national', false),
  ('Finados', '2026-11-02', 'national', false),
  ('Proclamação da República', '2026-11-15', 'national', false),
  ('Dia Nacional de Zumbi e da Consciência Negra', '2026-11-20', 'national', false),
  ('Natal', '2026-12-25', 'national', false),
  ('Confraternização Universal', '2027-01-01', 'national', false),
  ('Carnaval (segunda-feira)', '2027-02-08', 'national', true),
  ('Carnaval (terça-feira)', '2027-02-09', 'national', true),
  ('Sexta-feira Santa', '2027-03-26', 'national', false),
  ('Tiradentes', '2027-04-21', 'national', false),
  ('Dia do Trabalho', '2027-05-01', 'national', false),
  ('Corpus Christi', '2027-05-27', 'national', true),
  ('Independência do Brasil', '2027-09-07', 'national', false),
  ('Nossa Senhora Aparecida', '2027-10-12', 'national', false),
  ('Finados', '2027-11-02', 'national', false),
  ('Proclamação da República', '2027-11-15', 'national', false),
  ('Dia Nacional de Zumbi e da Consciência Negra', '2027-11-20', 'national', false),
  ('Natal', '2027-12-25', 'national', false),
  ('Confraternização Universal', '2028-01-01', 'national', false),
  ('Carnaval (segunda-feira)', '2028-02-28', 'national', true),
  ('Carnaval (terça-feira)', '2028-02-29', 'national', true),
  ('Sexta-feira Santa', '2028-04-14', 'national', false),
  ('Tiradentes', '2028-04-21', 'national', false),
  ('Dia do Trabalho', '2028-05-01', 'national', false),
  ('Corpus Christi', '2028-06-15', 'national', true),
  ('Independência do Brasil', '2028-09-07', 'national', false),
  ('Nossa Senhora Aparecida', '2028-10-12', 'national', false),
  ('Finados', '2028-11-02', 'national', false),
  ('Proclamação da República', '2028-11-15', 'national', false),
  ('Dia Nacional de Zumbi e da Consciência Negra', '2028-11-20', 'national', false),
  ('Natal', '2028-12-25', 'national', false),
  ('Confraternização Universal', '2029-01-01', 'national', false),
  ('Carnaval (segunda-feira)', '2029-02-12', 'national', true),
  ('Carnaval (terça-feira)', '2029-02-13', 'national', true),
  ('Sexta-feira Santa', '2029-03-30', 'national', false),
  ('Tiradentes', '2029-04-21', 'national', false),
  ('Dia do Trabalho', '2029-05-01', 'national', false),
  ('Corpus Christi', '2029-05-31', 'national', true),
  ('Independência do Brasil', '2029-09-07', 'national', false),
  ('Nossa Senhora Aparecida', '2029-10-12', 'national', false),
  ('Finados', '2029-11-02', 'national', false),
  ('Proclamação da República', '2029-11-15', 'national', false),
  ('Dia Nacional de Zumbi e da Consciência Negra', '2029-11-20', 'national', false),
  ('Natal', '2029-12-25', 'national', false),
  ('Confraternização Universal', '2030-01-01', 'national', false),
  ('Carnaval (segunda-feira)', '2030-03-04', 'national', true),
  ('Carnaval (terça-feira)', '2030-03-05', 'national', true),
  ('Sexta-feira Santa', '2030-04-19', 'national', false),
  ('Tiradentes', '2030-04-21', 'national', false),
  ('Dia do Trabalho', '2030-05-01', 'national', false),
  ('Corpus Christi', '2030-06-20', 'national', true),
  ('Independência do Brasil', '2030-09-07', 'national', false),
  ('Nossa Senhora Aparecida', '2030-10-12', 'national', false),
  ('Finados', '2030-11-02', 'national', false),
  ('Proclamação da República', '2030-11-15', 'national', false),
  ('Dia Nacional de Zumbi e da Consciência Negra', '2030-11-20', 'national', false),
  ('Natal', '2030-12-25', 'national', false);
