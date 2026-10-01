const rate=value=>value==null||value===''?null:Number(value);
export function classifyTuitionPending(serverMonth,entry){
  const desired=entry.values;
  if(serverMonth&&rate(serverMonth.unitFee)===rate(desired.unitFee)&&Number(serverMonth.adjustment||0)===Number(desired.adjustment||0)&&String(serverMonth.note||'').trim()===String(desired.note||'').trim())return 'already-synced';
  if((serverMonth?.revision||0)!==entry.baseRevision)return 'conflict';
  return 'replay';
}
