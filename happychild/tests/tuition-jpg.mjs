import assert from 'node:assert/strict';
import {tuitionJpgData,drawTuitionJpg} from '../js/tuition-jpg.js';
// Existing data-mapping regression coverage.
{
const data=tuitionJpgData({name:'GIA HUY - BẮP',month:'2026-10',stats:{previousRegistered:24,balance:4,madeUp:1,madeUpDates:['2026-09-10'],absent:4,absentDates:['2026-09-02','2026-09-09'],actual:20,registered:14},config:{unitFee:280000,adjustment:0,note:'Ghi chú thử nghiệm'}});
assert.equal(data.previousMonth,'09/2026');assert.equal(data.registered,14);assert.equal(data.monthly,3920000);assert.equal(data.total,3920000);assert.equal(data.note,'Ghi chú thử nghiệm');assert.equal(data.absent,4);assert.equal(data.actual,20);
assert.deepEqual(data.madeUpDates,['2026-09-10']);assert.deepEqual(data.absentDates,['2026-09-02','2026-09-09']);
assert.equal(tuitionJpgData({name:'Bé',month:'2026-10',stats:{registered:2},config:{}}).total,null);
const imported=tuitionJpgData({name:'Bé An',month:'2026-09',source:{values:['Bé An',18,4,2,3,11,'Ghi chú cũ','Hoàn lại 1 buổi',null,4640000],fees:[null,16,null,null,null,null,290000,4640000,null]}});
assert.equal(imported.total,4640000);assert.equal(imported.previousRegistered,18);assert.match(imported.note,/Hoàn lại 1 buổi/);
}
const data=tuitionJpgData({name:'BÉ TEST',month:'2026-11',stats:{registered:12,previousRegistered:10,absent:2,absentDates:['2026-10-03','2026-10-05'],madeUp:1,madeUpDates:['2026-10-06'],actual:9,balance:3},config:{note:'Ghi chú học phí đầy đủ',unitFee:250000,adjustment:100000}});
function render(data){
  const texts=[],rects=[];
  const ctx={canvas:{},measureText:text=>({width:String(text).length*9}),setTransform(){},fillRect(){},strokeRect(x,y,w,h){rects.push({x,y,w,h})},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(text,x,y){texts.push({text,x,y})}};
  const height=drawTuitionJpg(ctx,data);return {ctx,texts,rects,height};
}
const result=render(data),all=result.texts.map(t=>t.text).join(' ');
for(const text of ['Ghi chú học phí','đầy đủ','03/10','05/10','06/10','Trừ vào học phí tháng','2.900.000','250.000','100.000','12 buổi'])assert(all.includes(text),text);
assert.equal(data.total,2900000);
const long=render({...data,note:'Nội dung ghi chú dài '.repeat(100)});
assert(long.height>result.height);
assert(long.texts.every(t=>t.y>=0&&t.y<long.height),'All text stays within canvas');
assert.equal(tuitionJpgData({month:'2026-11',stats:{registered:1},config:{note:''},source:{values:[,,,,,,'old note']}}).note,'','Explicitly cleared notes stay empty');
assert.equal(tuitionJpgData({month:'2026-11',source:{values:['TEST',1,2,3,4,5,'Excel note'],fees:[]}}).note,'Excel note');
console.log('PASS notes, long row sizing, dates, fee values, cleared notes, imported notes (no image generated)');
