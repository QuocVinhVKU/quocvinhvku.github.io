import { auth } from "./firebase.js";
import { signInWithEmailAndPassword,signOut,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

export const login=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const logout=()=>signOut(auth);
export function authErrorMessage(error) {
  const code=error?.code||"";
  if (["auth/invalid-credential","auth/invalid-login-credentials","auth/wrong-password","auth/user-not-found"].includes(code)) return "Email hoặc mật khẩu không đúng. Hãy kiểm tra tài khoản trong Firebase Authentication.";
  if (code==="auth/operation-not-allowed") return "Đăng nhập Email/Password chưa được bật trong Firebase Console.";
  if (code==="auth/too-many-requests") return "Tài khoản tạm khóa do thử quá nhiều lần. Hãy chờ một lúc hoặc đặt lại mật khẩu trong Firebase Console.";
  if (code==="auth/user-disabled") return "Tài khoản đã bị vô hiệu hóa trong Firebase Authentication.";
  if (code==="auth/network-request-failed") return "Không kết nối được Firebase Authentication. Hãy kiểm tra mạng, VPN hoặc trình chặn quảng cáo.";
  if (code==="auth/invalid-api-key") return "Firebase API key không hợp lệ hoặc đang bị giới hạn sai domain.";
  return `Không thể đăng nhập (${code||"lỗi không xác định"}).`;
}
export const watchAuth=(callback,onError)=>onAuthStateChanged(auth,async user=>{
  try {
    if(!user)return callback(null,null);
    // Mọi tài khoản Firebase Authentication đều có quyền sử dụng ứng dụng.
    // Không yêu cầu document users/{uid} hoặc custom admin claim.
    callback(user,{id:user.uid,email:user.email,displayName:user.displayName||user.email,role:"authenticated",active:true});
  } catch (error) { onError?.(error); }
});
