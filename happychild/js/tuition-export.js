import {monthNow,monthLabel,previousMonth,nextMonth,tuitionConfig,tuitionStats,tuitionMoney,previousRegistered,tuitionBillingStats} from './tuition-model.js?v=20260930-6';

export function tuitionExportRow(account,month,data,now=new Date()) {
  const person=data.students.find(p=>p.id===account.studentId),config=tuitionConfig(account,month),current=monthNow(now);
  const source=[...(account.history||[])].filter(s=>s.month===month).sort((a,b)=>b.sourceRow-a.sourceRow)[0];
  const stored=account.months?.[month]?.snapshot;
  if(source&&(!person||month<current&&!stored)) {
    const v=source.values,f=source.fees;
    return {number:account.rosterNumber,name:person?.fullName||account.displayName,previous:v[1],balance:v[2],madeUp:v[3],actual:v[5],registered:f[1],unitFee:f[6],monthly:f[7],adjustment:typeof f[7]==='number'&&typeof v[9]==='number'?f[7]-v[9]:null,total:v[9],note:String(f[8]||v[6]||''),status:person?'Dữ liệu gốc Excel':'Chưa liên kết học sinh; dữ liệu gốc Excel',fixedAmounts:true};
  }
  if(!person)return {number:'',name:account.displayName,unitFee:config.unitFee,note:config.note,status:'Cần tạo hoặc liên kết học sinh. Chưa tính học phí.'};
  const compute=m=>tuitionStats({...data,person,month:m,now}),stats=tuitionBillingStats(account,month,month<current&&stored?stored:compute(month),compute),fee=tuitionMoney(config.unitFee,stats.registered,config.adjustment||0);
  return {number:account.rosterNumber,name:person.fullName,previous:previousRegistered(account,month,compute,current),balance:stats.balance,madeUp:stats.madeUp,absent:stats.absent,actual:stats.actual,registered:stats.registered,unitFee:config.unitFee,monthly:fee.monthly,adjustment:config.adjustment||0,total:fee.total,note:config.note,status:config.unitFee==null?'Chưa nhập đơn giá':`${month>current?'Dự báo; ':''}${stats.forecast||0} buổi từ lịch mẫu${person.active===false?'; đã nghỉ / đợi lịch':''}`};
}

