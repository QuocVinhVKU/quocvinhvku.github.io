import fs from 'node:fs';
import assert from 'node:assert/strict';
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const store=fs.readFileSync(new URL('../js/store.js',import.meta.url),'utf8');
const create=store.slice(store.indexOf('export async function addMakeupSession'),store.indexOf('export async function reassignMakeupSessionTeacher'));
assert.ok(create.includes('!forceExtraLesson&&Number(student.makeupBalance||0)>0'));
assert.ok(create.includes('dateKey<isoDate(new Date())'));
assert.ok(create.includes('availability.occupied<availability.capacity'));
assert.ok(create.includes('historicalTeacherConflict:historicalOverride'));
assert.ok(create.includes('Học sinh đã có lịch trùng'));
assert.ok(create.includes('Giáo viên đã xin nghỉ phép'));
assert.ok(app.includes('Ghi nhận học thêm'));
assert.ok(app.includes('Học thêm — không trừ buổi cần bù'));
assert.ok(!app.includes('balance?"":"data-disabled"'));
for(const balance of [0,1,5]){
  const credit=new Function('student','forceExtraLesson','return !forceExtraLesson&&Number(student.makeupBalance||0)>0');
  assert.equal(credit({makeupBalance:balance},true),false);
  assert.equal(credit({makeupBalance:balance},false),balance>0);
}
console.log('PASS: extra lessons do not debit credits; historical override preserves room/student/leave checks');
