-- Admin read model for /saabai-admin/chat-history.
-- Apply this by hand in the Supabase SQL editor. Do not auto-apply it on deploy.
-- service_role only. anon and authenticated cannot call it.
-- Keep the filters in step with summariseChatHistory in lib/chat-history.ts.
-- Logged chats only (bot_slug set). Dates are inclusive bounds passed by the app
-- (Brisbane calendar days). Search is a case-insensitive literal substring.
-- Leads count only when leads.conversation_id points at a matching chat.

create index if not exists conversations_site_started_idx
  on public.conversations (site_id, started_at desc)
  where bot_slug is not null;

create or replace function public.chat_history_report(
  p_bot text,
  p_site text,
  p_from timestamptz,
  p_to timestamptz,
  p_q text,
  p_page integer,
  p_page_size integer,
  p_conversation_id text,
  p_export boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bot text;
  v_site text;
  v_q text;
  v_from timestamptz;
  v_to timestamptz;
  v_page integer;
  v_size integer;
  v_id text;
  v_export boolean;
  v_total integer;
  v_result jsonb;
  v_transcript jsonb;
begin
  v_bot := nullif(left(btrim(coalesce(p_bot, '')), 80), '');
  v_site := nullif(left(btrim(coalesce(p_site, '')), 160), '');
  v_q := nullif(left(btrim(coalesce(p_q, '')), 200), '');
  v_from := p_from;
  v_to := p_to;
  if v_from is not null and v_to is not null and v_from > v_to then
    v_from := p_to;
    v_to := p_from;
  end if;
  v_export := coalesce(p_export, false);
  v_page := case when v_export then 1 else greatest(coalesce(p_page, 1), 1) end;
  v_size := case
    when v_export then 5000
    else least(greatest(coalesce(p_page_size, 25), 1), 100)
  end;
  v_id := nullif(left(btrim(coalesce(p_conversation_id, '')), 200), '');

  drop table if exists pg_temp.ch_filtered;
  create temporary table ch_filtered (
    id text primary key,
    bot_slug text not null,
    site_id text,
    channel text,
    started_at timestamptz not null
  ) on commit drop;

  if v_q is null then
    insert into pg_temp.ch_filtered (id, bot_slug, site_id, channel, started_at)
    select c.id, c.bot_slug, nullif(btrim(coalesce(c.site_id, '')), ''), coalesce(c.channel, ''), c.started_at
    from public.conversations c
    where c.bot_slug is not null
      and btrim(c.bot_slug) <> ''
      and (v_bot is null or c.bot_slug = v_bot)
      and (v_site is null or btrim(c.site_id) = v_site)
      and (v_from is null or c.started_at >= v_from)
      and (v_to is null or c.started_at < v_to);
  else
    insert into pg_temp.ch_filtered (id, bot_slug, site_id, channel, started_at)
    select c.id, c.bot_slug, nullif(btrim(coalesce(c.site_id, '')), ''), coalesce(c.channel, ''), c.started_at
    from public.conversations c
    where c.bot_slug is not null
      and btrim(c.bot_slug) <> ''
      and (v_bot is null or c.bot_slug = v_bot)
      and (v_site is null or btrim(c.site_id) = v_site)
      and (v_from is null or c.started_at >= v_from)
      and (v_to is null or c.started_at < v_to)
      and exists (
        select 1 from public.messages m
        where m.conversation_id = c.id
          and position(lower(v_q) in lower(m.content)) > 0
      );
  end if;

  select count(*)::integer into v_total from pg_temp.ch_filtered;

  with msg_agg as (
    select
      m.conversation_id,
      count(*)::integer as messages,
      coalesce(sum(m.input_tokens), 0)::bigint as input_tokens,
      coalesce(sum(m.output_tokens), 0)::bigint as output_tokens,
      coalesce(sum(m.cost_usd), 0)::numeric as cost_usd
    from public.messages m
    where m.conversation_id in (select id from pg_temp.ch_filtered)
    group by m.conversation_id
  ),
  lead_agg as (
    select l.conversation_id, count(*)::integer as leads
    from public.leads l
    where l.conversation_id in (select id from pg_temp.ch_filtered)
    group by l.conversation_id
  )
  select jsonb_build_object(
    'total', v_total,
    'page', v_page,
    'pageSize', v_size,
    'truncated', v_export and v_total > 5000,
    'bots', coalesce((
      select jsonb_agg(bot order by bot)
      from (
        select distinct c.bot_slug as bot
        from public.conversations c
        where c.bot_slug is not null and btrim(c.bot_slug) <> ''
        order by 1
        limit 300
      ) s
    ), '[]'::jsonb),
    'sites', coalesce((
      select jsonb_agg(site order by site)
      from (
        select distinct btrim(c.site_id) as site
        from public.conversations c
        where c.bot_slug is not null
          and c.site_id is not null
          and btrim(c.site_id) <> ''
        order by 1
        limit 300
      ) s
    ), '[]'::jsonb),
    'totals', (
      select jsonb_build_object(
        'chats', count(*)::integer,
        'messages', coalesce(sum(m.messages), 0)::integer,
        'leads', coalesce(sum(l.leads), 0)::integer,
        'inputTokens', coalesce(sum(m.input_tokens), 0)::bigint,
        'outputTokens', coalesce(sum(m.output_tokens), 0)::bigint,
        'costUsd', trim(to_char(coalesce(sum(m.cost_usd), 0), 'FM999999990.000000'))
      )
      from pg_temp.ch_filtered c
      left join msg_agg m on m.conversation_id = c.id
      left join lead_agg l on l.conversation_id = c.id
    ),
    'byBot', coalesce((
      select jsonb_agg(jsonb_build_object(
        'bot', bot,
        'chats', chats,
        'messages', messages,
        'leads', leads,
        'inputTokens', input_tokens,
        'outputTokens', output_tokens,
        'costUsd', cost_usd
      ) order by chats desc, bot asc)
      from (
        select
          c.bot_slug as bot,
          count(*)::integer as chats,
          coalesce(sum(m.messages), 0)::integer as messages,
          coalesce(sum(l.leads), 0)::integer as leads,
          coalesce(sum(m.input_tokens), 0)::bigint as input_tokens,
          coalesce(sum(m.output_tokens), 0)::bigint as output_tokens,
          trim(to_char(coalesce(sum(m.cost_usd), 0), 'FM999999990.000000')) as cost_usd
        from pg_temp.ch_filtered c
        left join msg_agg m on m.conversation_id = c.id
        left join lead_agg l on l.conversation_id = c.id
        group by c.bot_slug
      ) s
    ), '[]'::jsonb),
    'bySite', coalesce((
      select jsonb_agg(jsonb_build_object(
        'site', site,
        'inputTokens', input_tokens,
        'outputTokens', output_tokens,
        'costUsd', cost_usd
      ) order by cost_num desc, site asc)
      from (
        select
          coalesce(c.site_id, '') as site,
          coalesce(sum(m.input_tokens), 0)::bigint as input_tokens,
          coalesce(sum(m.output_tokens), 0)::bigint as output_tokens,
          coalesce(sum(m.cost_usd), 0) as cost_num,
          trim(to_char(coalesce(sum(m.cost_usd), 0), 'FM999999990.000000')) as cost_usd
        from pg_temp.ch_filtered c
        left join msg_agg m on m.conversation_id = c.id
        group by coalesce(c.site_id, '')
      ) s
    ), '[]'::jsonb),
    'conversations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'bot', bot_slug,
        'site', coalesce(site_id, ''),
        'channel', channel,
        'startedAt', started_at,
        'messages', messages,
        'leads', leads,
        'inputTokens', input_tokens,
        'outputTokens', output_tokens,
        'costUsd', cost_usd,
        'preview', coalesce(preview, '')
      ) order by started_at desc, id asc)
      from (
        select
          c.id,
          c.bot_slug,
          c.site_id,
          c.channel,
          c.started_at,
          coalesce(m.messages, 0) as messages,
          coalesce(l.leads, 0) as leads,
          coalesce(m.input_tokens, 0) as input_tokens,
          coalesce(m.output_tokens, 0) as output_tokens,
          trim(to_char(coalesce(m.cost_usd, 0), 'FM999999990.000000')) as cost_usd,
          prev.preview
        from pg_temp.ch_filtered c
        left join msg_agg m on m.conversation_id = c.id
        left join lead_agg l on l.conversation_id = c.id
        left join lateral (
          select left(msg.content, 500) as preview
          from public.messages msg
          where msg.conversation_id = c.id
            and (v_q is null or position(lower(v_q) in lower(msg.content)) > 0)
          order by
            (case when v_q is null then msg.created_at end) desc nulls last,
            (case when v_q is null then msg.id end) desc nulls last,
            (case when v_q is not null then msg.created_at end) asc nulls last,
            (case when v_q is not null then msg.id end) asc nulls last
          limit 1
        ) prev on true
        order by c.started_at desc, c.id asc
        limit v_size offset (v_page - 1) * v_size
      ) page_rows
    ), '[]'::jsonb)
  ) into v_result;

  v_transcript := null;
  if v_id is not null then
    select case when c.id is null then null else jsonb_build_object(
      'id', c.id,
      'bot', coalesce(c.bot_slug, ''),
      'site', coalesce(c.site_id, ''),
      'channel', coalesce(c.channel, ''),
      'startedAt', c.started_at,
      'truncated', (select count(*) from public.messages m where m.conversation_id = c.id) > 400,
      'messages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'role', m.role,
          'content', m.content,
          'model', coalesce(m.model, ''),
          'createdAt', m.created_at,
          'inputTokens', coalesce(m.input_tokens, 0),
          'outputTokens', coalesce(m.output_tokens, 0),
          'costUsd', trim(to_char(coalesce(m.cost_usd, 0), 'FM999999990.000000'))
        ) order by m.created_at asc, m.id asc)
        from (
          select *
          from public.messages
          where conversation_id = c.id
          order by created_at asc, id asc
          limit 400
        ) m
      ), '[]'::jsonb),
      'leads', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', l.id,
          'name', coalesce(l.name, ''),
          'email', coalesce(l.email, ''),
          'phone', coalesce(l.phone, ''),
          'status', coalesce(l.status, ''),
          'service', coalesce(l.service, ''),
          'notes', left(coalesce(l.notes, ''), 400),
          'createdAt', l.created_at
        ) order by l.created_at asc, l.id asc)
        from (
          select *
          from public.leads
          where conversation_id = c.id
          order by created_at asc, id asc
          limit 50
        ) l
      ), '[]'::jsonb)
    ) end
    into v_transcript
    from public.conversations c
    where c.id = v_id;
  end if;

  return v_result || jsonb_build_object('transcript', v_transcript);
end
$$;

revoke all on function public.chat_history_report(text, text, timestamptz, timestamptz, text, integer, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.chat_history_report(text, text, timestamptz, timestamptz, text, integer, integer, text, boolean) to service_role;

comment on function public.chat_history_report(text, text, timestamptz, timestamptz, text, integer, integer, text, boolean) is
  'Admin chat history report. service_role only.';

notify pgrst, 'reload schema';
