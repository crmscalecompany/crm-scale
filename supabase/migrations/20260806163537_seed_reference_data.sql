-- Starter reference data — admin-editable afterward without a deploy
-- (qualification_reasons/lost_reasons have no `ativo=false` seed rows here;
-- everything starts active). Niche list is a starting point, not exhaustive
-- — matches the operation types named in the blueprint (advogados, coaches)
-- plus the one real niche already seen in the Monday export ("Live Coach").

insert into public.niches (nome) values
  ('Advocacia'),
  ('Coaching'),
  ('Live Coach');

-- Qualification reasons — blueprint Annex 8 draft lists (§8), flagged there
-- as "a validar" (still provisional) but loaded now since qualification
-- capture starts in Week 2's kanban, not later.
insert into public.qualification_reasons (etapa, codigo, descricao) values
  ('sdr', 'perfil_orcamento_ok', 'Perfil e orçamento compatíveis com o produto'),
  ('sdr', 'decisor_confirmado', 'Decisor confirmado (fala/decide sozinho)'),
  ('sdr', 'urgencia_real', 'Urgência real (precisa resolver logo)'),
  ('sdr', 'sem_orcamento', 'Sem orçamento compatível'),
  ('sdr', 'nao_decisor', 'Não é decisor — depende de terceiros'),
  ('sdr', 'baixo_interesse', 'Baixo interesse / respondeu por educação'),
  ('sdr', 'fora_perfil_nicho', 'Fora do perfil do nicho'),
  ('sdr', 'contato_invalido', 'Dado de contato incompleto ou inválido'),
  ('closer', 'fechamento_rapido', 'Fechamento rápido, lead decidido'),
  ('closer', 'proposta_bem_recebida', 'Proposta bem recebida, negociação morna e saudável'),
  ('closer', 'objecao_preco', 'Objeção de preço'),
  ('closer', 'objecao_timing', 'Objeção de timing ("não é o momento")'),
  ('closer', 'avaliando_concorrencia', 'Avaliando concorrência'),
  ('closer', 'validar_internamente', 'Precisa validar internamente antes de decidir'),
  ('closer', 'sem_verba_agora', 'Qualificado, mas sem verba agora'),
  ('closer', 'lead_desqualificado_sdr', 'Lead chegou desqualificado (SDR errou na triagem)');

-- Lost reasons — categoria matches the qualification_reasons etapa split
-- ('sdr' for leads.motivo_perda_id, 'closer' for deals.motivo_perda), plus
-- one shared category for the follow-up cadence's automatic loss (§2.3).
insert into public.lost_reasons (categoria, descricao) values
  ('sdr', 'Sem resposta após cadência de follow-up'),
  ('sdr', 'Fora do perfil do nicho'),
  ('sdr', 'Dado de contato inválido'),
  ('closer', 'Objeção de preço'),
  ('closer', 'Avaliando concorrência'),
  ('closer', 'Sem verba no momento'),
  ('closer', 'Sem resposta após cadência de follow-up'),
  ('closer', 'Desistiu do processo');
