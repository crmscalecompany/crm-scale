-- Extensions

create extension if not exists "pgcrypto" with schema "extensions";

-- Enums
--
-- lead_status / deal_status model the SDR-side and Closer-side halves of the
-- funnel independently (a lead can be lost before a deal ever exists, and a
-- deal has its own richer state machine once a closer is engaged). Loss
-- *reasons* live in lost_reasons (FK), not as enum values, so the enum stays
-- small and reasons stay admin-editable without a migration.

create type public.user_role as enum ('sdr', 'closer', 'am', 'advogado', 'admin');

create type public.lead_status as enum (
  'novo',
  'em_atendimento',
  'follow_up',
  'reuniao_agendada',
  'convertido',
  'perdido'
);

create type public.deal_status as enum (
  'em_negociacao',
  'proposta_enviada',
  'follow_up',
  'fechado',
  'perdido'
);

create type public.qualification_etapa as enum ('sdr', 'closer');

create type public.qualification_entidade_tipo as enum ('lead', 'deal');

create type public.meeting_referencia_tipo as enum ('lead', 'deal', 'client');

create type public.meeting_tipo as enum ('venda', 'acompanhamento');

create type public.meeting_status as enum ('marcada', 'realizada', 'no_show', 'remarcada');

create type public.whatsapp_direcao as enum ('recebida', 'enviada');

create type public.contract_status_assinatura as enum ('pendente', 'enviado', 'assinado', 'cancelado');

create type public.commission_status as enum ('pendente', 'pago');

create type public.meta_event_name as enum ('Lead', 'Qualified', 'Purchase');

create type public.meta_event_status as enum ('pendente', 'enviado', 'erro');
