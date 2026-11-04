import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = path.resolve(new URL('..', import.meta.url).pathname);
function load(file, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const requireLocal = name => mocks[name] || load(path.relative(root,path.resolve(path.dirname(path.join(root,file)),`${name}.ts`)),mocks);
  vm.runInNewContext(source,{ exports,require:requireLocal,Date,URL }); return exports;
}
test('daily topics switch at Korean midnight across month/year boundaries and accept leap dates only when valid', () => {
  const { koreanDay, topicForDay } = load('app/utils/dailyTopic.ts');
  assert.equal(koreanDay(new Date('2026-11-04T14:59:59.999Z')),'2026-11-04');
  assert.equal(koreanDay(new Date('2026-11-04T15:00:00.000Z')),'2026-11-05');
  assert.equal(koreanDay(new Date('2026-12-31T15:00:00Z')),'2027-01-01');
  assert.ok(topicForDay('2028-02-29')); assert.equal(topicForDay('2026-02-29'),null);
  for (const day of ['2026-13-01','2026-11-31','garbage','2026-1-1']) assert.equal(topicForDay(day),null);
});
test('the daily rotation is deterministic, differs on adjacent days and visits every topic before repeating', () => {
  const { topicForDay } = load('app/utils/dailyTopic.ts');
  const topics = Array.from({length:32},(_,i)=>topicForDay(new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10)).topic);
  assert.equal(new Set(topics).size,32);
  assert.equal(topicForDay('2026-11-04').topic,topicForDay('2026-11-04').topic);
});
const uid='11111111-1111-4111-8111-111111111111';
const room={id:'33333333-3333-4333-8333-333333333333',code:'ABC123DEF4',prompt:'울보 양파',host_id:uid,guest_id:'22222222-2222-4222-8222-222222222222',status:'completed',created_at:'2026-11-04T00:00:00Z',expires_at:'2026-11-11T00:00:00Z',has_unread_comment:true};
test('upgraded library requests a bounded server page and hidden scope without downloading originals',async()=>{
  const calls=[];
  const api=load('app/lib/rooms/getMyRooms.ts',{'../supabase/client':{createClient:()=>({ auth:{ getSession:async()=>({data:{session:{user:{id:uid}}}})},rpc:async(name,args)=>{calls.push({name,args});return{data:{rooms:[room],total:1000},error:null};},from:()=>{throw new Error('Unexpected drawing/table read');}})}});
  const result=await api.getMyRooms(2,'host',true);
  assert.equal(result.total,1000); assert.equal(result.rooms[0].hasUnreadComment,true); assert.equal(result.extrasAvailable,true);
  assert.equal(calls[0].name,'get_my_library'); assert.equal(calls[0].args.p_page,2); assert.equal(calls[0].args.p_scope,'host'); assert.equal(calls[0].args.p_hidden,true);
});
test('library permissions/network errors never bypass hidden filtering via a legacy fallback',async()=>{
  for(const response of [{error:{code:'42501'}},{error:{code:'network'}},{data:{rooms:[{...room,host_id:'another-user',guest_id:null}],total:1}},{data:{rooms:[{...room,has_unread_comment:undefined}],total:1}}]) {
    const api=load('app/lib/rooms/getMyRooms.ts',{'../supabase/client':{createClient:()=>({ auth:{ getSession:async()=>({data:{session:{user:{id:uid}}}})},rpc:async()=>response,from:()=>{throw new Error('Privacy fallback');}})}});
    await assert.rejects(api.getMyRooms(),/목록/);
  }
});
test('only missing rematch functions are a rollout fallback and malformed or foreign room responses are rejected',async()=>{
  const round={parent_room_id:room.id,starter_id:room.guest_id,partner_id:uid,prompt:room.prompt,requested_by:null,next_room_id:null,next_code:null,next_status:null};
  for(const response of [{data:round,error:null},{error:{code:'PGRST202'}}]) {
    const api=load('app/lib/rooms/rematch.ts',{'../supabase/client':{createClient:()=>({rpc:async()=>response})}});
    const value=await api.getRematch(room.id); assert.equal(value?.parent_room_id??null,response.data?room.id:null);
  }
  for(const response of [{error:{code:'42501'}},{data:{...round,parent_room_id:'different'}},{data:{...round,next_code:'ABC123DEF4'}}]) {
    const api=load('app/lib/rooms/rematch.ts',{'../supabase/client':{createClient:()=>({rpc:async()=>response})}});
    await assert.rejects(api.getRematch(room.id),/다음 판/);
  }
});
