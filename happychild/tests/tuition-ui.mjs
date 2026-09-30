import {chromium} from 'file:///C:/Users/kurob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'file:///C:/Users/kurob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/jszip/lib/index.js';
const repo=path.resolve(import.meta.dirname,'../..');
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local'),target=path.resolve(repo,'.'+decodeURIComponent(url.pathname));if(!target.startsWith(repo+path.sep))throw Error();const file=target.endsWith('happychild')?path.join(target,'index.html'):target;const b=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
const page=await browser.newPage({viewport:{width:1440,height:980}}),errors=[];
page.on('pageerror',err=>errors.push(err.message));
await page.clock.install({time:new Date('2026-09-30T05:00:00Z')});
await page.addInitScript(()=>{
 localStorage.setItem('happychild:theme','light');
 window.fixtures={students:[{id:'s',fullName:'Bé An',active:true,makeupBalance:3},{id:'b',fullName:'Bé Bình',active:true,makeupBalance:0}],teachers:[],weeks:[{id:'w',startDate:'2026-09-28',endDate:'2026-10-04'}],scheduleTemplates:[0,2,4].map(dayOfWeek=>({studentId:'s',dayOfWeek,startTime:'19:00',endTime:'20:00',active:true})),holidays:[]};
 window.fixtureSource={month:'2026-08',sourceRow:1,labels:['Tên trẻ','Buổi học','Vắng','Đã bù','Không bù','Tổng buổi','Ghi chú','Hoàn lại',null,'Tổng học phí'],values:['BÉ AN',13,4,1,0,10,null,null,null,3600000],feeLabels:[null,'Số buổi đăng ký T08/2026',null,null,null,null,'HP 1 buổi','Học phí tháng','Ghi chú',null],fees:[null,12,null,null,null,null,300000,3600000,null,null]};
 window.feeAccounts=[{id:'fee-an',displayName:'AN',studentId:'s',history:[window.fixtureSource],months:{'2026-09':{unitFee:300000,adjustment:0,note:''},'2026-10':{unitFee:300000,adjustment:0,note:''}}},{id:'fee-new',displayName:'Bé chưa liên kết',studentId:'',history:[],months:{'2026-10':{unitFee:null}}}];
 window.feeSessions=[{id:'s1',studentId:'s',dateKey:'2026-09-28',startTime:'19:00',endTime:'20:00',status:'attended',type:'regular'}];
 window.fixtures.scheduleTemplates.push({studentId:'b',dayOfWeek:0,startTime:'08:00',endTime:'09:00',active:true});
 window.feeAccounts.push({id:'fee-b',displayName:'BÌNH',studentId:'b',history:[],months:{'2026-09':{unitFee:250000,adjustment:0,note:''}}});
});
const app=await fs.readFile(path.join(repo,'happychild/js/app.js'),'utf8');
const exports=app.match(/import \{([^}]+)\} from "\.\/store\.js/)[1].split(',');
const mocks={
 subscribe:'(name,cb)=>{setTimeout(()=>cb(window.fixtures[name]||[]),0);return()=>{}}',
 subscribeSessions:'(id,cb)=>{setTimeout(()=>cb(window.feeSessions),0);return()=>{}}',
 subscribeNotes:'cb=>{setTimeout(()=>cb([]),0);return()=>{}}',
 subscribeStudentForms:'cb=>{setTimeout(()=>cb([]),0);return()=>{}}',
 subscribeRecentAudit:'cb=>()=>{}',subscribeTransactions:'cb=>()=>{}',MAX_SIMULTANEOUS_STUDENTS:'7',
 getMaxSimultaneousStudents:'()=>7',teacherCanTeachAt:'()=>true',
};
await page.route('**/happychild/js/auth.js*',r=>r.fulfill({contentType:'text/javascript',body:'export const login=async()=>{};export const logout=async()=>{};export const authErrorMessage=e=>e.message;export const watchAuth=cb=>{setTimeout(()=>cb({uid:"test"},{displayName:"Kiểm thử",role:"admin"}),0);};'}));
await page.route('**/happychild/js/store.js*',r=>r.fulfill({contentType:'text/javascript',body:exports.map(name=>`export const ${name}=${mocks[name]||'async()=>({updated:0})'};`).join('\n')}));
await page.route('**/happychild/js/app.js*',r=>r.fulfill({contentType:'text/javascript',body:app.replace('runPostLoginMigrations(user);','').replace('function maybeShowDailyBrief(){','function maybeShowDailyBrief(){return;')}));
await page.route('**/happychild/js/tuition-store.js*',r=>r.fulfill({contentType:'text/javascript',body:`
 export const watchTuition=(cb)=>{window.notifyFees=()=>cb(window.feeAccounts,false);setTimeout(window.notifyFees,0);return()=>{}};
 export const watchTuitionWeek=(id,cb)=>{setTimeout(()=>cb(window.feeSessions,false),0);return()=>{}};
 export const linkTuition=async(a,id)=>{window.feeAccounts.find(x=>x.id===a.id).studentId=id;window.notifyFees();};
 export const saveTuitionMonth=async(a,m,v)=>{window.feeAccounts.find(x=>x.id===a.id).months[m]={...v,unitFee:v.unitFee===''?null:Number(v.unitFee),adjustment:Number(v.adjustment)};window.notifyFees();};
 export const createTuitionAccount=async()=>{};
 export const loadTuitionExport=async()=>({accounts:window.feeAccounts,students:window.fixtures.students,templates:window.fixtures.scheduleTemplates,weeks:window.fixtures.weeks,holidays:[],sessions:window.feeSessions});
 `}));
