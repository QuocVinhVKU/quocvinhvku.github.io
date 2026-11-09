const rate=value=>value==null||value===''?null:Number(value);
export function classifyTuitionPending(serverMonth,entry){
  const desired=entry.values;
  if(entry.kind==='tuition-balance'){
    if(desired.onlyIfUnclosed&&Number.isSafeInteger(serverMonth?.statsOverrides?.balance)&&serverMonth.statsOverrides.balance>=0)return 'protected';
    if(serverMonth?.balanceClose?.value===desired.value&&serverMonth.balanceClose.reason===desired.reason)return 'already-synced';
    if(desired.onlyIfUnclosed)return serverMonth?.balanceClose?'conflict':'replay';
    return (serverMonth?.revision||0)!==entry.baseRevision?'conflict':'replay';
  }
  const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  if(serverMonth&&rate(serverMonth.unitFee)===rate(desired.unitFee)&&Number(serverMonth.adjustment||0)===Number(desired.adjustment||0)&&String(serverMonth.note||'').trim()===String(desired.note||'').trim()&&stable(serverMonth.statsOverrides||{})===stable(desired.statsOverrides||{})&&(!desired.snapshot||stable(serverMonth.snapshot)===stable(desired.snapshot)))return 'already-synced';
  if((serverMonth?.revision||0)!==entry.baseRevision)return 'conflict';
  return 'replay';
}
