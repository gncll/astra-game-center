begin;
-- Preserve all prior game IDs (including another release's Skybound addition).
do $$
declare prior text;
begin
  select pg_get_expr(conbin,conrelid) into prior from pg_constraint
  where conrelid='public.game_library'::regclass and conname='game_library_game_id_check';
  if prior is null then raise exception 'Expected game catalog constraint is missing'; end if;
  if position('fine-print' in prior)=0 then
    alter table public.game_library drop constraint game_library_game_id_check;
    execute format('alter table public.game_library add constraint game_library_game_id_check check ((%s) or game_id = %L)',prior,'fine-print');
  end if;
end $$;

-- Counters only. Documents, prompts, dialogue and credentials are never stored here.
create table if not exists public.fine_print_usage (
  day date not null,
  scope text not null,
  kind text not null check(kind in ('research','turn','speech')),
  used integer not null default 0 check(used>=0),
  primary key(day,scope,kind)
);
alter table public.fine_print_usage enable row level security;
revoke all on public.fine_print_usage from public,anon,authenticated;

create or replace function public.reserve_fine_print_usage(p_kind text,p_amount integer,p_case uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  owner uuid:=auth.uid();
  today date:=(now() at time zone 'UTC')::date;
  person_limit integer; global_limit integer; person_used integer; total_used integer; case_used integer;
begin
  if owner is null then raise exception 'Sign-in required'; end if;
  if p_case is null or p_kind is null or p_kind not in ('research','turn','speech') or p_amount is null or p_amount<1
    or (p_kind<>'speech' and p_amount<>1) or (p_kind='speech' and p_amount>1400)
    then raise exception 'Invalid usage request'; end if;
  person_limit:=case p_kind when 'research' then 3 when 'turn' then 12 else 12000 end;
  global_limit:=case p_kind when 'research' then 30 when 'turn' then 120 else 120000 end;
  -- One transaction-wide lock covers both account and global limits under concurrency.
  perform pg_advisory_xact_lock(6419162026);
  select coalesce(sum(used),0) into person_used from public.fine_print_usage where day=today and scope='user:'||owner::text and kind=p_kind;
  select coalesce(sum(used),0) into total_used from public.fine_print_usage where day=today and scope='global' and kind=p_kind;
  select coalesce(sum(used),0) into case_used from public.fine_print_usage where scope='case:'||owner::text||':'||p_case::text and kind='speech';
  if person_used+p_amount>person_limit or total_used+p_amount>global_limit or (p_kind='speech' and case_used+p_amount>6000) then return false; end if;
  insert into public.fine_print_usage(day,scope,kind,used) values (today,'user:'||owner::text,p_kind,p_amount),(today,'global',p_kind,p_amount)
  on conflict(day,scope,kind) do update set used=public.fine_print_usage.used+excluded.used;
  if p_kind='speech' then
    insert into public.fine_print_usage(day,scope,kind,used) values(today,'case:'||owner::text||':'||p_case::text,p_kind,p_amount)
    on conflict(day,scope,kind) do update set used=public.fine_print_usage.used+excluded.used;
  end if;
  return true;
end $$;
revoke all on function public.reserve_fine_print_usage(text,integer,uuid) from public,anon;
grant execute on function public.reserve_fine_print_usage(text,integer,uuid) to authenticated;
commit;
