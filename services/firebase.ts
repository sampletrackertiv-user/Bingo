import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDZNduqi0tFXBVKtcTuGKQkOt7Zknw8e6s",
  authDomain: "bingo-20f79.firebaseapp.com",
  projectId: "bingo-20f79",
  storageBucket: "bingo-20f79.firebasestorage.app",
  messagingSenderId: "739618519373",
  appId: "1:739618519373:web:2c2cc36919f56b3350df04",
  measurementId: "G-C7Y9MR72VM",
  // URL này quan trọng cho các dự án không nằm ở us-central1
  databaseURL: "https://bingo-20f79-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Khởi tạo app
const app = initializeApp(firebaseConfig);

// Khởi tạo Database
// Lưu ý: Việc truyền URL vào getDatabase là cần thiết nếu region khác mặc định (us-central1)
let dbInstance;
try {
  dbInstance = getDatabase(app, firebaseConfig.databaseURL);
} catch (error) {
  console.error("FIREBASE ERROR: Không thể khởi tạo Database.", error);
  // Fallback: Thử khởi tạo không tham số (đôi khi config tự động nhận diện được)
  try {
     console.warn("Retrying database initialization without explicit URL...");
     dbInstance = getDatabase(app);
  } catch (retryError) {
     console.error("FATAL: Database initialization completely failed.", retryError);
  }
}

export const db = dbInstance;

// Analytics (Optional)
let analyticsInstance;
try {
  analyticsInstance = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics disabled.");
}

export const analytics = analyticsInstance;