import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// --- CẤU HÌNH FIREBASE MỚI ---
// Đã cập nhật theo thông tin bạn cung cấp cho project 'bingo-20f79'
const firebaseConfig = {
  apiKey: "AIzaSyDZNduqi0tFXBVKtcTuGKQkOt7Zknw8e6s",
  authDomain: "bingo-20f79.firebaseapp.com",
  projectId: "bingo-20f79",
  storageBucket: "bingo-20f79.firebasestorage.app",
  messagingSenderId: "739618519373",
  appId: "1:739618519373:web:2c2cc36919f56b3350df04",
  measurementId: "G-C7Y9MR72VM",
  // LƯU Ý QUAN TRỌNG: 
  // URL này được suy luận từ Project ID. Nếu bạn chọn server ở Singapore (asia-southeast1), 
  // hãy đổi thành: "https://bingo-20f79-default-rtdb.asia-southeast1.firebasedatabase.app"
  databaseURL: "https://bingo-20f79-default-rtdb.firebaseio.com"
};

// Khởi tạo app
const app = initializeApp(firebaseConfig);

// Khởi tạo Database với URL tường minh
export const db = getDatabase(app, firebaseConfig.databaseURL);

// Analytics
export const analytics = getAnalytics(app);