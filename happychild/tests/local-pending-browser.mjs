import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/kurob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8765/');
  const result=await page.evaluate(async()=>{
    const queue=await import('/happychild/js/local-pending.js'),uid=`test-${crypto.randomUUID()}`;
    const first=await queue.queueTuitionMonth({uid,accountId:'a',month:'2026-10',baseRevision:2,values:{unitFee:'250000',note:'đầu'}});
    const second=await queue.queueTuitionMonth({uid,accountId:'a',month:'2026-10',baseRevision:9,values:{unitFee:'300000',note:'sau'}});
    const draft=await queue.queueFormDraft({uid,title:'Học sinh',fields:[['fullName','Bé An']]});
    const rows=await queue.listPending(uid),other=await queue.listPending('another-user');
    await queue.removePending(second.id);await queue.removePending(draft.id);
    return {sameId:first.id===second.id,base:rows.find(item=>item.kind==='tuition-month')?.baseRevision,fee:rows.find(item=>item.kind==='tuition-month')?.values.unitFee,count:rows.length,other:other.length,remaining:(await queue.listPending(uid)).length,quota:queue.isQuotaExceeded({code:'resource-exhausted'})};
  });
  assert.deepEqual(result,{sameId:true,base:2,fee:'300000',count:2,other:0,remaining:0,quota:true});
  console.log('IndexedDB pending queue: durable read/write, same-month revision, user isolation and removal passed.');
}finally{await browser.close();}
