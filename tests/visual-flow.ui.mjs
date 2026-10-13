import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out=process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/visual');
fs.mkdirSync(out,{recursive:true});
const roomId='33333333-3333-4333-8333-333333333333';
const hostId='11111111-1111-4111-8111-111111111111';
const guestId='22222222-2222-4222-8222-222222222222';
const expires=new Date(Date.now()+86400000).toISOString();
let room=null, writes=0;
function user(id){return {id,aud:'authenticated',role:'authenticated',email:'',app_metadata:{provider:'anonymous'},user_metadata:{},created_at:new Date().toISOString(),is_anonymous:true};}
async function mock(context,id){
 await context.route('**/*',async r=>{
  const url=new URL(r.request().url());
  if(url.origin===base)return r.continue();
  const path=url.pathname;
  const json=(body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/v1/signup')return json({access_token:[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),is_anonymous:true})).toString('base64url'),'fixture'].join('.'),refresh_token:'fixture-only-refresh',token_type:'bearer',expires_in:3600,user:user(id)});
  if(path==='/auth/v1/user')return json(user(id));
  if(path==='/rest/v1/rpc/create_room'){
   writes++;const body=r.request().postDataJSON();room={id:roomId,code:'ABC123DEF4',prompt:body.room_prompt,host_id:id,guest_id:null,status:'waiting',expires_at:expires,drawings:[{role:'left',strokes:body.initial_strokes,completed:true}]};
   return json([{room_id:roomId,room_code:room.code,prompt:room.prompt,room_status:'waiting',expires_at:expires}]);
  }
  if(path==='/rest/v1/rpc/join_room'){
   writes++;assert.equal(r.request().postDataJSON().room_code,'ABC123DEF4');room.guest_id=id;room.status='guest_joined';return json([{room_id:roomId,prompt:room.prompt,room_status:room.status,expires_at:expires}]);
  }
  if(path==='/rest/v1/rpc/get_left_preview')return json(room.drawings[0].strokes.map(s=>({...s,points:s.points.filter(p=>p.x>=376&&p.x<=400)})).filter(s=>s.points.length));
  if(path==='/rest/v1/rooms'){
   if(url.searchParams.has('id'))return json(room);
   const all=url.searchParams.get('or');const hostFilter=url.searchParams.get('host_id');const guestFilter=url.searchParams.get('guest_id');
   assert.ok(all===`(host_id.eq.${id},guest_id.eq.${id})` || hostFilter===`eq.${id}` || guestFilter===`eq.${id}`,'explicit participant filtering required');
   const visible=room && (all ? room.host_id===id || room.guest_id===id : hostFilter ? room.host_id===id : room.guest_id===id);
   return r.fulfill({status:200,contentType:'application/json',headers:{'content-range':visible?'0-0/1':'*/0','access-control-expose-headers':'content-range'},body:JSON.stringify(visible?[{id:room.id,code:room.code,prompt:room.prompt,status:room.status,created_at:new Date().toISOString(),expires_at:expires,host_id:room.host_id,guest_id:room.guest_id}]:[])});
  }
  if(path==='/rest/v1/drawings'&&r.request().method()==='POST'){
   writes++;const b=r.request().postDataJSON();room.drawings.push({role:'right',strokes:b.strokes,completed:true});room.status='completed';return json([],201);
  }
  console.log('Blocked fixture route:',path);return json({message:'Blocked unexpected external request'},503);
 });
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox']});
 const results=[];
 for(const [name,width,height] of [['mobile',390,844],['narrow',320,740],['desktop',1440,1000]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:name!=='desktop',hasTouch:name!=='desktop'});await mock(c,hostId);
  const p=await c.newPage();
  for(const variant of ['a','b']){
   await p.goto(`${base}/?variant=${variant}`);await p.getByText('아직 함께 그린 그림이 없어요.').waitFor({timeout:8000}).catch(async e=>{console.log('FAIL',name,variant,(await p.locator('body').innerText()).slice(0,1800));throw e;});
   assert.equal(await p.locator('[data-design-variant]').getAttribute('data-design-variant'),variant);
   await p.locator('img').evaluate(img=>img.decode());
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await p.screenshot({path:`${out}/home-${variant}-${name}.png`,fullPage:true});
   const cta=p.getByRole('link',{name:'새 그림 시작하기',exact:false}).first();
   const ctaBox=await cta.boundingBox();
   if(name!=='desktop')assert.ok(ctaBox.y+ctaBox.height<=height,`${name} ${variant}: primary action must fit the first screen`);
   const contrastFailures=await p.evaluate(()=>{
    const surface=document.createElement('canvas');surface.width=surface.height=1;const ctx=surface.getContext('2d');
    const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data);};
    const luminance=channels=>channels.slice(0,3).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((total,c,i)=>total+c*[.2126,.7152,.0722][i],0);
    return Array.from(document.querySelectorAll('main h1, main p, main summary, a.button-primary, a.button-secondary')).filter(el=>el.getClientRects().length).flatMap(el=>{
     const style=getComputedStyle(el);let bg=[255,255,255,255];let ancestor=el;
     while(ancestor){const color=rgb(getComputedStyle(ancestor).backgroundColor);if(color[3]===255){bg=color;break;}ancestor=ancestor.parentElement;}
     const a=luminance(rgb(style.color)),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
     const threshold=parseFloat(style.fontSize)>=24?3:4.5;
     return ratio>=threshold?[]:[{text:el.textContent.trim(),ratio,threshold}];
    });
   });
   assert.deepEqual(contrastFailures,[]);

   if(name==='desktop'){
    const normal=await cta.evaluate(el=>getComputedStyle(el).backgroundColor);await cta.hover();await p.waitForTimeout(200);
    assert.notEqual(await cta.evaluate(el=>getComputedStyle(el).backgroundColor),normal);
    await p.screenshot({path:`${out}/home-${variant}-hover.png`,fullPage:true});
   }
   await p.getByRole('link',{name:'참여 코드 입력하기'}).click();await p.getByLabel('참여 코드',{exact:true}).fill('bad');await p.getByRole('button',{name:'이어 그리러 가기 →'}).click();await p.getByRole('alert').filter({hasText:'10자리'}).waitFor();
  }
  results.push(`${name}: A/B images, no horizontal overflow, first-screen mobile CTA, text contrast, join invalid-code validation; desktop hover PASS`);await c.close();
 }
 const host=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mock(host,hostId);const h=await host.newPage();await h.goto(base);await h.getByRole('link',{name:'새 그림 시작하기',exact:false}).first().click();
 const canvas=h.getByLabel('왼쪽 반쪽 그림 그리기');await canvas.scrollIntoViewIfNeeded();await h.waitForFunction(()=>!document.querySelector('input#room-prompt').disabled);
 await h.getByText('굵기 · 더 많은 도구').click();
 const slider=h.locator('input[type=range]');await slider.focus();await slider.press('Home');await slider.press('ArrowRight');
 assert.equal(await slider.inputValue(),'2');
 await h.getByRole('button',{name:'지우개',exact:true}).click();assert.equal(await slider.inputValue(),'16');await slider.focus();await slider.press('End');
 await h.getByRole('button',{name:'펜',exact:true}).click();assert.equal(await slider.inputValue(),'2');
 await h.getByRole('button',{name:'지우개',exact:true}).click();assert.equal(await slider.inputValue(),'30');await h.getByRole('button',{name:'펜',exact:true}).click();
 await h.getByText('굵기 · 더 많은 도구').click();
 await h.getByRole('button',{name:'색상 팔레트',exact:true}).click();await h.getByRole('button',{name:'지우개',exact:true}).click();assert.equal(await h.getByRole('button',{name:'색상 팔레트',exact:true}).getAttribute('aria-expanded'),'false');await h.getByRole('button',{name:'펜',exact:true}).click();
 await h.getByRole('button',{name:'색상 팔레트',exact:true}).click();await h.screenshot({path:`${out}/palette-mobile.png`,fullPage:true});await h.getByLabel('직접 고르기').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'#2563eb');el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await h.getByRole('button',{name:'색상 팔레트',exact:true}).getAttribute('aria-expanded'),'true');
 assert.equal(await h.getByRole('button',{name:'색상 팔레트',exact:true}).locator('span').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(37, 99, 235)');
 await h.getByRole('button',{name:'빨강 선택',exact:true}).click();
 assert.equal(await h.getByRole('button',{name:'색상 팔레트',exact:true}).getAttribute('aria-expanded'),'false');
 await canvas.scrollIntoViewIfNeeded();
 const box=await canvas.boundingBox();await h.mouse.move(box.x+box.width*.25,box.y+box.height*.5);await h.mouse.down();await h.mouse.move(box.x+box.width*.5,box.y+box.height*.5,{steps:8});await h.mouse.up();
 await h.getByLabel('그림 주제',{exact:true}).fill('친구와 떠나는 우주 여행');
 await h.screenshot({path:`${out}/draw-mobile.png`,fullPage:true});
 await h.getByRole('button',{name:'내 반쪽 크게 그리기',exact:true}).click();
 const active=h.locator('.drawing-frame');const expanded=await active.boundingBox();assert.ok(expanded.height>box.height*1.8);
 assert.equal(await h.getByRole('button',{name:'캔버스 왼쪽으로 이동'}).count(),0);
 await h.screenshot({path:`${out}/focus-left-mobile.png`});assert.ok((await h.getByRole('button',{name:'그리기 화면으로 돌아가기'}).boundingBox()).y>=0);await h.setViewportSize({width:844,height:390});const landscape=await active.boundingBox();assert.ok(landscape.y>=0&&landscape.y+landscape.height<=391);await h.screenshot({path:`${out}/focus-left-landscape.png`});const toolsBox=await h.locator('.drawing-tools').boundingBox();assert.ok(landscape.x-(toolsBox.x+toolsBox.width)<=32,'landscape tools stay near canvas');await h.setViewportSize({width:390,height:844});
 await h.getByRole('button',{name:'다 그렸어요',exact:true}).click();await h.getByRole('status').filter({hasText:'아직 친구에게 전송되지 않았어요'}).waitFor();assert.equal(writes,0);
 h.once('dialog',d=>d.dismiss());await h.getByRole('button',{name:'반쪽 그림 등록',exact:true}).click();assert.equal(writes,0);
 h.once('dialog',d=>d.accept());await h.getByRole('button',{name:'반쪽 그림 등록',exact:true}).click();await h.getByRole('heading',{name:'이제 친구의 차례예요.'}).waitFor();
 await h.screenshot({path:`${out}/waiting-mobile.png`,fullPage:true});
 await h.evaluate(()=>{window.sharedInvites=[];Object.defineProperty(navigator,'share',{configurable:true,value:async data=>window.sharedInvites.push(data)});});
 await h.getByRole('button',{name:'친구에게 초대 링크 공유'}).click();const invite=await h.evaluate(()=>window.sharedInvites[0].url);assert.equal(new URL(invite).searchParams.get('code'),'ABC123DEF4');
 const guest=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mock(guest,guestId);const g=await guest.newPage();await g.goto(invite);await g.waitForFunction(()=>document.querySelector('#room-code').value==='ABC123DEF4');await g.screenshot({path:`${out}/join-mobile.png`,fullPage:true});await g.getByRole('button',{name:'이어 그리러 가기 →'}).click();await g.getByRole('heading',{name:'이어 그리기',exact:true}).waitFor();await h.getByRole('button',{name:'완성 여부 확인',exact:true}).click();await h.getByText('친구가 참여했어요. 완성하면 여기서 확인할 수 있어요.').waitFor();await h.screenshot({path:`${out}/waiting-guest-joined.png`,fullPage:true});
 await g.getByRole('button',{name:'내 반쪽 크게 그리기',exact:true}).click();await g.screenshot({path:`${out}/focus-right-mobile.png`});assert.ok((await g.getByRole('button',{name:'그리기 화면으로 돌아가기'}).boundingBox()).y>=0);
 const frame=await g.locator('.drawing-frame').boundingBox();assert.ok(frame.height>400);
 await g.mouse.move(frame.x+frame.width*(26/424),frame.y+frame.height*.5);await g.mouse.down();await g.mouse.move(frame.x+frame.width*.8,frame.y+frame.height*.4,{steps:8});await g.mouse.up();
 await g.getByRole('button',{name:'다 그렸어요',exact:true}).click();await g.getByRole('status').filter({hasText:'아직 제출되지 않았어요'}).waitFor();assert.equal(room.status,'guest_joined');
 g.once('dialog',d=>d.dismiss());await g.getByRole('button',{name:'이어 그리기 완료',exact:true}).click();assert.equal(room.status,'guest_joined');
 g.once('dialog',d=>d.accept());await g.getByRole('button',{name:'이어 그리기 완료',exact:true}).click();await g.getByRole('heading',{name:'이런 그림이 될 줄 알았나요?'}).waitFor();
 await g.screenshot({path:`${out}/result-mobile.png`,fullPage:true});
 await h.getByRole('button',{name:'완성 여부 확인',exact:true}).click();await h.getByRole('heading',{name:'이런 그림이 될 줄 알았나요?'}).waitFor();
 const download=g.waitForEvent('download');await g.getByRole('button',{name:'완성 그림 PNG 저장',exact:true}).click();assert.equal((await download).suggestedFilename(),'half-drawing.png');
 assert.ok(room.drawings[1].strokes.every(s=>s.points.every(p=>p.x>=400&&p.x<=800)));
 await g.getByRole('link',{name:'홈으로',exact:true}).click();
 await g.getByRole('link',{name:'완성 그림 보기 →',exact:true}).waitFor();
 assert.ok((await g.getByRole('heading',{name:'내 그림',exact:true}).boundingBox()).y<200,'returning history is shown first');
 await g.screenshot({path:`${out}/returning-guest-mobile.png`,fullPage:true});await g.setViewportSize({width:320,height:740});assert.equal(await g.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await g.screenshot({path:`${out}/returning-guest-narrow.png`,fullPage:true});await g.setViewportSize({width:390,height:844});
 await g.getByRole('button',{name:'내가 시작한 그림',exact:true}).click();await g.getByText('아직 시작한 그림이 없어요.').waitFor();
 await g.getByRole('button',{name:'내가 참여한 그림',exact:true}).click();await g.getByRole('link',{name:'완성 그림 보기 →',exact:true}).waitFor();
 await g.getByRole('link',{name:'완성 그림 보기 →',exact:true}).click();await g.getByRole('heading',{name:'이런 그림이 될 줄 알았나요?'}).waitFor();
 assert.equal(room.drawings[0].strokes[0].lineWidth,2);assert.equal(room.drawings[0].strokes[0].color,'#dc2626');
 results.push('Independent pen/eraser widths, palette selection, focused finish without premature submit, nearby landscape tools, guest history filters and completed-room return PASS');
 results.push('Host draw -> confirmation cancel/accept -> waiting -> share invitation -> guest autofill -> join -> focused right drawing -> cancel/accept completion -> both results -> PNG download PASS (mock backend only)');
 fs.writeFileSync(`${out}/flow-results.txt`,results.join('\n')+'\n');console.log(results.join('\n'));
 fs.writeFileSync(`${out}/fixture-room.json`,JSON.stringify(room,null,2));
 await host.close();await guest.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
