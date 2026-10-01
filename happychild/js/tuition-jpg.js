import {monthLabel,previousMonth,tuitionMoney} from './tuition-model.js';

const currency=value=>typeof value==='number'&&Number.isFinite(value)?`${new Intl.NumberFormat('vi-VN').format(value)} ₫`:'—';
const value=value=>value===null||value===undefined||value===''?'—':String(value);

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
    absent:stats?.absent??imported[4]??null,
    actual:stats?.actual??imported[5]??null,
    note:sourceOnly?[imported[6],imported[7],fees[8]].filter(item=>item!==null&&item!==undefined&&item!=='').join(' · '):String(config.note||imported[6]||''),
    registered,unitFee,monthly:computed?.monthly??fees[7]??null,
    adjustment:computed?Number(adjustment):null,
    total:computed?.total??imported[9]??null,
  };
}

function roundedRect(ctx,x,y,w,h,r,fill,stroke) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
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
function centered(ctx,text,x,y,width,color='#f8fafc',font='600 22px Arial') {
  ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
  const lines=wrap(ctx,value(text),width-20),height=27,start=y-(lines.length-1)*height/2;
  lines.forEach((line,i)=>ctx.fillText(line,x,start+i*height));
}
function tableCell(ctx,x,y,w,h,text,{header=false,highlight=false,small=false}={}) {
  ctx.fillStyle=header?'#385a39':highlight?'#783c4b':'#1b2a35';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#526053';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  centered(ctx,text,x+w/2,y+h/2,w,header?'#fffceb':'#f8fafc',small?'600 18px Arial':header?'700 19px Arial':'700 22px Arial');
}

export function drawTuitionJpg(ctx,data) {
  const W=1600,left=48,tableWidth=W-left*2,cols=[170,145,130,155,155,155,185,220,189];
  ctx.font='22px Arial';
  const noteLines=wrap(ctx,data.note||'Không có ghi chú.',tableWidth-48);
  const noteHeight=Math.max(100,60+noteLines.length*31);
  const H=48+102+42+86+100+26+78+96+28+noteHeight+48;
  ctx.canvas.width=W;ctx.canvas.height=H;
  ctx.fillStyle='#0e1726';ctx.fillRect(0,0,W,H);
  roundedRect(ctx,16,16,W-32,H-32,20,'#172235','#2c3950');
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#f8fafc';ctx.font='700 34px Arial';
  ctx.fillText(`BÁO HỌC PHÍ · THÁNG ${monthLabel(data.month)}`,left,86);
  ctx.font='20px Arial';ctx.fillStyle='#aebcd1';ctx.fillText(data.status||'Phiếu học phí học sinh',left,118);
  ctx.textAlign='right';ctx.fillStyle='#9fd4a5';ctx.font='700 29px Arial';ctx.fillText(data.name,W-left,86);
  const labels=['Tên trẻ',`Số buổi đăng ký T${data.previousMonth}`,'Số buổi vắng còn bù',`Số buổi đã bù T${data.previousMonth}`,`Buổi nghỉ T${data.previousMonth}`,`Tổng buổi đã học T${data.previousMonth}`,'Ghi chú','Điều chỉnh học phí','Tổng học phí'];
  const values=[data.name,value(data.previousRegistered),value(data.balance),value(data.madeUp),value(data.absent),value(data.actual),data.note?'Có ghi chú bên dưới':'—',currency(data.adjustment),currency(data.total)];
  let x=left,y=192;
  cols.forEach((w,i)=>{tableCell(ctx,x,y,w,86,labels[i],{header:true});tableCell(ctx,x,y+86,w,100,values[i],{highlight:i===8,small:i===0||i===6||i===7});x+=w;});
  y+=212;
  const bottomLabels=[`Số buổi đăng ký T${monthLabel(data.month)}`,'Học phí 1 buổi','Học phí tháng','Ghi chú / giảm trừ'];
  const bottomValues=[`${value(data.registered)} buổi`,currency(data.unitFee),currency(data.monthly),currency(data.adjustment)];
  const bottomWidths=[440,310,370,384];x=left;
  bottomWidths.forEach((w,i)=>{tableCell(ctx,x,y,w,78,bottomLabels[i],{header:true});tableCell(ctx,x,y+78,w,96,bottomValues[i]);x+=w;});
  y+=202;roundedRect(ctx,left,y,tableWidth,noteHeight,12,'#1b2a35','#526053');
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#a5d6a7';ctx.font='700 21px Arial';ctx.fillText('GHI CHÚ',left+24,y+34);
  ctx.fillStyle='#f8fafc';ctx.font='22px Arial';noteLines.forEach((line,i)=>ctx.fillText(line,left+24,y+67+i*31));
  return H;
}

export async function downloadTuitionJpg(data) {
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Trình duyệt không hỗ trợ xuất ảnh JPG.');
  drawTuitionJpg(ctx,data);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.95));
  if(!blob||blob.type!=='image/jpeg')throw new Error('Không thể tạo ảnh JPG.');
  const href=URL.createObjectURL(blob),link=document.createElement('a');
  const safeName=data.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');
  link.href=href;link.download=`Bao-hoc-phi-${safeName||'hoc-sinh'}-${data.month}.jpg`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
}
