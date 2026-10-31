// ZIP STORE: JPEG is already compressed; no CDN or external ZIP dependency.
const crcTable=Uint32Array.from({length:256},(_,n)=>{
  for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;
  return n>>>0;
});
export function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
export async function createStoredZip(entries){
  if(entries.length>65535)throw new Error('Quá nhiều ảnh trong file ZIP.');
  const parts=[],central=[];let offset=0,centralSize=0;
  for(const entry of entries){
    const name=new TextEncoder().encode(entry.name),bytes=new Uint8Array(await entry.blob.arrayBuffer()),crc=crc32(bytes),size=bytes.length;
    if(name.length>65535||offset+size+name.length+30>0xffffffff)throw new Error('File ZIP vượt giới hạn 4 GB.');
    const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);
    lv.setUint16(12,33,true);lv.setUint32(14,crc,true);lv.setUint32(18,size,true);lv.setUint32(22,size,true);lv.setUint16(26,name.length,true);local.set(name,30);
    parts.push(local,entry.blob);
    const directory=new Uint8Array(46+name.length),dv=new DataView(directory.buffer);
    dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(8,0x800,true);dv.setUint16(14,33,true);
    dv.setUint32(16,crc,true);dv.setUint32(20,size,true);dv.setUint32(24,size,true);dv.setUint16(28,name.length,true);dv.setUint32(42,offset,true);directory.set(name,46);
    central.push(directory);centralSize+=directory.length;offset+=local.length+size;
  }
  if(offset+centralSize>0xffffffff)throw new Error('File ZIP vượt giới hạn 4 GB.');
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
export async function exportTuitionZip(data,{onProgress=()=>{},createImage,download}={}){
  if(!data.length)throw new Error('Không có học sinh có phiếu học phí trong tháng đã chọn.');
  const {createTuitionJpgBlob,tuitionJpgFilename}=await import('./tuition-jpg.js?v=20261031-zip1');
  const entries=[];
  for(let i=0;i<data.length;i++){
    onProgress(i,data.length);
    const blob=await (createImage||createTuitionJpgBlob)(data[i]);
    entries.push({name:`${String(i+1).padStart(3,'0')}-${tuitionJpgFilename(data[i])}`,blob});
    onProgress(i+1,data.length);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  const zip=await createStoredZip(entries),filename=`Bao-hoc-phi-${data[0].month}-tat-ca-hoc-sinh.zip`;
  if(download)await download(zip,filename);
  else{
    const href=URL.createObjectURL(zip),link=document.createElement('a');
    link.href=href;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  }
  return {count:entries.length,filename,size:zip.size};
}