await page.goto(`http://127.0.0.1:${server.address().port}/happychild/index.html#tuition`);
await page.locator('[data-tuition-id="fee-an"]').waitFor();
assert.equal(await page.locator('[data-tuition-id]').count(),3);
assert.equal(await page.locator('[data-tuition-id]').first().getAttribute('data-tuition-id'),'fee-b','Morning student must precede alphabetically earlier evening student');
assert.equal(await page.locator('[data-tuition-id="fee-an"] .tuition-person-icon').innerText(),'2');
await page.locator('#tuitionExport').click();
const pendingDownload=page.waitForEvent('download');
await page.locator('#dialogSubmit').click();
const download=await pendingDownload;
assert.equal(download.suggestedFilename(),'Bao-hoc-phi-2026-10-kem-lich-su.xlsx');
await fs.mkdir('D:/2DUnityGame/.codex/tuition-export-qa',{recursive:true});
await download.saveAs('D:/2DUnityGame/.codex/tuition-export-qa/browser-export.xlsx');
const zip=await JSZip.loadAsync(await fs.readFile(await download.path()));
const exportedCurrent=await zip.file('xl/worksheets/sheet1.xml').async('string'),exportedForecast=await zip.file('xl/worksheets/sheet2.xml').async('string');
assert.match(exportedCurrent,/Bé Bình/);
assert.match(exportedForecast,/Bé An/);
assert.match(exportedCurrent,/Thời gian: tháng 10\/2026/);
assert.match(exportedForecast,/Thời gian: tháng 08\/2026/);
assert.match(exportedCurrent,/ISNUMBER\(B8\)/);
await page.waitForFunction(()=>!document.querySelector('#formDialog').open);
await page.locator('#tuitionSearch').fill('be an');assert.equal(await page.locator('[data-tuition-id]').count(),1);
await page.locator('[data-tuition-id="fee-an"]').click();
assert.equal(await page.locator('.tuition-month').first().getAttribute('data-month'),'2026-10');
assert.equal(await page.locator('[data-month="2026-10"]').getAttribute('open'),'');
await page.locator('[data-month="2026-09"]>summary').click();
await page.locator('[data-month="2026-09"] .tuition-sheet').waitFor();
assert.equal(await page.locator('[data-month="2026-09"] .tuition-sheet thead th').nth(1).innerText(),'Số buổi đăng ký T8');
assert.equal(await page.locator('[data-month="2026-09"] .tuition-sheet tbody tr').first().locator('td').first().innerText(),'12');
assert.equal(await page.locator('[data-month="2026-09"] .tuition-sheet tbody tr').first().locator('td').nth(1).innerText(),'3');
assert.equal(await page.locator('[data-month="2026-10"]').evaluate(el=>el.classList.contains('tuition-forecast')),true);
assert.equal(await page.locator('[data-month="2026-10"] .tuition-sheet thead th').nth(1).innerText(),'Số buổi đăng ký T9');
assert.match(await page.locator('[data-month="2026-10"] .tuition-sheet thead th').nth(3).innerText(),/09\/2026/);
assert.equal(await page.locator('[data-month="2026-10"] .tuition-sheet tbody tr').first().locator('td').nth(4).innerText(),'1','October bill shows September attendance');
assert.equal(await page.locator('[data-month="2026-10"] .tuition-sheet tbody tr').first().locator('td').first().innerText(),'12');
assert.match(await page.locator('[data-month="2026-10"] .tuition-sheet').innerText(),/12 buổi/);
await page.locator('[data-edit-fee="2026-10"]').click();
await page.locator('[name="unitFee"]').fill('310000');await page.locator('[name="adjustment"]').fill('100000');await page.locator('[name="note"]').fill('Giảm trừ thử nghiệm');await page.locator('#dialogSubmit').click();
await page.waitForFunction(()=>!document.querySelector('#formDialog').open);
assert.match(await page.locator('[data-month="2026-10"] .tuition-total').innerText(),/3.620.000/);
await fs.mkdir('D:/2DUnityGame/.codex/tuition-qa',{recursive:true});
await page.screenshot({path:'D:/2DUnityGame/.codex/tuition-qa/desktop.png',fullPage:true});
await page.locator('#themeToggleBtn').click();
await page.screenshot({path:'D:/2DUnityGame/.codex/tuition-qa/dark.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile page must not overflow');
await page.screenshot({path:'D:/2DUnityGame/.codex/tuition-qa/mobile.png',fullPage:true});
await page.locator('#tuitionBack').click();await page.locator('#tuitionSearch').fill('');await page.locator('[data-tuition-id="fee-new"]').click();
assert.match(await page.locator('.tuition-view').innerText(),/Cần tạo thêm học sinh này/);
await page.locator('#tuitionLink').click();
assert.equal(await page.locator('#tuitionLinkSelect option[value="b"]').count(),0,'Already linked student is not available again');
await page.locator('#dialogCancel').click();
await page.evaluate(()=>location.hash='templates');
await page.locator('#templateVacancyBtn').click();
assert.equal(await page.locator('.template-vacancy-overview>details').count(),7);
assert.equal(await page.locator('.template-vacancy-overview>details[open]').count(),0);
await page.locator('.template-vacancy-overview>details>summary').first().click();
assert.match(await page.locator('.template-vacancy-card').first().innerText(),/1\/7 phòng/);
assert.equal(await page.locator('#dialogSubmit').isVisible(),false);
assert.equal(await page.locator('#formDialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'Template overview must fit mobile dialog');
await page.screenshot({path:'D:/2DUnityGame/.codex/tuition-qa/template-vacancy-mobile.png',fullPage:true});
await page.locator('#dialogCancel').click();
assert.deepEqual(errors,[]);
console.log('Tuition UI: roster, search, month order, calculations, editing, linking, light/dark, 390px mobile passed.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
