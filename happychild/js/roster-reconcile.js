export const normalizeRosterName=value=>String(value||"")
  .normalize("NFC")
  .toLocaleUpperCase("vi")
  .replace(/[^\p{L}\p{N}]+/gu," ")
  .trim()
  .replace(/\s+/g," ");

const identityAliases={
  "DUY THÔNG":"GẤU",
  "DẦN":"TRIẾT",
  "TRÍ":"TRIẾT",
  "TRIET":"TRIẾT",
  "BƠ":"VĨNH AN BƠ",
  "HUY BẮP":"GIA HUY BẮP",
  "MON":"MON NGUYÊN",
  "M HOÀNG MON":"MINH HOÀNG MON",
  "HY":"NAM HY",
  "BEN 9H":"BEN SÁNG",
  "XÁ XÍU":"XÍU",
  "MINH":"KHẢI MINH",
  "MINH KEN ALN":"MINH KEN",
  "PHÚC LỚN":"THIÊN PHÚC",
  "THƯ":"QUỲNH THƯ",
  "BUN":"KHẢI BUN",
  "BEN KHOA":"ĐĂNG KHOA",
  "D KHANG":"DUY KHANG",
  "KHÁNH NGỌC NA":"NGỌC NA",
  "GIA KHANG 3T":"KHANG 3T",
  "THÀNH":"ĐỨC THÀNH",
  "ĐỨC AN":"BEN AN",
};

export const canonicalRosterKey=value=>{
  const normalized=normalizeRosterName(value);
  return identityAliases[normalized]||normalized;
};

export function planRosterReconciliation(students=[],sourceTemplates=[]){
  const desired=new Map();
  for(const item of sourceTemplates){
    const key=canonicalRosterKey(item.studentKey||item.studentName);
    if(!key)continue;
    const current=desired.get(key)||{key,studentName:String(item.studentName||item.studentKey||key).trim(),idHints:new Set(),scheduleCount:0};
    if(item.studentIdHint)current.idHints.add(String(item.studentIdHint));
    current.scheduleCount++;
    desired.set(key,current);
  }
  const groups=new Map();
  for(const student of students){const key=canonicalRosterKey(student.fullName||student.shortName);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(student)}
  const keepers=[],duplicates=[],missing=[];
  for(const target of desired.values()){
    const candidates=groups.get(target.key)||[],hints=target.idHints;
    const keeper=candidates.find(item=>hints.has(item.id))
      ||candidates.find(item=>!item.archived&&normalizeRosterName(item.fullName)===target.key)
      ||candidates.find(item=>!item.archived)
      ||candidates[0];
    if(!keeper){missing.push({key:target.key,studentName:target.studentName,scheduleCount:target.scheduleCount});continue}
    keepers.push({key:target.key,studentId:keeper.id,studentName:keeper.fullName,scheduleCount:target.scheduleCount});
    candidates.filter(item=>item.id!==keeper.id).forEach(item=>duplicates.push({studentId:item.id,studentName:item.fullName,keeperId:keeper.id,keeperName:keeper.fullName,key:target.key}));
  }
  const stale=students.filter(item=>!desired.has(canonicalRosterKey(item.fullName||item.shortName))).map(item=>({studentId:item.id,studentName:item.fullName,key:canonicalRosterKey(item.fullName||item.shortName)}));
  return {desired:[...desired.values()].map(item=>({...item,idHints:[...item.idHints]})),keepers,duplicates,stale,missing};
}
