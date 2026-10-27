// Isolated PostgreSQL test, never connects to the live Supabase project.
// Requires Docker and a pre-pulled postgres:17-alpine image.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const env = { ...process.env };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
const name = `half-drawing-comments-test-${process.pid}`;
const docker = args => execFileSync('docker', ['--host=unix:///var/run/docker.sock', ...args], { env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const sql = source => execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', '-i', name, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { env, input: source, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
let started = false;
try {
  docker(['info', '--format', '{{.ServerVersion}}']);
  docker(['run', '-d', '--pull=never', '--network=none', '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']); started = true;
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { docker(['exec', name, 'pg_isready', '-U', 'postgres']); ready = true; break; }
    catch { await setTimeout(250); }
  }
  if (!ready) throw new Error('Temporary PostgreSQL did not become ready');
  sql(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222'), ('99999999-9999-4999-8999-999999999999');
    create table public.rooms(id uuid primary key, host_id uuid, guest_id uuid, status text, expires_at timestamptz);
    insert into public.rooms values
      ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','completed',now()-interval '1 day'),
      ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','completed',now()+interval '1 day'),
      ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','guest_joined',now()+interval '1 day');
    alter table public.rooms enable row level security;
    grant select on public.rooms to authenticated;
    create policy participants on public.rooms for select to authenticated using (auth.uid()=host_id or auth.uid()=guest_id);
  `);
  const migration = fs.readFileSync(new URL('../supabase/migrations/20261027_room_comments.sql', import.meta.url), 'utf8');
  sql(migration);
  sql(`insert into public.room_comments(room_id,author_id,body) values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','before migration rerun');`);
  sql(migration);
  sql(fs.readFileSync(new URL('./room-comments.security.sql', import.meta.url), 'utf8'));
  console.log('PostgreSQL: migration rerun, participant reads, own upsert/delete, expired completed room, one entry per author, 80-character/emoji constraints, spoofing/outsider/anonymous/unfinished-room denial, immutable identity and cascade deletion PASS');
} catch (error) {
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  if (started) docker(['rm', '-f', name]);
}
