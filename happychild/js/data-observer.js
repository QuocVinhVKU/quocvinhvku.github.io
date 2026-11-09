import * as sdk from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
import {auth} from './firebase.js?v=20260826-5';
import {readDocumentCache,saveDocumentCache,isQuotaExceeded} from './local-pending.js?v=20261107-sync2';
import {encodeData,decodeData,canonicalData} from './data-codec.js';
import {samePendingRead} from './data-conflict-policy.js?v=20261107-sync2';
export * from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';
let context=null;
const memory=new Map(),fresh=new WeakSet(),specs=new WeakMap();
export const setDataContext=value=>{context=value;};
export const getDataContext=()=>context;
function remember(ref,data,uid=auth.currentUser?.uid){if(!uid)return;const key=`${uid}:${ref.path}`,encoded=data===null?null:encodeData(data,uid);memory.set(key,encoded);saveDocumentCache(uid,ref.path,encoded).catch(console.warn);}
async function cached(path,uid){const key=`${uid}:${path}`;if(memory.has(key))return memory.get(key);const value=await readDocumentCache(uid,path);if(value!==undefined)memory.set(key,value);return value;}
function record(ref,data,ctx){if(ctx&&!ctx.reads.has(ref.path))ctx.reads.set(ref.path,{path:ref.path,value:data===null?null:encodeData(data,ctx.uid)});}
export function doc(...args){const r=sdk.doc(...args);if(args.length===1)fresh.add(r);return r;}
export function collection(...args){const r=sdk.collection(...args);specs.set(r,{path:r.path,clauses:[]});return r;}
export function where(...args){const r=sdk.where(...args);specs.set(r,{kind:'where',args});return r;}
export function orderBy(...args){const r=sdk.orderBy(...args);specs.set(r,{kind:'orderBy',args});return r;}
export function limit(...args){const r=sdk.limit(...args);specs.set(r,{kind:'limit',args});return r;}
export function query(base,...constraints){const r=sdk.query(base,...constraints),spec=specs.get(base);if(spec)specs.set(r,{path:spec.path,clauses:[...spec.clauses,...constraints.map(c=>specs.get(c))]});return r;}
function captureSnapshot(snap,ctx,uid){record(snap.ref,snap.exists()?snap.data():null,ctx);remember(snap.ref,snap.exists()?snap.data():null,uid);return snap;}
export async function getDoc(ref){const ctx=context,uid=ctx?.uid||auth.currentUser?.uid;try{return captureSnapshot(await sdk.getDoc(ref),ctx,uid);}catch(e){if(ctx){const before=await cached(ref.path,uid);if(before!==undefined)ctx.reads.set(ref.path,{path:ref.path,value:before});else ctx.unknown=true;}throw e;}}
export const getDocFromServer=async ref=>captureSnapshot(await sdk.getDocFromServer(ref),context,auth.currentUser?.uid);
function queryCache(q,snap,uid){const spec=specs.get(q);if(!uid||!spec||!spec.clauses.every(Boolean)||snap.metadata?.fromCache||snap.metadata?.hasPendingWrites)return;const value={spec:encodeData(spec,uid),rows:snap.docs.map(d=>({path:d.ref.path,value:encodeData(d.data(),uid)}))};const key='query:'+canonicalData(value.spec);memory.set(`${uid}:${key}`,value);saveDocumentCache(uid,key,value).catch(console.warn);}
async function readQuery(q,reader){const ctx=context,uid=ctx?.uid||auth.currentUser?.uid;let snap;try{snap=await reader(q);}catch(e){if(ctx){const spec=specs.get(q);let before;if(spec&&spec.clauses.every(Boolean)){before=await cached('query:'+canonicalData(encodeData(spec,uid)),uid);if(!before)before=await cached('query:'+canonicalData(encodeData({path:spec.path,clauses:[]},uid)),uid);}if(before)ctx.queries.push(before);else ctx.unknown=true;}throw e;}snap.docs.forEach(d=>{remember(d.ref,d.data(),uid);record(d.ref,d.data(),ctx);});queryCache(q,snap,uid);if(ctx){const spec=specs.get(q);if(spec&&spec.clauses.every(Boolean))ctx.queries.push({spec:encodeData(spec,ctx.uid),rows:snap.docs.map(d=>({path:d.ref.path,value:encodeData(d.data(),ctx.uid)}))});else ctx.unknown=true;}return snap;}
export const getDocs=q=>readQuery(q,sdk.getDocs);
export const getDocsFromServer=q=>readQuery(q,sdk.getDocsFromServer);
export function onSnapshot(ref,...args){const uid=auth.currentUser?.uid,index=args.findIndex(v=>typeof v==='function');if(index>=0){const cb=args[index];args[index]=snap=>{if(snap.docs){snap.docs.forEach(d=>remember(d.ref,d.data(),uid));queryCache(ref,snap,uid);}else remember(snap.ref,snap.exists()?snap.data():null,uid);cb(snap);};}return sdk.onSnapshot(ref,...args);}
async function baseline(ref,ctx){
 if(!ctx||ctx.reads.has(ref.path))return;
 if(fresh.has(ref)){ctx.reads.set(ref.path,{path:ref.path,value:null});return;}
 const before=await cached(ref.path,ctx.uid);
 if(before!==undefined){ctx.reads.set(ref.path,{path:ref.path,value:before});return;}
 try{const snap=await sdk.getDocFromServer(ref);captureSnapshot(snap,ctx,ctx.uid);}catch(e){ctx.unknown=true;throw e;}
}
async function write(refs,run){const ctx=context;if(!ctx)return run();if(auth.currentUser?.uid!==ctx.uid)throw Error('Tài khoản đã thay đổi.');for(const ref of refs)await baseline(ref,ctx);ctx.attempted++;try{const result=await run();ctx.committed++;return result;}catch(e){if(!isQuotaExceeded(e))ctx.ambiguous=true;throw e;}}
export const setDoc=(ref,...args)=>write([ref],()=>sdk.setDoc(ref,...args));
export const updateDoc=(ref,...args)=>write([ref],()=>sdk.updateDoc(ref,...args));
export const deleteDoc=ref=>write([ref],()=>sdk.deleteDoc(ref));
export async function addDoc(col,data){const ref=doc(col);await setDoc(ref,data);return ref;}
export function writeBatch(db){const batch=sdk.writeBatch(db),refs=[];const proxy={};for(const name of ['set','update','delete'])proxy[name]=(ref,...args)=>{refs.push(ref);batch[name](ref,...args);return proxy;};proxy.commit=()=>write(refs,()=>batch.commit());return proxy;}
export async function runTransaction(db,callback,...options){
 const ctx=context;if(!ctx)return sdk.runTransaction(db,callback,...options);
 let wrote=false;
 try{const result=await sdk.runTransaction(db,async tx=>{
  const proxy={get:async ref=>{try{return captureSnapshot(await tx.get(ref),ctx,ctx.uid);}catch(e){const before=await cached(ref.path,ctx.uid);if(before!==undefined)ctx.reads.set(ref.path,{path:ref.path,value:before});else ctx.unknown=true;throw e;}}};
  for(const name of ['set','update','delete'])proxy[name]=(ref,...args)=>{wrote=true;ctx.attempted++;if(!ctx.reads.has(ref.path)){const before=memory.get(`${ctx.uid}:${ref.path}`);if(fresh.has(ref))ctx.reads.set(ref.path,{path:ref.path,value:null});else if(before!==undefined)ctx.reads.set(ref.path,{path:ref.path,value:before});else ctx.unknown=true;}tx[name](ref,...args);return proxy;};
  return callback(proxy);
 },...options);if(wrote)ctx.committed++;return result;}catch(e){if(wrote&&!isQuotaExceeded(e))ctx.ambiguous=true;throw e;}
}
export async function checkDataPreconditions(entry,db,user){
 for(const read of entry.reads||[]){const snap=await sdk.getDocFromServer(sdk.doc(db,read.path)),actual=snap.exists()?encodeData(snap.data(),user.uid):null;if(!samePendingRead(entry,read.path,read.value,actual))return `Dữ liệu đã đổi: ${read.path}`;}
 for(const q of entry.queries||[]){const spec=decodeData(q.spec,user,sdk.Timestamp),clauses=spec.clauses.map(c=>sdk[c.kind](...c.args)),ref=sdk.query(sdk.collection(db,spec.path),...clauses);const snap=await sdk.getDocsFromServer(ref);const rows=snap.docs.map(d=>({path:d.ref.path,value:encodeData(d.data(),user.uid)})).sort((a,b)=>a.path.localeCompare(b.path));const expected=[...q.rows].sort((a,b)=>a.path.localeCompare(b.path));if(canonicalData(rows)!==canonicalData(expected))return `Danh sách đã đổi: ${spec.path}`;}
 return '';
}
