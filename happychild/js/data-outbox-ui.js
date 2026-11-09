import {auth} from './firebase.js?v=20260826-5';
import {listPending} from './local-pending.js?v=20261107-sync2';
import {syncDataOutbox} from './data-outbox.js?v=20261107-sync2';
let banner,lastResult='',busy=false;
export async function refreshDataNotice(){
 const uid=auth.currentUser?.uid;
 const entries=uid?(await listPending(uid)).filter(e=>e.kind==='data-action'):[];
 if(auth.currentUser?.uid!==uid)return;
 if(!banner){banner=document.createElement('aside');banner.className='notice warning';banner.setAttribute('aria-live','polite');document.querySelector('#content')?.before(banner);}
 banner.replaceChildren();banner.hidden=!entries.length;if(!entries.length)return;
 const text=document.createElement('span');text.textContent=`${entries.length} yêu cầu đang lưu trên thiết bị. Trạng thái xin nghỉ có nhãn chờ đồng bộ chỉ là bản local, chưa xác nhận trên Firebase. `;banner.append(text);
 const version=document.createElement('small');version.textContent='Đồng bộ v20261107-sync2';banner.append(version);
 if(lastResult){const result=document.createElement('p');result.textContent=lastResult;banner.append(result);}
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Xem yêu cầu chờ đồng bộ';details.open=Boolean(lastResult);details.append(summary);
 for(const e of entries){const row=document.createElement('p');const session=e.name==='updateSessionStatus'?e.args?.[1]:null;row.textContent=`${e.title}${session?.dateKey?` · ${session.dateKey} ${session.startTime||''}`:''} · ${new Date(e.savedAt).toLocaleString('vi-VN')} · ${e.status==='pending'?'Chờ tự đồng bộ':e.status==='conflict'?'Chờ đối chiếu lại với server':'Cần kiểm tra, không tự chạy lại'}${e.error?' — '+e.error:''}${e.lastAttemptAt?` · Thử gần nhất: ${new Date(e.lastAttemptAt).toLocaleString('vi-VN')}`:''}`;details.append(row);}
 const button=document.createElement('button');button.type='button';button.disabled=busy;button.textContent=busy?'Đang đối chiếu…':'Thử đồng bộ';button.onclick=async()=>{busy=true;button.disabled=true;button.textContent='Đang đối chiếu…';try{const result=await syncDataOutbox(auth.currentUser);lastResult=`${new Date().toLocaleTimeString('vi-VN')}: Đã đồng bộ ${result.synced}; ${result.review?'còn yêu cầu cần đối chiếu.':result.pending?'chưa gửi được, xem lỗi mới nhất bên dưới.':'đã kiểm tra hàng đợi.'}`;}catch(e){lastResult='Không thể kiểm tra hàng đợi: '+e.message;}finally{busy=false;await refreshDataNotice();}};details.append(button);banner.append(details);
}
window.addEventListener('happychild-pending-changed',()=>refreshDataNotice().catch(console.error));
window.addEventListener('online',()=>resumeDataPending());
export async function resumeDataPending(){try{await refreshDataNotice();await syncDataOutbox(auth.currentUser);await refreshDataNotice();}catch(e){console.warn('Chưa đồng bộ được yêu cầu local',e);}}
