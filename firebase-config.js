import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// GANTI BAGIAN INI DENGAN CONFIG MILIK ANDA DARI FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBYrAqdY-G4lsxMb708UNx2Xt3kRmhV_to",
  authDomain: "rerelaundry-1f927.firebaseapp.com",
  projectId: "rerelaundry-1f927",
  storageBucket: "rerelaundry-1f927.firebasestorage.app",
  messagingSenderId: "41623427336",
  appId: "1:41623427336:web:b98242f0c4f63359fb34bd",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);