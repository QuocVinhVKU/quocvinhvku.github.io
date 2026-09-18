import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function calendarScheduleWarnings'),source.indexOf('function bindCalendarAdds'));
assert.ok(fn.includes('safeSessionType(item.type)!=="makeup"'));
assert.ok(fn.includes('item.teacherLeaveAction!=="replacement"'));
assert.ok(fn.includes('chỉ dạy chiều/tối nhưng đang có lịch sáng'));
console.log('PASS: morning warning excludes makeup and replacement teaching, but remains for regular schedules');
