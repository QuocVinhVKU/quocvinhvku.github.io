// Repeating templates only: weekly leave, holidays and makeup never alter this view.
export function templateVacancies({templates,students,teachers,capacity,canTeach}) {
  const people=new Map(students.map(s=>[s.id,s]));
  const validTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'');
  const rows=templates.filter(t=>t.active!==false&&people.get(t.studentId)?.active===true&&Number.isInteger(Number(t.dayOfWeek))&&Number(t.dayOfWeek)>=0&&Number(t.dayOfWeek)<7&&validTime(t.startTime)&&validTime(t.endTime)&&t.startTime<t.endTime);
  const hours=new Set(['08:00|09:00','09:00|10:00','15:00|16:00','16:00|17:00','17:00|18:00','18:00|19:00','19:00|20:00',...rows.map(t=>`${t.startTime}|${t.endTime}`)]);
  return Array.from({length:7},(_,day)=>({day,slots:[...hours].sort().map(key=>{
    const [startTime,endTime]=key.split('|'),overlapping=rows.filter(t=>Number(t.dayOfWeek)===day&&t.startTime<endTime&&startTime<t.endTime);
    // Peak simultaneous occupancy, not the sum of consecutive partial lessons.
    const points=[startTime,...overlapping.map(t=>t.startTime).filter(t=>t>startTime&&t<endTime)];
    const occupied=Math.max(0,...points.map(p=>new Set(overlapping.filter(t=>t.startTime<=p&&p<t.endTime).map(t=>t.studentId)).size));
    const busy=new Set(overlapping.map(t=>t.teacherId)),freeTeachers=teachers.filter(t=>t.active===true&&!busy.has(t.id)&&canTeach(t,startTime,endTime));
    const limit=capacity(startTime,endTime),remaining=Math.max(0,limit-occupied);
    return {startTime,endTime,occupied,capacity:limit,remaining,freeTeachers,available:Math.min(remaining,freeTeachers.length)};
  })}));
}

// One time range is one weekly opportunity, regardless of how many weekdays it fits.
export function weeklyTemplateOpportunities(days, minimumDays=3) {
  const byTime=new Map();
  for(const {day,slots} of days) {
    if(day<0||day>5) continue;
    for(const slot of slots) {
      if(slot.available<=0) continue;
      const key=`${slot.startTime}|${slot.endTime}`;
      if(!byTime.has(key)) byTime.set(key,{startTime:slot.startTime,endTime:slot.endTime,days:[]});
      byTime.get(key).days.push({day,...slot});
    }
  }
  return [...byTime.values()].filter(group=>group.days.length>=minimumDays).sort((a,b)=>a.startTime.localeCompare(b.startTime)||a.endTime.localeCompare(b.endTime)).map(group=>({...group,possibleCounts:Array.from({length:Math.min(6,group.days.length)-minimumDays+1},(_,i)=>minimumDays+i)}));
}
