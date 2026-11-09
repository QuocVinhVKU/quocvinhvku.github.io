// A projection only: never write this optimistic status/balance back as server data.
export function projectLocalSessions(rows,entries,weekId){
 const intents=entries.filter(e=>e.kind==='data-action'&&e.name==='updateSessionStatus'&&e.status!=='running').slice().sort((a,b)=>String(a.savedAt).localeCompare(String(b.savedAt)));
 return rows.map(row=>{
  const original=row.localPending?{...row,...row.localServerValues}:row;
  let result={...original};delete result.localPending;delete result.localServerValues;
  for(const entry of intents){const [week,session,status,,reason]=entry.args||[];
   if(week!==(row.weekId||weekId)||session?.id!==row.id)continue;
   result={...result,status,note:[reason||'',entry.status==='pending'?'Chờ đồng bộ Firebase':'Chờ đối chiếu Firebase'].filter(Boolean).join(' · '),localPending:entry.id,localServerValues:{status:original.status,note:original.note||''}};
  }
  return result;
 });
}
