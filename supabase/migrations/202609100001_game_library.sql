begin;
create table if not exists public.game_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (game_id in ('wardenfall','sunset','mario','sidewalk','pine')),
  favorite boolean not null default false,
  last_launched_at timestamptz,
  primary key (user_id, game_id)
);
alter table public.game_library enable row level security;
revoke all on table public.game_library from anon;
grant select, insert, update, delete on table public.game_library to authenticated;
create policy "Users read their own library" on public.game_library for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert their own library" on public.game_library for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own library" on public.game_library for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their own library" on public.game_library for delete to authenticated using ((select auth.uid()) = user_id);

-- Update only the requested field so concurrent favorite and launch requests do not erase each other.
create function public.set_game_favorite(p_game_id text, p_favorite boolean) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  if p_favorite is null then raise exception 'Favorite selection required'; end if;
  insert into public.game_library (user_id, game_id, favorite)
  values (auth.uid(), p_game_id, p_favorite)
  on conflict (user_id, game_id) do update set favorite = excluded.favorite;
end;
$$;
create function public.record_game_launch(p_game_id text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  if p_game_id <> 'wardenfall' or p_game_id is null then raise exception 'Game unavailable'; end if;
  insert into public.game_library (user_id, game_id, last_launched_at)
  values (auth.uid(), p_game_id, now())
  on conflict (user_id, game_id) do update set last_launched_at = excluded.last_launched_at;
end;
$$;
revoke all on function public.set_game_favorite(text,boolean) from public, anon;
revoke all on function public.record_game_launch(text) from public, anon;
grant execute on function public.set_game_favorite(text,boolean) to authenticated;
grant execute on function public.record_game_launch(text) to authenticated;
commit;