const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function cell(ref,value,style,formula) {
  const attrs=`r="${ref}" s="${style}"`;
  if(formula)return `<c ${attrs}${typeof value==='number'?'':' t="str"'}><f>${xml(formula)}</f><v>${typeof value==='number'?value:''}</v></c>`;
  if(value==null||value==='')return `<c ${attrs}/>`;
  if(typeof value==='number'&&Number.isFinite(value))return `<c ${attrs}><v>${value}</v></c>`;
  // Inline text never executes user names/notes beginning with =, +, - or @.
  return `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
function sheetXml(base,layout,records,month,forecast,createdAt) {
  const headers=['STT','Học sinh',`Đăng ký T${monthLabel(previousMonth(month))}`,'Cần bù hiện tại',`Đã bù T${monthLabel(previousMonth(month))}`,`Đã học T${monthLabel(previousMonth(month))}`,`Đăng ký T${monthLabel(month)}`,'Đơn giá (đ)','Học phí tháng (đ)','Giảm trừ (đ)','Tổng học phí (đ)','Ghi chú','Tình trạng / nguồn'];
  const row=(n,cells,height)=>`<row r="${n}" ht="${height}" customHeight="1">${cells.join('')}</row>`;
  let body=row(2,[cell('A2',`${forecast?'DỰ BÁO HỌC PHÍ':'BÁO HỌC PHÍ'} THÁNG ${monthLabel(month)}`,layout.title)],30);
  body+=row(3,[cell('A3',`Nguồn: HappyChild. Xuất ${createdAt}. ${forecast?'Dự báo theo lịch đăng ký, chưa phải số liệu chốt. ':'Số liệu tại thời điểm xuất. '}Cần bù là số dư hiện tại.`,layout.note)],28);
  body+=row(5,headers.map((h,i)=>cell(String.fromCharCode(65+i)+'5',h,layout.head[i])),48);
  records.forEach((r,index)=>{
    const n=index+6,values=[r.number,r.name,r.previous,r.balance,r.madeUp,r.actual,r.registered,r.unitFee,r.monthly,r.adjustment,r.total,r.note,r.status];
    body+=row(n,values.map((v,i)=>cell(String.fromCharCode(65+i)+n,v,layout.body[i],!r.fixedAmounts&&i===8?`IF(AND(ISNUMBER(G${n}),ISNUMBER(H${n})),G${n}*H${n},"")`:!r.fixedAmounts&&i===10?`IF(ISNUMBER(I${n}),I${n}-J${n},"")`:null)),42);
  });
  const total=records.length+6,last=total-1,missing=records.filter(r=>typeof r.total!=='number').length;
  body+=row(total,Array.from({length:13},(_,i)=>cell(String.fromCharCode(65+i)+total,i===1?'Tổng đã xác định':i===12?`${missing} hồ sơ chưa đủ số liệu`:i===8?records.reduce((s,r)=>s+(typeof r.monthly==='number'?r.monthly:0),0):i===10?records.reduce((s,r)=>s+(typeof r.total==='number'?r.total:0),0):null,layout.total[i],records.length&&(i===8||i===10)?`SUM(${String.fromCharCode(65+i)}6:${String.fromCharCode(65+i)}${last})`:null)),30);
  return base.replace(/<sheetData\s*\/>|<sheetData>[\s\S]*?<\/sheetData>/,`<sheetData>${body}</sheetData>`).replace(/<dimension\b[^>]*\/>/,`<dimension ref="A1:M${total}"/>`);
}

// Small, uncompressed ZIP writer: no CDN or third-party upload is required.
// Layout and Excel styles are generated from the shared artifact-tool template.
export function zipStore(parts) {
  const encoder=new TextEncoder(),entries=[],chunks=[];let offset=0;
  const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  const crc=bytes=>{let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;};
  const header=(length,values)=>{const b=new Uint8Array(length),d=new DataView(b.buffer);for(const [at,value,size]of values)size===2?d.setUint16(at,value,true):d.setUint32(at,value,true);return b;};
  for(const [path,value]of Object.entries(parts)){
    const name=encoder.encode(path),data=encoder.encode(value),checksum=crc(data);
    const local=header(30,[[0,0x04034b50,4],[4,20,2],[6,0x800,2],[12,33,2],[14,checksum,4],[18,data.length,4],[22,data.length,4],[26,name.length,2]]);
    chunks.push(local,name,data);entries.push({name,data,checksum,offset});offset+=30+name.length+data.length;
  }
  let centralSize=0;
  for(const {name,data,checksum,offset:at}of entries){const central=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[14,33,2],[16,checksum,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[42,at,4]]);chunks.push(central,name);centralSize+=46+name.length;}
  chunks.push(header(22,[[0,0x06054b50,4],[8,entries.length,2],[10,entries.length,2],[12,centralSize,4],[16,offset,4]]));
  return new Blob(chunks,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
export function buildTuitionXlsx(template,accounts,data,month,now=new Date()) {
  const parts={...template.parts},months=[month,nextMonth(month)],createdAt=now.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
  months.forEach((m,i)=>{parts[`xl/worksheets/sheet${i+1}.xml`]=sheetXml(parts[`xl/worksheets/sheet${i+1}.xml`],template.layouts[i],accounts.map(a=>tuitionExportRow(a,m,data,now)),m,i===1,createdAt);});
  delete parts['xl/calcChain.xml'];
  parts['[Content_Types].xml']=parts['[Content_Types].xml'].replace(/<Override\b[^>]*PartName="\/xl\/calcChain.xml"[^>]*\/>/g,'');
  parts['xl/_rels/workbook.xml.rels']=parts['xl/_rels/workbook.xml.rels'].replace(/<Relationship\b[^>]*Type="[^"]*\/calcChain"[^>]*\/>/g,'');
  return zipStore(parts);
}
export async function downloadTuitionXlsx(accounts,data,month) {
  const response=await fetch(new URL('../assets/tuition-export-layout.json?v=20260930-1',import.meta.url));
  if(!response.ok)throw new Error('Không tải được mẫu Excel. Hãy tải lại trang rồi thử lại.');
  const blob=buildTuitionXlsx(await response.json(),accounts,data,month),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`Bao-hoc-phi-${month}-du-bao-${nextMonth(month)}.xlsx`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
