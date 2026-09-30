import assert from 'node:assert/strict';
import {teacherWorkloads,freeTeacherChoices,workloadLabel} from '../js/teacher-workload.js';

const teachers=[{id:'a',fullName:'Cô A',active:true},{id:'b',fullName:'Cô B',active:true},{id:'c',fullName:'Cô C',active:false}];
const rows=[
  {teacherId:'a',dateKey:'2026-10-01',dayOfWeek:3,startTime:'16:00',endTime:'17:00',status:'scheduled',active:true},
  {teacherId:'a',dateKey:'2026-10-02',dayOfWeek:4,startTime:'16:00',endTime:'17:00',status:'scheduled',active:true},
  {teacherId:'b',dateKey:'2026-10-01',dayOfWeek:3,startTime:'16:00',endTime:'17:00',status:'absent',active:true},
];
const totals=teacherWorkloads(teachers,rows);
assert.equal(totals.get('a'),120);
assert.equal(totals.get('b'),0);
const slot={dateKey:'2026-10-01',dayOfWeek:3,startTime:'16:00',endTime:'17:00'};
const choices=freeTeacherChoices(teachers,rows,slot);
assert.deepEqual(choices.map(item=>[item.teacher.id,item.busy]),[['b',false],['a',true]]);
assert.equal(workloadLabel(90),'1.5 giờ');
const templates=freeTeacherChoices(teachers,rows,slot,{templates:true});
assert.equal(templates.find(item=>item.teacher.id==='b').busy,true);
console.log('Teacher workload: weekly hours, absent sessions, free-slot ranking, template conflicts passed.');
