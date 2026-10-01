import assert from 'node:assert/strict';
import {tuitionJpgData} from '../js/tuition-jpg.js';

const data=tuitionJpgData({
  name:'GIA HUY - BẮP',month:'2026-10',status:'Tháng hiện tại · tự cập nhật',
  stats:{previousRegistered:24,balance:4,madeUp:0,absent:4,actual:20,registered:14},
  config:{unitFee:280000,adjustment:0,note:'Ghi chú thử nghiệm'},
});
assert.equal(data.previousMonth,'09/2026');
assert.equal(data.registered,14);
assert.equal(data.monthly,3920000);
assert.equal(data.total,3920000);
assert.equal(data.note,'Ghi chú thử nghiệm');
assert.equal(data.absent,4);
assert.equal(data.actual,20);
assert.equal(tuitionJpgData({name:'Bé',month:'2026-10',stats:{registered:2},config:{}}).total,null);
const imported=tuitionJpgData({name:'Bé An',month:'2026-09',source:{values:['Bé An',18,4,2,3,11,'Ghi chú cũ','Hoàn lại 1 buổi',null,4640000],fees:[null,16,null,null,null,null,290000,4640000,null]}});
assert.equal(imported.total,4640000);
assert.equal(imported.previousRegistered,18);
assert.match(imported.note,/Hoàn lại 1 buổi/);
console.log('Tuition JPG data: passed');
