import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';
import { social } from './social-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/social');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const visibleLoader = page => page.locator('[data-loading-state="section"]:visible');
const originalCard = page => page.locator('article').filter({ has: page.getByRole('heading', { name: '울보 양파', exact: true }) });
const badge = page => page.getByText('💬 친구의 새 한마디', { exact: true });
async function until(predicate, message) {
  for (let i=0;i<100;i++) { if(predicate())return; await delay(50); }
  assert.fail(message);
}
async function ink(page, side) {
  await page.getByRole('button',{name:'펜',exact:true}).click();
  const canvas=page.getByLabel(side==='left'?'왼쪽 반쪽 그림 그리기':'오른쪽 반쪽 그림 그리기',{exact:true});
  await canvas.scrollIntoViewIfNeeded(); const box=await canvas.boundingBox();
  await page.mouse.move(box.x+box.width*(side==='left'?.25:.55),box.y+box.height*.35); await page.mouse.down();
  await page.mouse.move(box.x+box.width*(side==='left'?.49:.8),box.y+box.height*.65,{steps:12}); await page.mouse.up();
  return canvas;
}
function seed() {
  social.enabled=true; social.rooms={}; social.states=[]; social.rematches={}; social.calls=[];
  fixture.writes=0; fixture.commentsUnavailable=false;
  const stroke=x=>({tool:'pen',color:'#493127',lineWidth:8,points:[{x,y:150},{x:x+30,y:300}]});
  for(let i=0;i<13;i++) {
    const id=i===0?roomId:`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`;
    social.rooms[id]={id,code:i===0?'ABC123DEF4':`B${String(i).padStart(9,'0')}`,prompt:i===0?'울보 양파':`연습 그림 ${i}`,host_id:hostId,guest_id:guestId,status:'completed',created_at:new Date(Date.now()-i*1000).toISOString(),expires_at:new Date(Date.now()+86400000).toISOString(),drawings:[{role:'left',strokes:[stroke(200)],completed:true},{role:'right',strokes:[stroke(550)],completed:true}]};
  }
  fixture.room=social.rooms[roomId];
  fixture.comments=[{room_id:roomId,author_id:guestId,body:'나는 양파였는데 너는 뭐였어? 😂',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}];
}
async function viewer(width,id) {
  const context=await browser.newContext({viewport:{width,height:width<640?844:1000},isMobile:width<640,hasTouch:width<640});
  await mock(context,id); const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  return{context,page,errors};
}
try {
  for(const width of (process.env.TEST_SOCIAL_WIDTH ? [Number(process.env.TEST_SOCIAL_WIDTH)] : [320,390,1440])) {
    seed(); const host=await viewer(width,hostId),guest=await viewer(width,guestId); const h=host.page,g=guest.page;
    // Today has a separate draft; choosing it never overwrites ordinary work.
    await h.goto(`${base}/draw`); await h.locator('#room-prompt').fill('내가 그리던 주제'); const normal=await ink(h,'left');
    const original=await normal.evaluate(c=>c.toDataURL());
    await h.goto(base); const today=h.getByRole('region',{name:'오늘의 엉뚱한 주제',exact:true});
    const day=await today.locator('time').getAttribute('datetime'); const topic=await today.locator('p').nth(1).innerText();
    await h.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
    await today.getByRole('link',{name:'오늘의 주제로 그리기 ↗',exact:true}).click();
    await h.waitForFunction(()=>document.querySelector('#room-prompt')?.value.length>0);
    assert.equal(await h.locator('#room-prompt').inputValue(),topic);
    await h.locator('#room-prompt').fill('오늘은 내 표정으로');
    await h.goto(`${base}/draw`); await h.waitForFunction(()=>document.querySelector('#room-prompt')?.value==='내가 그리던 주제');
    assert.equal(await h.getByLabel('왼쪽 반쪽 그림 그리기',{exact:true}).evaluate(c=>c.toDataURL()),original);
    await h.goto(`${base}/draw?daily=${day}`); await h.waitForFunction(()=>document.querySelector('#room-prompt')?.value==='오늘은 내 표정으로');

    await h.goto(`${base}/library`); await originalCard(h).waitFor(); await badge(h).waitFor();
    assert.equal(await h.locator('article').count(),6); await h.getByText('1 / 3',{exact:true}).waitFor();
    if(width === 390) {
      let failHide = true;
      await host.context.route('**/rest/v1/rpc/set_room_hidden',route => { if(failHide) { failHide=false; return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'temporary write failure'})}); } return route.fallback(); });
      await originalCard(h).getByRole('button',{name:'보관함에서 숨기기',exact:true}).click();
      await h.getByRole('alert').filter({hasText:'숨기지 못했어요'}).waitFor();
      assert.equal(await originalCard(h).count(),1,'failed hide preserves the visible drawing');
    }
    // A late pre-hide list response must not resurrect the hidden entry.
    let releaseOld; const barrier=new Promise(resolve=>{releaseOld=resolve;}); let entered; const started=new Promise(resolve=>{entered=resolve;}); let hold=true;
    await host.context.route('**/rest/v1/rpc/get_my_library',async route=>{
      const p=route.request().postDataJSON();
      if(hold&&p.p_page===0&&p.p_scope==='all'&&!p.p_hidden){
        hold=false;
        const rows=Object.values(social.rooms).slice(0,6).map(row=>({...row,drawings:undefined,has_unread_comment:row.id===roomId}));
        entered();await barrier;return route.fulfill({contentType:'application/json',body:JSON.stringify({rooms:rows,total:13})});
      }
      return route.fallback();
    });
    await h.evaluate(()=>window.dispatchEvent(new Event('focus'))); await started;
    await originalCard(h).getByRole('button',{name:'보관함에서 숨기기',exact:true}).click();
    await originalCard(h).waitFor({state:'hidden'}); releaseOld(); await h.waitForTimeout(100);
    assert.equal(await originalCard(h).count(),0); await h.getByText('1 / 2',{exact:true}).waitFor(); assert.equal(await h.locator('article').count(),6);
    await g.goto(`${base}/draw`); await g.waitForFunction(()=>!document.querySelector('#room-prompt')?.disabled); await g.goto(`${base}/library`); await originalCard(g).waitFor();
    assert.equal(social.rooms[roomId].drawings.length,2,'hiding never deletes either drawing');
    await h.getByRole('button',{name:'숨기기 취소',exact:true}).click(); await originalCard(h).waitFor(); await h.getByText('1 / 3',{exact:true}).waitFor();
    // Hidden view and restore, then last-page deletion refills a valid preceding page.
    await originalCard(h).getByRole('button',{name:'보관함에서 숨기기',exact:true}).click(); await originalCard(h).waitFor({state:'hidden'});
    await h.getByRole('button',{name:'숨긴 그림 보기',exact:true}).click(); await originalCard(h).waitFor();
    assert.equal(await h.locator('article').count(),1); await h.screenshot({path:`${out}/hidden-${width}.png`,fullPage:true});
    await originalCard(h).getByRole('button',{name:'보관함으로 복원',exact:true}).click(); await h.getByText('숨긴 그림이 없어요.',{exact:true}).waitFor();
    await h.getByRole('button',{name:'← 내 그림으로 돌아가기',exact:true}).click(); await originalCard(h).waitFor();
    await h.getByRole('button',{name:'다음',exact:true}).click(); await h.getByText('2 / 3',{exact:true}).waitFor(); await visibleLoader(h).waitFor({state:'hidden'});
    await h.getByRole('button',{name:'다음',exact:true}).click(); await h.getByText('3 / 3',{exact:true}).waitFor(); await visibleLoader(h).waitFor({state:'hidden'});
    assert.equal(await h.locator('article').count(),1);
    await h.locator('article').getByRole('button',{name:'보관함에서 숨기기',exact:true}).click(); await h.getByText('2 / 2',{exact:true}).waitFor(); await visibleLoader(h).waitFor({state:'hidden'}); assert.equal(await h.locator('article').count(),6);
    await h.getByRole('button',{name:'숨기기 취소',exact:true}).click(); await h.getByText('2 / 3',{exact:true}).waitFor();
    await h.getByRole('button',{name:'이전',exact:true}).click(); await originalCard(h).waitFor();
    assert.equal(await h.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await h.screenshot({path:`${out}/library-unread-${width}.png`,fullPage:true});
    // Opening the room alone does not mark an off-screen message as read.
    await originalCard(h).getByRole('link',{name:'완성 그림 보기 →',exact:true}).click(); await h.locator('#room-comment').waitFor(); await h.evaluate(()=>window.scrollTo(0,0));
    assert.equal(social.states.find(s=>s.room_id===roomId&&s.user_id===hostId)?.read_at??null,null);
    await h.getByLabel('친구의 한마디',{exact:true}).scrollIntoViewIfNeeded();
    await until(()=>Boolean(social.states.find(s=>s.room_id===roomId&&s.user_id===hostId)?.read_at),'visible message should be acknowledged');
    await h.getByRole('link',{name:'내 보관함으로',exact:true}).click(); await originalCard(h).waitFor(); assert.equal(await badge(h).count(),0);
    // A friend's edit reappears as new; their own entry never becomes their badge.
    await g.goto(`${base}/rooms/${roomId}`); await g.getByRole('button',{name:'수정',exact:true}).click(); await g.getByLabel('내 한마디 수정',{exact:true}).fill('편집했어! 다음 판도 할까?');
    await g.getByRole('button',{name:'수정 저장',exact:true}).click(); await g.getByText('편집했어! 다음 판도 할까?',{exact:true}).waitFor();
    await h.evaluate(()=>window.dispatchEvent(new Event('focus'))); await badge(h).waitFor();
    await originalCard(h).getByRole('link',{name:'완성 그림 보기 →',exact:true}).click();
    const rematch=h.getByRole('region',{name:'역할 바꿔 한 판 더',exact:true}); await rematch.getByRole('button',{name:'친구에게 한 판 더 신청',exact:true}).click();
    await rematch.getByRole('button',{name:'친구가 먼저 그릴 차례예요',exact:true}).waitFor();
    await g.evaluate(()=>window.dispatchEvent(new Event('focus')));
    const nextPanel=g.getByRole('region',{name:'역할 바꿔 한 판 더',exact:true}); await nextPanel.getByText('친구가 한 판 더 신청했어요!',{exact:false}).waitFor();
    await h.screenshot({path:`${out}/request-${width}.png`,fullPage:true});
    await rematch.screenshot({path:`${out}/request-panel-${width}.png`});
    await nextPanel.getByRole('button',{name:'역할 바꿔 먼저 그리기 →',exact:true}).click();
    await g.getByRole('heading',{name:'이번엔 내가 먼저!',exact:true}).waitFor(); await g.waitForFunction(()=>document.querySelector('#room-prompt')?.value==='울보 양파');
    await ink(g,'left'); g.once('dialog',dialog=>dialog.accept()); await g.getByRole('button',{name:'반쪽 그림 등록',exact:true}).click();
    await g.getByRole('heading',{name:'이제 친구의 차례예요.',exact:true}).waitFor();
    const nextId=new URL(g.url()).pathname.split('/').pop(); assert.notEqual(nextId,roomId);
    assert.equal(social.rooms[nextId].host_id,guestId); assert.equal(social.rooms[nextId].guest_id,null,'friend has not been joined silently');
    assert.equal(social.rooms[roomId].drawings.length,2);
    await h.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await rematch.getByRole('button',{name:'친구의 반쪽 이어 그리기 →',exact:true}).click();
    await h.getByRole('heading',{name:'이어 그리기',exact:true}).waitFor(); assert.equal(social.rooms[nextId].guest_id,hostId);
    await ink(h,'right'); h.once('dialog',dialog=>dialog.accept()); await h.getByRole('button',{name:'이어 그리기 완료',exact:true}).click();
    await h.getByRole('heading',{name:'이런 그림이 될 줄 알았나요?',exact:true}).waitFor();
    await g.getByRole('button',{name:'완성 여부 확인',exact:true}).click(); await g.getByRole('heading',{name:'이런 그림이 될 줄 알았나요?',exact:true}).waitFor();
    assert.equal(social.rooms[nextId].status,'completed'); assert.equal(social.rooms[nextId].drawings.length,2);
    await h.getByRole('region',{name:'역할 바꿔 한 판 더',exact:true}).getByRole('button',{name:'역할 바꿔 먼저 그리기 →',exact:true}).waitFor();
    await h.screenshot({path:`${out}/role-swapped-result-${width}.png`,fullPage:true});
    assert.deepEqual(host.errors,[]); assert.deepEqual(guest.errors,[]); await host.context.close(); await guest.context.close();
    console.log(`${width}px: daily draft isolation, hide/undo/restore/page refill, private friend state, offscreen unread/read/edit, two-player request -> role swap -> full result without resend PASS`);
  }
  // Leaving home open across Korean midnight updates both the subject and its link.
  social.enabled=false;const context=await browser.newContext();await mock(context,hostId);const page=await context.newPage();
  await page.clock.install({time:new Date('2026-11-04T14:59:00Z')});await page.goto(base);
  const today=page.getByRole('region',{name:'오늘의 엉뚱한 주제',exact:true});
  await page.waitForFunction(()=>document.querySelector('#daily-topic-heading')?.parentElement.querySelector('time').dateTime==='2026-11-04');
  const before=await today.locator('p').nth(1).innerText();await page.clock.fastForward(65000);
  await page.waitForFunction(()=>document.querySelector('#daily-topic-heading')?.parentElement.querySelector('time').dateTime==='2026-11-05');
  assert.notEqual(await today.locator('p').nth(1).innerText(),before);assert.equal(await today.getByRole('link').getAttribute('href'),'/draw?daily=2026-11-05');
  await context.close();console.log('Daily topic and action update at Korean midnight PASS');
} finally { await browser.close(); }
