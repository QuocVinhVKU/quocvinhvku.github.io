import {T9_TEMPLATE_SOURCE} from "../happychild/js/t9-templates.js";
import {canonicalRosterKey} from "../happychild/js/roster-reconcile.js";

const token=process.env.HC_TOKEN;
if(!token)throw new Error("Missing Firebase token");
const root="https://firestore.googleapis.com/v1/projects/happychild-bff96/databases/(default)/documents";
const headers={Authorization:`Bearer ${token}`,"Content-Type":"application/json"};
const list=async name=>{const response=await fetch(`${root}/${name}?pageSize=500`,{headers});if(!response.ok)throw new Error(await response.text());return (await response.json()).documents||[]};
const value=field=>field?.stringValue||"";
const [studentDocs,formDocs]=await Promise.all([list("students"),list("studentForms")]);
const studentsByKey=new Map(studentDocs.map(item=>[canonicalRosterKey(value(item.fields.fullName)||value(item.fields.shortName)),item]));
const scores=new Map();
for(const item of T9_TEMPLATE_SOURCE){const studentDoc=studentsByKey.get(canonicalRosterKey(item.studentKey||item.studentName));if(!studentDoc)continue;const studentId=studentDoc.name.split("/").at(-1),key=`${studentId}|${item.teacherId}`,score=scores.get(key)||{studentId,teacherId:item.teacherId,count:0,firstDay:7,firstTime:"99:99"};score.count++;if(item.dayOfWeek<score.firstDay||(item.dayOfWeek===score.firstDay&&item.startTime<score.firstTime)){score.firstDay=item.dayOfWeek;score.firstTime=item.startTime}scores.set(key,score)}
const primary=new Map();for(const score of scores.values()){const old=primary.get(score.studentId);if(!old||score.count>old.count||(score.count===old.count&&(score.firstDay<old.firstDay||(score.firstDay===old.firstDay&&score.firstTime<old.firstTime))))primary.set(score.studentId,score)}
const fields=teacherId=>({primaryTeacherId:{stringValue:teacherId},responsibilitySource:{stringValue:"T9 (2).xlsx · màu ca học"}});
const writes=[];
for(const doc of studentDocs){const id=doc.name.split("/").at(-1),score=primary.get(id);if(!score)continue;writes.push({update:{name:doc.name,fields:fields(score.teacherId)},updateMask:{fieldPaths:["primaryTeacherId","responsibilitySource"]}})}
for(const doc of formDocs){const studentId=value(doc.fields.studentId),score=primary.get(studentId);if(!score)continue;writes.push({update:{name:doc.name,fields:{teacherId:{stringValue:score.teacherId},responsibilitySource:{stringValue:"T9 (2).xlsx · màu ca học"}}},updateMask:{fieldPaths:["teacherId","responsibilitySource"]}})}
const patchOne=async write=>{const relative=write.update.name.replace("projects/happychild-bff96/databases/(default)/documents/","");const masks=write.updateMask.fieldPaths.map(field=>`updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&"),response=await fetch(`${root}/${relative}?${masks}`,{method:"PATCH",headers,body:JSON.stringify({fields:write.update.fields})});if(!response.ok)throw new Error(await response.text())};
for(let index=0;index<writes.length;index+=10)await Promise.all(writes.slice(index,index+10).map(patchOne));
const teacherById={"teacher-sheet5-tien":"Cô Tiên","teacher-sheet5-han":"Cô Hân","teacher-sheet5-quynh":"Cô Quỳnh","teacher-sheet5-duong":"Cô Dương","teacher-sheet5-thuy":"Cô Thùy","teacher-sheet5-ngoc":"Cô Ngọc","teacher-sheet5-ngan":"Cô Ngân","teacher-sheet5-mai":"Cô Mai","teacher-sheet5-diem":"Cô Điểm"};
const summary=[...primary.values()].reduce((map,item)=>map.set(item.teacherId,(map.get(item.teacherId)||0)+1),new Map());
console.log(JSON.stringify({studentsUpdated:primary.size,formsUpdated:formDocs.filter(doc=>primary.has(value(doc.fields.studentId))).length,byTeacher:[...summary].map(([id,count])=>({teacher:teacherById[id]||id,count})),suHao:teacherById[primary.get(studentDocs.find(doc=>value(doc.fields.fullName)==="Su Hào")?.name.split("/").at(-1))?.teacherId]},null,2));
