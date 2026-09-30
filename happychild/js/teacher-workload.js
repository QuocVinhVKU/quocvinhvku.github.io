const minutes=time=>{const match=/^(\d{2}):(\d{2})$/.exec(String(time||""));return match?Number(match[1])*60+Number(match[2]):0};
const duration=row=>Math.max(0,minutes(row.endTime)-minutes(row.startTime));
const overlaps=(a,b)=>a.startTime<b.endTime&&b.startTime<a.endTime;

export function teacherWorkloads(teachers,rows,{templates=false,assigned=row=>row.teacherId,active=row=>templates?row.active!==false:!["absent","cancelled","holiday"].includes(row.status)}={}){
  const totals=new Map(teachers.map(item=>[item.id,0]));
  for(const row of rows){const id=assigned(row);if(id&&totals.has(id)&&active(row))totals.set(id,totals.get(id)+duration(row))}
  return totals;
}

export function freeTeacherChoices(teachers,rows,slot,{templates=false,assigned=row=>row.teacherId,active=row=>templates?row.active!==false:!["absent","cancelled","holiday"].includes(row.status),canTeach=()=>true}={}){
  const totals=teacherWorkloads(teachers,rows,{templates,assigned,active});
  const key=templates?"dayOfWeek":"dateKey";
  return teachers.filter(person=>person.active!==false&&canTeach(person,slot)).map(person=>({teacher:person,minutes:totals.get(person.id)||0,busy:rows.some(row=>active(row)&&assigned(row)===person.id&&row[key]===slot[key]&&overlaps(row,slot))})).sort((a,b)=>a.minutes-b.minutes||(a.teacher.fullName||"").localeCompare(b.teacher.fullName||"","vi"));
}

export function workloadLabel(totalMinutes){const hours=totalMinutes/60;return `${Number.isInteger(hours)?hours:hours.toFixed(1)} giờ`}
