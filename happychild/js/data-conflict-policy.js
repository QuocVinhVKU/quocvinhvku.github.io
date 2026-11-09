import {canonicalData} from './data-codec.js';
// Updating attendance dirties the week's summary; its previous summary is not
// a precondition for attendance. The actual session/student remain exact checks.
export function samePendingRead(entry,path,before,after){
 if(entry.domain==='store'&&entry.name==='updateSessionStatus'&&path===`weeks/${entry.args?.[0]}`&&before&&after){
  const shape=value=>Object.fromEntries(['startDate','endDate','weekNumber','label'].filter(k=>k in value).map(k=>[k,value[k]]));
  return canonicalData(shape(before))===canonicalData(shape(after));
 }
 return canonicalData(before)===canonicalData(after);
}
export const mayRecheckConflict=entry=>entry.status==='conflict'&&entry.name==='updateSessionStatus'&&entry.domain==='store'&&!entry.committed&&!entry.ambiguous&&!entry.unknown&&Boolean(entry.reads?.length);
