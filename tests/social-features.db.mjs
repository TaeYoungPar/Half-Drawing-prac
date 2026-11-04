// Isolated PostgreSQL test, never connects to the live Supabase project.
// Requires Docker and a pre-pulled postgres:17-alpine image.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const env = { ...process.env };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
const name = `half-drawing-social-test-${process.pid}`;
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
  sql(fs.readFileSync(new URL('./social-features.bootstrap.sql', import.meta.url), 'utf8'));
  const migration = fs.readFileSync(new URL('../supabase/enable_social_features.sql', import.meta.url), 'utf8');
  sql(migration); sql(migration);
  sql(fs.readFileSync(new URL('./social-features.security.sql', import.meta.url), 'utf8'));
  const { execFile } = await import('node:child_process');
  const concurrent = () => new Promise((resolve,reject) => {
    const child = execFile('docker', ['--host=unix:///var/run/docker.sock','exec','-i',name,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'], { env, encoding:'utf8' }, (error,stdout,stderr) => error ? reject(new Error(stderr)) : resolve(stdout.trim().split('\n').at(-1)));
    child.stdin.end(`set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false); select public.create_rematch_room('66666666-6666-4666-8666-666666666666','concurrent-round','[{}]')->>'room_id';`);
  });
  const ids = await Promise.all([concurrent(), concurrent()]);
  if (ids[0] !== ids[1]) throw new Error('Concurrent calls created different rooms');
  sql(`do $$ begin if (select count(*) from public.rooms where prompt='concurrent-round')<>1 then raise exception 'Extra concurrent room'; end if; end $$;`);
  sql(migration);
  sql(`do $$ begin if not exists(select 1 from public.room_rematches where parent_room_id='66666666-6666-4666-8666-666666666666' and next_room_id='${ids[0]}'::uuid) then raise exception 'Migration rerun lost round'; end if; end $$;`);
  console.log('PostgreSQL: 1000-row pagination, private hide/restore, unread/edit versions, RLS/RPC authorization, same-friend role swap, no implicit join, leaked-code rejection, expiration, concurrent idempotency and migration rerun PASS');
} catch (error) {
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  if (started) docker(['rm', '-f', name]);
}
