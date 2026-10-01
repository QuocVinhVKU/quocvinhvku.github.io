import {monthLabel,previousMonth,tuitionMoney} from './tuition-model.js';

const currency=value=>typeof value==='number'&&Number.isFinite(value)?`${new Intl.NumberFormat('vi-VN').format(value)} ₫`:'—';
const value=value=>value===null||value===undefined||value===''?'—':String(value);
const attendanceValue=(count,dates=[])=>count==null?'—':`${count}${dates.length?` (${dates.map(day=>day.slice(8,10)+'/'+day.slice(5,7)).join(', ')})`:''}`;

export function tuitionJpgData({name,month,status='',stats=null,config={},source=null}) {
  const imported=source?.values||[],fees=source?.fees||[];
  const sourceOnly=!stats&&!!source;
  const registered=stats?.registered??fees[1]??null;
  const unitFee=sourceOnly?fees[6]??null:config.unitFee??fees[6]??null;
  const adjustment=config.adjustment??0;
  const computed=!sourceOnly&&registered!==null&&unitFee!==null?tuitionMoney(Number(unitFee),Number(registered),Number(adjustment)):null;
  return {
    name:String(name||imported[0]||'Học sinh'),month,status,
    previousMonth:monthLabel(previousMonth(month)),
    previousRegistered:stats?.previousRegistered??imported[1]??null,
    balance:stats?.balance??imported[2]??null,
    madeUp:stats?.madeUp??imported[3]??null,
    madeUpDates:stats?.madeUpDates??[],
    absent:stats?.absent??imported[4]??null,
    absentDates:stats?.absentDates??[],
    actual:stats?.actual??imported[5]??null,
    note:sourceOnly?[imported[6],imported[7],fees[8]].filter(item=>item!==null&&item!==undefined&&item!=='').join(' · '):String(config.note||imported[6]||''),
    registered,unitFee,monthly:computed?.monthly??fees[7]??null,
    adjustment:computed?Number(adjustment):null,
    total:computed?.total??imported[9]??null,
  };
}

function wrap(ctx,text,maxWidth) {
  const lines=[];
  for(const paragraph of String(text).split(/\r?\n/)) {
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next=line?`${line} ${word}`:word;
      if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;
    }
    lines.push(line);
  }
  return lines.length?lines:[''];
}
function centered(ctx,text,x,y,width,color='#23313b',font='600 22px Arial') {
  ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
  const lines=wrap(ctx,value(text),width-20),height=27,start=y-(lines.length-1)*height/2;
  lines.forEach((line,i)=>ctx.fillText(line,x,start+i*height));
}
function tableCell(ctx,x,y,w,h,text,{header=false,highlight=false,small=false}={}) {
  ctx.fillStyle=header?'#a9d18e':highlight?'#ff8589':'#fff';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#52604c';ctx.lineWidth=1.35;ctx.strokeRect(x+.675,y+.675,w-1.35,h-1.35);
  centered(ctx,text,x+w/2,y+h/2,w,'#172019',small?'600 17px Arial':header?'700 17px Arial':highlight?'700 24px Arial':'500 20px Arial');
}

