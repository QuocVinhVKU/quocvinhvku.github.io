// Persist values, never Firebase User instances or their authentication tokens.
export function encodeData(value,uid){
 if(value===undefined)return {__hc:'undefined'};
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Số liệu không hợp lệ.');return value;}
 if(typeof value!=='object')throw Error('Không thể lưu kiểu dữ liệu này trên thiết bị.');
 if(value.uid&&value.uid===uid)return {__hc:'user',uid};
 if(value instanceof Date)return {__hc:'date',value:value.toISOString()};
 if(typeof value.toDate==='function'&&typeof value.seconds==='number')return {__hc:'timestamp',seconds:value.seconds,nanoseconds:value.nanoseconds||0};
 if(Array.isArray(value))return value.map(v=>encodeData(v,uid));
 const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null)throw Error('Dữ liệu không hỗ trợ lưu tạm an toàn.');
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encodeData(v,uid)]));
}
export function decodeData(value,user,Timestamp){
 if(!value||typeof value!=='object')return value;
 if(value.__hc==='undefined')return undefined;
 if(value.__hc==='user'){if(value.uid!==user.uid)throw Error('Bản lưu thuộc tài khoản khác.');return {uid:user.uid};}
 if(value.__hc==='date')return new Date(value.value);
 if(value.__hc==='timestamp')return new Timestamp(value.seconds,value.nanoseconds);
 if(Array.isArray(value))return value.map(v=>decodeData(v,user,Timestamp));
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decodeData(v,user,Timestamp)]));
}
export function canonicalData(value){
 if(Array.isArray(value))return '['+value.map(canonicalData).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalData(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function replayDecision(entry){
 if(entry.committed>0||entry.ambiguous||entry.unknown||!(entry.reads?.length||entry.queries?.length))return 'review';
 return 'pending';
}
