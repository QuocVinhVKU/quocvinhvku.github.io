import {cell,zipStore,tuitionExportRow} from './tuition-export.js?v=20261001-1';
import {monthLabel} from './tuition-model.js?v=20260930-6';

export function buildTuitionMonthSummaryXlsx(template,accounts,data,month,now=new Date()) {
  if(!accounts.length)throw new Error('Không có học sinh trong tháng đã chọn.');
  const rows=accounts.map(a=>tuitionExportRow(a,month,data,now));
  const styles=template.layouts[0],first=6,last=first+rows.length-1,totalRow=last+1;
  const row=(number,values,height,formulas={})=>`<row r="${number}" ht="${height}" customHeight="1">${values.map((value,index)=>cell(`${String.fromCharCode(65+index)}${number}`,value,index===4?styles.body[10]:index===1?8:styles.body[2],formulas[index])).join('')}</row>`;
  let body=`<row r="2" ht="30" customHeight="1">${cell('A2',`BẢNG HỌC PHÍ THÁNG ${monthLabel(month)}`,styles.title)}</row>`;
  body+=`<row r="3" ht="25" customHeight="1">${cell('A3','Đơn vị: buổi và đồng. Thành tiền đã trừ giảm trừ (nếu có).',styles.note)}</row>`;
  body+=`<row r="5" ht="30" customHeight="1">${['STT','TÊN HỌC SINH','SỐ BUỔI','HỌC PHÍ / BUỔI','THÀNH TIỀN'].map((label,index)=>cell(`${String.fromCharCode(65+index)}5`,label,template.layouts[1].head[index])).join('')}</row>`;
  rows.forEach((item,index)=>{
    const number=first+index,registered=typeof item.registered==='number'?item.registered:null,rate=typeof item.unitFee==='number'?item.unitFee:null,total=typeof item.total==='number'?item.total:null,adjustment=Number(item.adjustment||0);
    body+=row(number,[Number.isInteger(Number(item.number))&&Number(item.number)>0?Number(item.number):index+1,item.name,registered,rate,total],25,total!=null&&registered!=null&&rate!=null&&!adjustment?{4:`C${number}*D${number}`}:{}) ;
  });
  const known=rows.filter(item=>typeof item.total==='number'),missing=rows.length-known.length,knownTotal=known.reduce((sum,item)=>sum+item.total,0);
  body+=`<row r="${totalRow}" ht="30" customHeight="1">${cell(`B${totalRow}`,'TỔNG ĐÃ XÁC ĐỊNH',styles.total[1])}${cell(`E${totalRow}`,knownTotal,styles.total[10],`SUM(E${first}:E${last})`)}</row>`;
  if(missing)body+=`<row r="${totalRow+1}" ht="24" customHeight="1">${cell(`A${totalRow+1}`,`${missing} học sinh chưa đủ số liệu học phí; không tính vào tổng.`,styles.note)}</row>`;
  const parts={...template.parts};
  // The source template mixes left/right alignment; this compact roster is centered throughout.
  parts['xl/styles.xml']=parts['xl/styles.xml'].replace(/<x:alignment(?: horizontal="[^"]+")? vertical=/g,'<x:alignment horizontal="center" vertical=');
  parts['xl/worksheets/sheet1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="35" customWidth="1"/><col min="3" max="3" width="16" customWidth="1"/><col min="4" max="4" width="22" customWidth="1"/><col min="5" max="5" width="24" customWidth="1"/></cols><sheetData>${body}</sheetData><autoFilter ref="A5:E${last}"/><mergeCells count="${missing?3:2}"><mergeCell ref="A2:E2"/><mergeCell ref="A3:E3"/>${missing?`<mergeCell ref="A${totalRow+1}:E${totalRow+1}"/>`:''}</mergeCells><pageMargins left="0.4" right="0.4" top="0.55" bottom="0.55" header="0.2" footer="0.2"/></worksheet>`;
  parts['xl/workbook.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Học phí T${month.slice(5)}-${month.slice(0,4)}" sheetId="1" r:id="Rf09dbb4d62244716"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  parts['xl/_rels/workbook.xml.rels']=parts['xl/_rels/workbook.xml.rels'].replace(/<Relationship\b[^>]*Target="\/xl\/worksheets\/sheet2\.xml"[^>]*\/>/g,'').replace(/<Relationship\b[^>]*Target="\/xl\/calcChain\.xml"[^>]*\/>/g,'');
  parts['[Content_Types].xml']=parts['[Content_Types].xml'].replace(/<Override\b[^>]*PartName="\/xl\/worksheets\/sheet2\.xml"[^>]*\/>/g,'').replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g,'');
  delete parts['xl/worksheets/sheet2.xml'];delete parts['xl/calcChain.xml'];
  return zipStore(parts);
}

export async function downloadTuitionMonthSummaryXlsx(accounts,data,month) {
  const response=await fetch(new URL('../assets/tuition-export-layout.json?v=20260930-1',import.meta.url));
  if(!response.ok)throw new Error('Không tải được mẫu Excel. Hãy tải lại trang rồi thử lại.');
  const blob=buildTuitionMonthSummaryXlsx(await response.json(),accounts,data,month),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`Bang-hoc-phi-${month}.xlsx`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
