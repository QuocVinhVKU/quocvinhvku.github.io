import {cell,zipStore,tuitionExportRow} from './tuition-export.js?v=20260930-4';
import {monthNow,monthLabel,previousMonth} from './tuition-model.js?v=20260930-6';
import {tuitionExportMonths} from './tuition-export-roster.js?v=20260930-1';
const xml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function tuitionCards(account,month,data,now=new Date()) {
  return tuitionExportMonths(account,month,monthNow(now)).flatMap(m=>{
    const sources=(account.history||[]).filter(s=>s.month===m).sort((a,b)=>b.sourceRow-a.sourceRow);
    if(sources.length)return sources.map(source=>({month:m,source}));
    const row=tuitionExportRow(account,m,data,now);
    return [{month:m,row}];
  });
}
function makeSheet(template,account,month,data,now){
  const cards=tuitionCards(account,month,data,now),merges=['A1:J1','A2:J2'];
  const makeRow=(n,values,styles,height,formulas={})=>`<row r="${n}" ht="${height}" customHeight="1">${values.map((v,c)=>cell(String.fromCharCode(65+c)+n,v,styles[c]||0,formulas[c])).join('')}</row>`;
  let body=makeRow(1,[`${account.rosterNumber?account.rosterNumber+'. ':''}${account.displayName} — BÁO HỌC PHÍ`],[template.title],32);
  body+=makeRow(2,[`Tháng ${monthLabel(month)} tô vàng cam. Nguồn: HappyChild / phiếu Excel gốc. Đơn vị: buổi và đồng.`],[template.note],30);
  cards.forEach((card,index)=>{
    const r=4+index*6,style=template.layouts[card.month===month?0:1],source=card.source,row=card.row,prior=monthLabel(previousMonth(card.month));
    const labels=source?.labels?.slice()||['Tên trẻ',`Số buổi đăng ký T${prior}`,'Số buổi vắng (cần bù)',`Đã bù T${prior}`,`Buổi nghỉ T${prior}`,`Tổng buổi đã học T${prior}`,'Ghi chú','Điều chỉnh học phí',null,'Tổng học phí'];
    const values=source?.values?.slice()||[row.name,row.previous,row.balance,row.madeUp,row.absent,row.actual,[row.note,row.status].filter(Boolean).join('\n'),row.adjustment,null,row.total];
    const feeLabels=source?.feeLabels?.slice()||[null,`Số buổi đăng ký T${monthLabel(card.month)}`,null,null,null,null,'HP 1 buổi','Học phí tháng','Giảm trừ (đ)',null];
    const fees=source?.fees?.slice()||[null,row.registered,null,null,null,null,row.unitFee,row.monthly,row.adjustment,null];
    const pad=a=>Array.from({length:10},(_,i)=>a[i]??null);
    body+=makeRow(r,[`Thời gian: tháng ${monthLabel(card.month)}${source?' (dữ liệu gốc Excel)':''}`],style[0],28);
    body+=makeRow(r+1,pad(labels),style[1],48);
    body+=makeRow(r+2,pad(values),style[2],Math.max(52,Math.min(180,Math.ceil(String(values[6]||'').length/23)*15)),source?{}:{9:`IF(ISNUMBER(H${r+4}),H${r+4}-I${r+4},"")`});
    body+=makeRow(r+3,pad(feeLabels),style[3],38);
    body+=makeRow(r+4,pad(fees),style[4],34,source?{}:{7:`IF(AND(ISNUMBER(B${r+4}),ISNUMBER(G${r+4})),B${r+4}*G${r+4},"")`});
    merges.push(`A${r}:J${r}`,`H${r+1}:I${r+1}`,`H${r+2}:I${r+2}`,`A${r+2}:A${r+4}`,`J${r+2}:J${r+4}`,`B${r+3}:F${r+3}`,`B${r+4}:F${r+4}`);
  });
  return template.parts['xl/worksheets/sheet1.xml'].replace(/<sheetData\s*\/>/,`<sheetData>${body}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`).replace(/<dimension\b[^>]*\/>/,`<dimension ref="A1:J${cards.length*6+2}"/>`);
}
export function buildTuitionCardsXlsx(template,accounts,data,month,now=new Date()) {
  if(!accounts.length)throw new Error('Không có học sinh trong tháng được chọn.');
  const parts={...template.parts},used=new Set(),names=[];
  accounts.forEach((a,i)=>{
    let base=String(a.displayName||'Học sinh').replace(/[\x00-\x1f\\/*?:\[\]]/g,' ').replace(/^'+|'+$/g,'').trim().slice(0,31)||'Học sinh',name=base,n=2;
    while(used.has(name.toLowerCase())){const suffix=` (${n++})`;name=base.slice(0,31-suffix.length)+suffix;}
    used.add(name.toLowerCase());names.push(name);parts[`xl/worksheets/sheet${i+1}.xml`]=makeSheet(template,a,month,data,now);
  });
  parts['xl/workbook.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${xml(n)}" sheetId="${i+1}" r:id="hc${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  parts['xl/_rels/workbook.xml.rels']=parts['xl/_rels/workbook.xml.rels'].replace(/<Relationship\b[^>]*Type="[^"]*\/(worksheet|calcChain)"[^>]*\/>/g,'').replace('</Relationships>',names.map((_,i)=>`<Relationship Id="hc${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>');
  parts['[Content_Types].xml']=parts['[Content_Types].xml'].replace(/<Override\b[^>]*PartName="\/xl\/(worksheets\/[^\"]+|calcChain.xml)"[^>]*\/>/g,'').replace('</Types>',names.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>');
  delete parts['xl/calcChain.xml'];
  return zipStore(parts);
}
export async function downloadTuitionCardsXlsx(accounts,data,month){
  const response=await fetch(new URL('../assets/tuition-card-layout.json?v=20260930-1',import.meta.url));if(!response.ok)throw new Error('Không tải được mẫu phiếu Excel.');
  const blob=buildTuitionCardsXlsx(await response.json(),accounts,data,month),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`Bao-hoc-phi-${month}-kem-lich-su.xlsx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