export function drawTuitionJpg(ctx,data) {
  // Reproduce the merged-cell layout shown on the tuition page.
  // 4x rendering keeps Vietnamese text and table borders sharp when printed.
  const W=1600,H=500,scale=4,left=48,tableWidth=W-left*2;
  const nameWidth=180,statWidth=150,adjustWidth=235,totalWidth=189;
  const headerH=82,dataH=78,subHeaderH=58,subDataH=64;
  ctx.canvas.width=Math.round(W*scale);ctx.canvas.height=Math.round(H*scale);
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#e1e5e9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,128.5);ctx.lineTo(W,128.5);ctx.stroke();
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#243444';ctx.font='700 32px Arial';
  ctx.fillText(`Tháng ${monthLabel(data.month)}`,left,54);
  ctx.font='17px Arial';ctx.fillStyle='#718096';ctx.fillText(data.status||'Tháng hiện tại · tự cập nhật',left,91);
  ctx.textAlign='right';ctx.fillStyle='#111827';ctx.font='700 25px Arial';ctx.fillText(`${currency(data.total)} ⌄`,W-left,65);

  const y=158;
  const mainLabels=['Tên trẻ',`Số buổi đăng ký\nT${data.previousMonth}`,`Số buổi đã bù\nT${data.previousMonth}`,`Buổi nghỉ\nT${data.previousMonth}`,`Tổng buổi đã học\nT${data.previousMonth}`,'Số buổi vắng\nCần bù còn lại','Ghi chú','Điều chỉnh học phí','Tổng học phí'];
  const widths=[nameWidth,statWidth,statWidth,statWidth,statWidth,statWidth,statWidth,adjustWidth,totalWidth];
  let x=left;
  widths.forEach((w,i)=>{tableCell(ctx,x,y,w,headerH,mainLabels[i],{header:true,small:i>0});x+=w;});

  // Name and total deliberately span all three rows, exactly like the web card.
  tableCell(ctx,left,y+headerH,nameWidth,dataH+subHeaderH+subDataH,data.name,{small:true});
  x=left+nameWidth;
  const rowValues=[value(data.previousRegistered),attendanceValue(data.madeUp,data.madeUpDates),attendanceValue(data.absent,data.absentDates),value(data.actual),value(data.balance),'—'];
  rowValues.forEach((item,index)=>{tableCell(ctx,x,y+headerH,statWidth,dataH,item,{small:index===1||index===2});x+=statWidth;});
  tableCell(ctx,x,y+headerH,adjustWidth,dataH,currency(data.adjustment),{small:true});
  const totalX=left+tableWidth-totalWidth;
  tableCell(ctx,totalX,y+headerH,totalWidth,dataH+subHeaderH+subDataH,currency(data.total),{highlight:true});

  const currentX=left+nameWidth,currentWidth=statWidth*5,feeX=currentX+currentWidth;
  const splitWidth=adjustWidth/2;
  tableCell(ctx,currentX,y+headerH+dataH,currentWidth,subHeaderH,`Số buổi đăng ký T${monthLabel(data.month)}`,{header:true});
  tableCell(ctx,feeX,y+headerH+dataH,statWidth,subHeaderH,'Học phí 1 buổi',{header:true});
  tableCell(ctx,feeX+statWidth,y+headerH+dataH,splitWidth,subHeaderH,'Học phí tháng',{header:true,small:true});
  tableCell(ctx,feeX+statWidth+splitWidth,y+headerH+dataH,splitWidth,subHeaderH,'Ghi chú / giảm trừ',{header:true,small:true});
  tableCell(ctx,currentX,y+headerH+dataH+subHeaderH,currentWidth,subDataH,`${value(data.registered)} buổi`);
  tableCell(ctx,feeX,y+headerH+dataH+subHeaderH,statWidth,subDataH,currency(data.unitFee),{small:true});
  tableCell(ctx,feeX+statWidth,y+headerH+dataH+subHeaderH,splitWidth,subDataH,currency(data.monthly),{small:true});
  tableCell(ctx,feeX+statWidth+splitWidth,y+headerH+dataH+subHeaderH,splitWidth,subDataH,currency(data.adjustment),{small:true});
  return H;
}

export async function downloadTuitionJpg(data) {
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Trình duyệt không hỗ trợ xuất ảnh JPG.');
  drawTuitionJpg(ctx,data);
  let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.99));
  if(!blob||blob.type!=='image/jpeg')throw new Error('Không thể tạo ảnh JPG.');
  // Keep the file at least 1 MiB as requested. JPEG readers safely ignore bytes
  // after the end marker, while the actual image remains a crisp 6400px wide.
  const minimumBytes=1024*1024;
  if(blob.size<minimumBytes) blob=new Blob([blob,new Uint8Array(minimumBytes-blob.size)],{type:'image/jpeg'});
  const href=URL.createObjectURL(blob),link=document.createElement('a');
  const safeName=data.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');
  link.href=href;link.download=`Bao-hoc-phi-${safeName||'hoc-sinh'}-${data.month}.jpg`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
}
