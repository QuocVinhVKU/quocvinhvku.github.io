import assert from 'node:assert/strict';
import {createStoredZip,crc32,exportTuitionZip} from '../js/tuition-zip.js';
assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
const entries=[{name:'001-THẢO NHI.jpg',blob:new Blob(['image-one'])},{name:'002-THẢO NHI.jpg',blob:new Blob(['image-two'])}];
const blob=await createStoredZip(entries),bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);
assert.equal(view.getUint32(0,true),0x04034b50);
const end=bytes.length-22,central=view.getUint32(end+16,true);
assert.equal(view.getUint16(end+10,true),2);assert.equal(view.getUint32(central,true),0x02014b50);
let pos=central;
for(const entry of entries){
  const nameLength=view.getUint16(pos+28,true),name=new TextDecoder().decode(bytes.slice(pos+46,pos+46+nameLength)),local=view.getUint32(pos+42,true),size=view.getUint32(pos+24,true);
  assert.equal(name,entry.name);assert.equal(view.getUint16(pos+8,true),0x800);
  const dataStart=local+30+view.getUint16(local+26,true),content=bytes.slice(dataStart,dataStart+size);
  assert.equal(new TextDecoder().decode(content),await entry.blob.text());assert.equal(crc32(content),view.getUint32(pos+16,true));pos+=46+nameLength;
}
let downloads=0;const progress=[];
const result=await exportTuitionZip([{name:'ĐẬU',month:'2026-11'},{name:'ĐẬU',month:'2026-11'}],{createImage:async()=>new Blob(['mock-jpg']),download:async(zip,name)=>{downloads++;assert(name.includes('2026-11'));assert(zip.size>0)},onProgress:(done,total)=>progress.push([done,total])});
assert.equal(result.count,2);assert.equal(downloads,1);assert.deepEqual(progress.at(-1),[2,2]);
await assert.rejects(()=>exportTuitionZip([]),/Không có học sinh/);
await assert.rejects(()=>exportTuitionZip([{name:'A',month:'2026-11'}],{createImage:async()=>{throw Error('render failed')},download:()=>{downloads++}}),/render failed/);
assert.equal(downloads,1,'A failed export must not download a partial ZIP');
console.log('PASS ZIP headers, UTF-8 filenames, CRC, offsets, unique order prefixes, selected month, progress, empty/error handling');
