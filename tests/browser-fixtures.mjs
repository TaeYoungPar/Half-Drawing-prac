import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
export const roomId='33333333-3333-4333-8333-333333333333';
export const hostId='11111111-1111-4111-8111-111111111111';
export const guestId='22222222-2222-4222-8222-222222222222';
const expires=new Date(Date.now()+86400000).toISOString();
export const fixture={room:null,writes:0};
function user(id){return {id,aud:'authenticated',role:'authenticated',email:'',app_metadata:{provider:'anonymous'},user_metadata:{},created_at:new Date().toISOString(),is_anonymous:true};}
export async function mock(context,id){
 await context.route('**/*',async r=>{
  const url=new URL(r.request().url());
  if(url.origin===base)return r.continue();
  const path=url.pathname;
  const json=(body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/v1/signup')return json({access_token:[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),is_anonymous:true})).toString('base64url'),'fixture'].join('.'),refresh_token:'fixture-only-refresh',token_type:'bearer',expires_in:3600,user:user(id)});
  if(path==='/auth/v1/user')return json(user(id));
  if(path==='/rest/v1/rpc/create_room'){
   fixture.writes++;const body=r.request().postDataJSON();fixture.room={id:roomId,code:'ABC123DEF4',prompt:body.room_prompt,host_id:id,guest_id:null,status:'waiting',expires_at:expires,drawings:[{role:'left',strokes:body.initial_strokes,completed:true}]};
   return json([{room_id:roomId,room_code:fixture.room.code,prompt:fixture.room.prompt,room_status:'waiting',expires_at:expires}]);
  }
  if(path==='/rest/v1/rpc/join_room'){
   fixture.writes++;assert.equal(r.request().postDataJSON().room_code,'ABC123DEF4');fixture.room.guest_id=id;fixture.room.status='guest_joined';return json([{room_id:roomId,prompt:fixture.room.prompt,room_status:fixture.room.status,expires_at:expires}]);
  }
  if(path==='/rest/v1/rpc/get_left_preview')return json(fixture.room.drawings[0].strokes.map(s=>({...s,points:s.points.filter(p=>p.x>=376&&p.x<=400)})).filter(s=>s.points.length));
  if(path==='/rest/v1/rooms'){
   if(url.searchParams.has('id'))return json(fixture.room);
   const all=url.searchParams.get('or');const hostFilter=url.searchParams.get('host_id');const guestFilter=url.searchParams.get('guest_id');
   assert.ok(all===`(host_id.eq.${id},guest_id.eq.${id})` || hostFilter===`eq.${id}` || guestFilter===`eq.${id}`,'explicit participant filtering required');
   const visible=fixture.room && (all ? fixture.room.host_id===id || fixture.room.guest_id===id : hostFilter ? fixture.room.host_id===id : fixture.room.guest_id===id);
   return r.fulfill({status:200,contentType:'application/json',headers:{'content-range':visible?'0-0/1':'*/0','access-control-expose-headers':'content-range'},body:JSON.stringify(visible?[{id:fixture.room.id,code:fixture.room.code,prompt:fixture.room.prompt,status:fixture.room.status,created_at:new Date().toISOString(),expires_at:expires,host_id:fixture.room.host_id,guest_id:fixture.room.guest_id}]:[])});
  }
  if(path==='/rest/v1/drawings'&&r.request().method()==='POST'){
   fixture.writes++;const b=r.request().postDataJSON();fixture.room.drawings.push({role:'right',strokes:b.strokes,completed:true});fixture.room.status='completed';return json([],201);
  }
  console.log('Blocked fixture route:',path);return json({message:'Blocked unexpected external request'},503);
 });
}
