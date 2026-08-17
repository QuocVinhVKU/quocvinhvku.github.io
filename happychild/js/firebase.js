import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { initializeFirestore, memoryLocalCache, enableNetwork } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBj14KLG41cxU3swuX7KIfXaH18ZcoeXIU",
  authDomain: "happychild-bff96.firebaseapp.com",
  projectId: "happychild-bff96",
  storageBucket: "happychild-bff96.firebasestorage.app",
  messagingSenderId: "583282219707",
  appId: "1:583282219707:web:dcc10b26e960a141ece79e",
  measurementId: "G-2G2BJQ4KJR"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Dùng cache bộ nhớ để tránh IndexedDB giữ trạng thái offline giữa các lần mở.
export const db = initializeFirestore(firebaseApp, { localCache: memoryLocalCache() });
export const reconnectFirestore = () => enableNetwork(db);
