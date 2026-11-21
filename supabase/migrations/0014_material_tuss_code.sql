-- Código TUSS (Tabela 19 — materiais, órteses, próteses e OPME) no
-- cadastro de materiais, alinhado ao que as operadoras pedem numa guia de
-- solicitação de OPME. Fabricante/modelo/registro ANVISA vêm preenchidos
-- automaticamente pela busca na base da ANS quando o material tem
-- correspondência lá (não são editáveis à mão nesta primeira versão).

alter table materials_catalog
  add column tuss_code text,
  add column manufacturer text,
  add column model text,
  add column anvisa_registration text;
