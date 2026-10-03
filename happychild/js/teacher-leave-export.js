import {cell,zipStore} from './tuition-export.js?v=20261001-1';

export async function downloadTeacherLeaveXlsx(month,rows) {
  const response=await fetch(new URL('../assets/tuition-export-layout.json?v=20260930-1',import.meta.url));
  if(!response.ok)throw new Error('Không tải được mẫu Excel. Hãy tải lại trang rồi thử lại.');
  const template=await response.json(),parts={...template.parts},styles=template.layouts[0],first=5,last=Math.max(first,first+rows.length-1);
  const makeRow=(number,values,height=28)=>`<row r="${number}" ht="${height}" customHeight="1">${values.map((value,index)=>cell(`${String.fromCharCode(65+index)}${number}`,value,index===0?styles.body[2]:index===2?styles.body[2]:8)).join('')}</row>`;
  let body=`<row r="2" ht="30" customHeight="1">${cell('A2',`LỊCH NGHỈ GIÁO VIÊN THÁNG ${month.slice(5)}/${month.slice(0,4)}`,styles.title)}</row>`;
  body+=`<row r="4" ht="36" customHeight="1">${['STT','GIÁO VIÊN (NGÀY / GIỜ NGHỈ)','TỔNG NGÀY NGHỈ','GHI CHÚ CHI TIẾT'].map((label,index)=>cell(`${String.fromCharCode(65+index)}4`,label,styles.head[index])).join('')}</row>`;
  rows.forEach((item,index)=>{body+=makeRow(first+index,[index+1,item.teacherWithDates,item.totalDays,item.note],Math.max(30,18*Math.max(1,String(item.note||'').split('\n').length)))});
  if(!rows.length)body+=makeRow(first,['','Không có lịch nghỉ trong tháng',0,'']);
  parts['xl/worksheets/sheet1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="1" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="58" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="55" customWidth="1"/></cols><sheetData>${body}</sheetData><autoFilter ref="A4:D${last}"/><mergeCells count="1"><mergeCell ref="A2:D2"/></mergeCells><pageMargins left="0.4" right="0.4" top="0.55" bottom="0.55" header="0.2" footer="0.2"/></worksheet>`;
  parts['xl/workbook.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Lịch nghỉ T${month.slice(5)}-${month.slice(0,4)}" sheetId="1" r:id="Rf09dbb4d62244716"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  parts['xl/_rels/workbook.xml.rels']=parts['xl/_rels/workbook.xml.rels'].replace(/<Relationship\b[^>]*Target="\/xl\/worksheets\/sheet2\.xml"[^>]*\/>/g,'').replace(/<Relationship\b[^>]*Target="\/xl\/calcChain\.xml"[^>]*\/>/g,'');
  parts['[Content_Types].xml']=parts['[Content_Types].xml'].replace(/<Override\b[^>]*PartName="\/xl\/worksheets\/sheet2\.xml"[^>]*\/>/g,'').replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g,'');
  delete parts['xl/worksheets/sheet2.xml'];delete parts['xl/calcChain.xml'];
  const blob=zipStore(parts),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`Lich-nghi-giao-vien-${month}.xlsx`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
