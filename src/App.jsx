import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, LogOut, Plus, FileText, 
  Settings, LayoutDashboard, FireExtinguisher, Search, Users,
  CheckCircle, XCircle, ClipboardList, ArrowRightLeft, Archive, Edit, Filter,
  UserPlus, Trash2, Phone, Menu, X, MapPin, DatabaseBackup, Loader2, Calendar,
  MessageCircle, CopyPlus, Target, Activity
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';

// ==========================================
// 🔥 إعدادات قاعدة بيانات فايربيس (Firebase) 🔥
// ==========================================
let app, auth, db, appId;

try {
  const firebaseConfig = {
    apiKey: "AIzaSyDNy82azv_tH5SNe_52eWwwHQATYtgXgh4",
    authDomain: "fire-tracker-ed183.firebaseapp.com",
    projectId: "fire-tracker-ed183",
    storageBucket: "fire-tracker-ed183.firebasestorage.app",
    messagingSenderId: "419744627127",
    appId: "1:419744627127:web:16516d132fee41bdbf5032"
  };

  app = initializeApp(firebaseConfig);
  appId = 'fire-tracker-ed183';

  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
    try { enableIndexedDbPersistence(db).catch(() => {}); } catch(e) {}
  }
} catch (e) {
  console.error("خطأ في تهيئة فايربيس:", e);
}
function MosqueLogo({ className = "w-10 h-10 text-red-600" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" className={className}>
      <path fill="currentColor" d="M 241.73 29.02 Q 240.89 28.75 240.36 28.81 A 1.24 1.24 0.0 0 0 239.27 29.99 Q 238.87 38.74 236.96 47.88 C 236.28 51.10 233.97 52.96 233.48 56.21 Q 233.39 56.80 233.81 57.21 C 235.61 59.01 237.07 61.14 236.91 63.82 Q 236.77 66.07 237.05 68.29 A 1.44 1.41 68.5 0 1 236.49 69.61 L 225.90 77.41 A 1.37 1.36 -29.7 0 0 225.45 79.03 Q 227.34 83.56 228.71 87.64 Q 229.43 89.78 231.04 91.27 C 233.44 93.49 233.94 96.77 234.44 99.79 A 0.97 0.96 77.7 0 0 235.65 100.57 Q 236.87 100.22 237.04 98.91 Q 237.86 92.46 234.62 88.80 Q 234.17 88.30 234.40 87.67 Q 235.74 83.96 236.86 80.08 C 237.60 77.54 240.17 76.74 242.41 78.13 A 2.40 2.37 7.6 0 1 243.46 79.49 L 245.99 88.07 Q 246.13 88.54 245.78 88.88 C 243.26 91.29 243.65 94.66 243.40 97.79 Q 243.28 99.29 244.19 100.44 Q 244.41 100.73 244.80 100.73 Q 245.78 100.75 245.98 99.79 L 247.29 93.61 A 2.18 2.15 79.1 0 1 248.19 92.26 Q 251.26 90.18 252.03 87.05 Q 252.97 83.25 254.81 79.16 A 1.46 1.46 0.0 0 0 254.21 77.29 C 252.32 76.20 251.36 74.49 249.43 73.41 Q 246.44 71.74 243.76 68.90 Q 243.39 68.50 243.46 67.97 Q 243.67 66.21 243.38 64.49 C 242.93 61.77 244.60 59.10 246.51 57.34 A 1.11 1.08 -26.3 0 0 246.85 56.37 C 246.36 53.23 244.44 51.15 243.66 48.19 Q 241.19 38.79 241.73 29.02 Q 242.72 34.77 243.48 40.48 Q 244.65 49.38 248.75 56.35 A 1.08 1.08 0.0 0 1 248.36 57.84 Q 244.58 60.02 244.68 64.24 C 244.80 68.97 247.83 71.48 251.85 72.71 A 0.82 0.76 -11.5 0 1 252.16 72.90 L 256.34 77.41 A 1.48 1.47 39.2 0 1 256.52 79.16 Q 254.54 82.45 253.54 86.56 Q 253.01 88.75 251.78 90.46 C 250.64 92.03 249.11 93.28 248.37 95.10 Q 247.14 98.15 246.64 101.57 A 1.34 1.34 0.0 0 1 244.52 102.45 C 243.05 101.38 242.07 99.76 242.13 97.85 Q 242.30 92.31 243.72 88.58 C 244.65 86.13 243.10 82.73 242.34 80.42 C 241.82 78.84 239.49 78.03 238.59 79.86 C 237.17 82.74 235.84 86.17 237.02 89.45 Q 238.45 93.39 238.46 97.72 Q 238.47 99.94 236.87 101.49 L 236.21 102.13 Q 234.22 104.06 233.70 101.33 Q 232.51 95.04 230.98 93.36 Q 228.19 90.28 227.25 87.18 Q 226.02 83.13 223.97 79.29 Q 223.40 78.23 224.23 77.35 Q 225.97 75.48 227.79 73.48 C 229.14 72.00 231.34 71.83 232.91 70.66 Q 236.57 67.93 235.62 62.58 Q 235.11 59.73 232.03 57.53 Q 231.40 57.08 231.76 56.39 Q 235.73 48.80 236.67 43.11 Q 237.85 36.02 238.77 27.64 A 1.22 1.22 0.0 0 1 240.39 26.63 Q 242.06 27.23 241.73 29.02 Z"></path>
      <path fill="currentColor" d="M 241.73 29.02 Q 241.19 38.79 243.66 48.19 C 244.44 51.15 246.36 53.23 246.85 56.37 A 1.11 1.08 -26.3 0 1 246.51 57.34 C 244.60 59.10 242.93 61.77 243.38 64.49 Q 243.67 66.21 243.46 67.97 Q 243.39 68.50 243.76 68.90 Q 246.44 71.74 249.43 73.41 C 251.36 74.49 252.32 76.20 254.21 77.29 A 1.46 1.46 0.0 0 1 254.81 79.16 Q 252.97 83.25 252.03 87.05 Q 251.26 90.18 248.19 92.26 A 2.18 2.15 79.1 0 0 247.29 93.61 L 245.98 99.79 Q 245.78 100.75 244.80 100.73 Q 244.41 100.73 244.19 100.44 Q 243.28 99.29 243.40 97.79 C 243.65 94.66 243.26 91.29 245.78 88.88 Q 246.13 88.54 245.99 88.07 L 243.46 79.49 A 2.40 2.37 7.6 0 0 242.41 78.13 C 240.17 76.74 237.60 77.54 236.86 80.08 Q 235.74 83.96 234.40 87.67 Q 234.17 88.30 234.62 88.80 Q 237.86 92.46 237.04 98.91 Q 236.87 100.22 235.65 100.57 A 0.97 0.96 77.7 0 1 234.44 99.79 C 233.94 96.77 233.44 93.49 231.04 91.27 Q 229.43 89.78 228.71 87.64 Q 227.34 83.56 225.45 79.03 A 1.37 1.36 -29.7 0 1 225.90 77.41 L 236.49 69.61 A 1.44 1.41 68.5 0 0 237.05 68.29 Q 236.77 66.07 236.91 63.82 C 237.07 61.14 235.61 59.01 233.81 57.21 Q 233.39 56.80 233.48 56.21 C 233.97 52.96 236.28 51.10 236.96 47.88 Q 238.87 38.74 239.27 29.99 A 1.24 1.24 0.0 0 1 240.36 28.81 Q 240.89 28.75 241.73 29.02 Z"></path>
      <path fill="currentColor" d="M 216.51 145.09 L 216.17 147.53 A 2.04 2.04 0.0 0 1 214.87 149.17 C 176.35 163.64 139.40 184.30 109.64 211.56 C 94.32 225.60 80.62 241.96 70.74 260.06 Q 41.82 313.06 58.39 373.77 Q 59.04 376.15 58.90 378.62 Q 58.39 387.57 58.49 396.47 Q 58.54 400.25 62.48 400.17 Q 81.08 399.79 99.56 400.03 A 0.61 0.60 17.7 0 0 100.05 399.78 Q 100.38 399.32 100.06 399.01 Q 93.37 392.55 88.29 385.71 Q 86.72 383.61 86.95 380.80 Q 87.29 376.60 87.96 372.50 C 90.21 358.69 99.68 344.16 115.78 346.53 C 126.74 348.15 135.37 356.36 141.75 365.57 C 145.23 370.59 144.73 378.58 139.28 382.03 C 135.08 384.68 128.93 384.54 125.38 380.61 Q 121.08 375.86 116.89 371.47 Q 114.39 368.84 111.52 371.63 C 109.63 373.46 109.93 375.94 111.65 377.77 Q 124.90 391.88 136.55 405.64 Q 139.23 408.81 139.82 413.78 C 140.69 421.05 133.76 425.11 127.30 425.07 Q 95.95 424.88 63.18 425.12 Q 56.52 425.16 52.40 423.82 C 41.91 420.38 36.21 410.63 36.10 399.52 Q 36.01 389.75 36.12 380.10 Q 36.17 376.13 35.13 372.31 C 24.42 332.90 27.61 292.44 44.53 256.62 C 57.23 229.73 77.24 206.00 100.24 186.53 C 132.72 159.04 171.30 137.95 211.54 123.19 A 0.82 0.81 78.1 0 0 212.07 122.37 L 211.67 116.51 A 1.36 1.36 0.0 0 1 213.77 115.27 L 217.77 117.85 A 0.64 0.64 0.0 0 0 218.73 117.49 Q 219.96 113.23 223.81 110.86 A 1.15 1.15 0.0 0 1 225.54 111.62 Q 226.17 114.80 227.80 117.52 A 1.06 1.05 77.2 0 0 228.57 118.01 L 230.56 118.25 A 1.57 1.57 0.0 0 1 231.95 119.81 L 231.96 138.19 A 1.81 1.80 71.8 0 1 231.23 139.64 Q 229.08 141.23 225.55 139.66 Q 224.77 139.32 224.26 139.99 Q 222.50 142.29 222.15 145.13 A 1.54 1.53 17.9 0 1 219.88 146.29 L 217.13 144.78 A 0.42 0.42 0.0 0 0 216.51 145.09 Z M 224.38 113.62 A 1.08 1.08 0.0 0 0 222.72 113.22 Q 219.86 115.52 219.68 119.86 A 0.63 0.63 0.0 0 1 218.68 120.35 L 214.35 117.24 A 0.97 0.97 0.0 0 0 212.83 118.15 L 213.46 123.00 A 1.25 1.24 76.4 0 1 212.66 124.32 C 170.99 139.58 130.87 161.81 97.27 191.07 C 71.09 213.86 49.97 242.08 38.60 274.72 Q 35.04 284.93 33.12 295.71 Q 26.89 330.83 34.53 365.49 C 35.64 370.51 37.28 375.36 37.30 380.48 Q 37.33 387.17 37.17 394.67 Q 36.97 403.53 38.53 408.04 C 41.60 416.91 50.13 423.38 59.69 423.39 Q 93.36 423.44 127.60 423.42 Q 133.79 423.42 137.14 419.03 C 139.41 416.06 138.17 410.51 136.30 407.97 C 130.93 400.68 124.35 393.81 118.09 386.88 Q 114.28 382.67 110.42 378.37 C 106.08 373.53 112.54 365.63 117.43 370.13 Q 121.59 373.96 125.09 378.35 C 127.80 381.76 131.78 383.35 136.03 382.01 C 142.80 379.88 144.41 371.26 140.43 366.00 C 133.53 356.88 124.80 348.01 112.54 347.85 C 104.01 347.74 97.27 352.98 93.44 360.18 Q 89.56 367.47 88.57 378.10 C 88.33 380.63 87.97 382.86 89.62 385.03 Q 95.30 392.48 103.49 400.76 Q 104.35 401.63 103.13 401.62 Q 84.99 401.58 65.57 401.68 C 61.90 401.70 57.44 401.85 57.35 396.83 Q 57.17 387.03 57.63 378.64 Q 57.78 375.97 57.01 373.03 C 48.00 338.60 49.02 303.21 63.60 271.02 Q 71.41 253.76 83.04 238.45 Q 86.63 233.72 90.05 229.73 Q 105.50 211.68 125.67 196.07 Q 143.03 182.62 162.99 171.51 Q 187.55 157.83 213.49 147.89 A 2.33 2.31 82.0 0 0 214.97 145.91 L 215.20 142.99 A 0.51 0.51 0.0 0 1 215.97 142.59 L 218.56 144.11 Q 220.65 145.34 221.26 143.00 Q 221.97 140.26 224.10 138.07 Q 224.46 137.70 224.95 137.86 L 228.30 138.91 A 1.63 1.63 0.0 0 0 230.29 138.01 Q 230.72 137.02 230.64 135.89 Q 230.10 128.31 230.72 121.65 A 1.55 1.55 0.0 0 0 229.22 119.95 C 228.24 119.92 227.31 119.71 226.84 118.76 Q 225.56 116.25 224.38 113.62 Z"></path>
      <path fill="currentColor" d="M 262.94 144.74 L 260.08 146.30 A 1.43 1.43 0.0 0 1 257.99 145.31 Q 257.44 142.46 255.79 139.97 A 0.94 0.94 0.0 0 0 254.64 139.62 C 252.56 140.45 250.07 141.10 248.38 139.19 Q 248.02 138.78 248.02 138.24 L 248.15 119.98 Q 248.16 118.11 250.03 118.08 L 251.40 118.05 Q 251.86 118.04 252.10 117.65 Q 253.77 114.92 254.56 111.62 A 1.16 1.16 0.0 0 1 256.30 110.91 Q 260.19 113.35 261.27 117.49 A 0.67 0.67 0.0 0 0 262.30 117.88 L 266.08 115.28 A 1.44 1.43 74.4 0 1 268.32 116.55 L 267.99 122.27 A 1.06 1.05 -78.2 0 0 268.68 123.33 Q 309.58 138.10 346.74 162.03 C 382.52 185.08 415.60 216.00 434.48 254.52 Q 453.15 292.61 450.83 335.26 Q 449.77 354.71 444.41 374.45 Q 443.99 375.97 444.04 377.35 Q 444.65 394.03 445.63 412.81 A 1.65 1.65 0.0 0 1 443.99 414.55 L 425.50 414.65 A 1.77 1.76 -2.4 0 1 423.73 413.03 Q 422.35 394.81 421.16 378.46 Q 420.98 376.00 421.74 373.25 C 432.48 334.17 428.60 295.30 409.18 259.94 C 393.96 232.21 370.14 208.65 343.65 190.07 C 319.30 172.98 292.88 159.83 264.83 149.03 Q 263.93 148.69 263.88 147.74 L 263.74 145.18 A 0.54 0.54 0.0 0 0 262.94 144.74 Z M 261.05 120.36 A 0.42 0.42 0.0 0 1 260.40 120.01 Q 260.42 115.58 256.88 113.09 Q 256.00 112.47 255.56 113.45 L 253.16 118.78 Q 252.90 119.35 252.29 119.47 L 250.21 119.88 A 1.21 1.20 84.7 0 0 249.24 121.05 L 249.22 137.00 A 1.98 1.97 -8.0 0 0 251.75 138.90 L 254.57 138.07 Q 255.94 137.67 256.72 138.87 Q 258.09 140.97 258.54 143.17 A 1.89 1.89 0.0 0 0 261.55 144.30 Q 262.38 143.66 263.25 143.13 Q 265.27 141.88 264.92 144.23 C 264.63 146.22 265.37 147.63 267.24 148.34 C 306.37 163.31 343.00 183.85 373.17 212.26 Q 377.80 216.62 385.29 224.57 C 390.57 230.17 395.21 236.26 399.71 242.48 C 409.37 255.82 417.95 272.17 422.66 288.60 C 430.69 316.67 430.46 344.82 423.15 372.76 C 421.92 377.45 422.64 382.55 423.05 387.28 C 423.75 395.21 424.02 403.06 424.63 411.13 A 2.34 2.32 85.8 0 0 427.11 413.28 Q 434.69 412.78 442.66 413.30 A 1.74 1.74 0.0 0 0 444.51 411.47 Q 443.64 395.30 442.85 378.91 Q 442.69 375.59 443.53 372.36 Q 449.33 350.00 449.70 326.89 Q 450.21 295.21 438.50 266.67 Q 430.21 246.46 418.32 229.88 Q 406.56 213.50 391.51 199.00 Q 374.60 182.70 354.76 169.12 Q 315.33 142.14 267.75 124.39 A 1.58 1.57 -76.4 0 1 266.74 122.72 L 267.23 118.70 A 1.30 1.29 76.1 0 0 265.21 117.48 L 261.05 120.36 Z"></path>
      <path fill="currentColor" d="M 239.81 190.76 Q 225.97 198.58 212.18 205.55 Q 195.84 213.80 178.71 224.33 Q 158.94 236.46 142.84 252.54 A 1.46 1.45 -39.8 0 1 140.61 252.34 Q 134.14 242.95 123.02 239.81 A 1.56 1.56 0.0 0 1 122.25 237.30 Q 125.43 233.52 128.98 230.02 C 160.03 199.30 199.87 179.14 239.77 162.04 A 1.15 1.15 0.0 0 1 240.69 162.04 Q 267.11 173.13 291.43 186.33 C 317.58 200.53 342.00 218.27 361.43 240.79 A 1.80 1.80 0.0 0 1 360.49 243.71 Q 349.86 246.25 342.76 255.39 A 1.56 1.55 -47.3 0 1 340.39 255.49 C 323.71 237.48 302.81 223.75 280.10 211.87 Q 258.60 200.63 240.69 190.75 Q 240.25 190.51 239.81 190.76 Z M 239.69 189.09 A 1.01 0.99 -44.5 0 1 240.66 189.09 Q 260.84 200.13 280.50 210.25 C 286.09 213.12 291.54 216.56 297.20 219.84 Q 311.60 228.19 325.98 239.78 C 331.20 243.99 336.15 249.03 340.68 253.93 A 1.00 1.00 0.0 0 0 342.19 253.88 Q 348.95 245.59 359.35 242.42 A 0.80 0.79 61.4 0 0 359.72 241.15 Q 352.80 232.86 344.26 225.08 C 325.30 207.80 303.51 194.01 280.82 182.45 Q 259.23 171.47 241.16 164.09 Q 240.11 163.66 239.00 164.12 Q 214.98 174.07 188.75 188.32 Q 179.79 193.19 169.18 199.99 Q 143.84 216.24 124.10 237.10 A 0.96 0.96 0.0 0 0 124.53 238.69 Q 134.44 241.55 140.57 250.14 A 1.78 1.78 0.0 0 0 143.34 250.29 Q 146.31 246.98 149.49 244.18 C 159.72 235.17 171.38 226.86 183.58 219.57 Q 195.21 212.63 199.66 210.36 Q 221.15 199.43 239.69 189.09 Z"></path>
      <path fill="currentColor" d="M 225.22 282.06 L 243.27 282.04 A 0.73 0.73 0.0 0 0 244.00 281.30 Q 243.95 270.36 244.04 257.74 C 244.10 248.41 254.53 243.46 262.00 249.18 C 265.61 251.95 266.31 255.80 266.22 260.43 Q 266.02 270.82 266.26 281.45 A 0.69 0.68 88.7 0 0 266.95 282.12 L 273.17 282.06 Q 273.84 282.05 273.85 281.37 Q 273.95 269.70 274.01 258.18 C 274.05 250.63 280.84 244.28 288.47 247.17 Q 296.06 250.04 296.04 258.50 Q 296.01 270.38 296.08 281.64 A 0.42 0.42 0.0 0 0 296.50 282.06 L 303.25 282.06 Q 303.84 282.06 303.84 281.48 Q 303.79 269.67 303.84 258.22 C 303.91 242.93 325.75 242.66 326.01 258.36 Q 326.20 269.94 325.97 281.56 A 0.48 0.48 0.0 0 0 326.45 282.05 L 339.74 282.05 A 0.85 0.85 0.0 0 0 340.58 281.10 C 339.18 269.01 344.07 257.70 354.07 251.79 C 364.48 245.64 379.02 246.90 386.37 257.18 C 396.21 270.93 394.85 289.45 381.77 300.55 C 375.72 305.68 368.97 307.09 361.02 307.08 Q 232.75 306.98 102.16 307.11 C 96.17 307.11 91.66 306.37 88.87 300.19 C 85.17 292.01 90.08 282.06 99.77 282.17 Q 109.04 282.28 118.47 282.17 Q 119.16 282.16 119.17 281.47 Q 119.22 276.61 119.12 272.63 Q 119.04 269.80 116.52 268.17 C 113.81 266.42 110.77 269.18 109.68 271.52 C 107.27 276.70 105.37 281.48 99.02 281.71 Q 94.09 281.89 90.72 277.96 C 87.45 274.16 86.87 269.42 88.70 264.81 C 92.56 255.08 100.29 247.05 110.57 245.10 Q 120.01 243.31 127.42 248.08 C 139.63 255.94 141.32 267.53 140.59 281.17 A 0.87 0.87 0.0 0 0 141.46 282.09 Q 168.50 282.17 197.58 282.16 Q 202.29 282.15 202.10 277.53 C 201.97 274.39 200.77 272.76 197.45 272.72 Q 180.18 272.49 161.35 272.68 Q 158.16 272.71 155.90 271.44 C 150.67 268.52 147.82 263.44 149.29 257.46 C 150.36 253.10 154.18 247.86 159.21 247.89 Q 178.36 247.99 197.69 247.90 Q 203.58 247.87 207.85 249.45 C 221.84 254.64 225.46 268.00 224.63 281.42 Q 224.59 282.06 225.22 282.06 Z M 119.86 283.77 Q 110.05 284.07 100.01 283.85 C 91.17 283.66 87.06 291.81 90.14 299.28 C 92.31 304.55 96.32 305.84 101.91 305.64 C 112.16 305.27 122.66 305.75 133.34 305.75 Q 234.53 305.76 336.50 305.57 Q 349.13 305.55 361.80 305.52 Q 368.46 305.50 372.20 304.22 Q 386.57 299.29 390.56 283.37 C 392.66 275.01 390.48 265.85 385.56 258.38 Q 383.79 255.69 381.02 253.89 Q 369.79 246.57 357.10 251.85 C 345.02 256.88 340.12 270.71 342.14 282.98 Q 342.29 283.85 341.40 283.84 L 325.08 283.61 A 0.31 0.30 90.0 0 1 324.78 283.30 Q 324.74 272.02 324.77 259.19 Q 324.78 256.39 323.94 254.25 C 322.05 249.47 316.37 246.79 311.64 248.55 C 307.20 250.20 304.96 254.41 304.96 259.20 Q 304.97 272.10 304.98 283.27 A 0.26 0.26 0.0 0 1 304.71 283.53 L 295.42 283.51 A 0.57 0.57 0.0 0 1 294.85 282.93 Q 294.97 270.92 295.04 259.17 Q 295.05 256.67 294.38 254.58 C 292.50 248.78 284.52 245.74 279.51 249.49 Q 275.25 252.67 275.13 258.00 Q 274.84 270.00 275.05 283.02 Q 275.06 283.51 274.57 283.51 L 265.53 283.62 Q 265.12 283.63 265.13 283.21 Q 265.36 270.46 265.26 259.01 C 265.14 245.06 245.41 244.23 245.15 258.21 Q 244.91 270.91 245.11 282.92 Q 245.12 283.54 244.50 283.54 L 223.95 283.56 A 0.74 0.74 0.0 0 1 223.21 282.76 Q 224.14 272.76 221.37 264.60 C 219.00 257.64 213.55 253.10 206.86 250.74 Q 202.90 249.34 196.53 249.39 Q 177.16 249.56 159.30 249.56 C 157.02 249.56 155.21 250.29 153.71 252.02 C 147.03 259.68 151.15 271.16 161.76 271.06 Q 178.24 270.90 196.86 271.09 Q 204.03 271.16 203.35 279.01 C 203.10 281.97 201.04 283.55 198.12 283.58 C 179.82 283.80 160.73 283.71 140.55 283.72 Q 139.36 283.72 139.38 282.52 Q 139.49 275.93 138.88 269.54 C 137.27 252.42 120.51 240.25 104.06 249.04 Q 94.32 254.24 89.98 265.59 C 87.58 271.88 91.03 280.02 98.47 280.19 C 106.83 280.39 106.21 271.68 111.07 267.46 C 113.81 265.08 117.60 265.87 119.46 268.90 Q 120.77 271.02 120.61 274.01 Q 120.35 278.86 120.65 282.90 A 0.81 0.81 0.0 0 1 119.86 283.77 Z"></path>
      <path fill="currentColor" d="M 315.69 418.92 Q 306.32 414.70 302.15 407.03 Q 292.34 389.01 304.05 371.82 Q 306.75 367.86 312.09 364.64 C 319.36 360.28 328.26 360.09 335.78 363.97 C 346.90 369.71 352.42 382.23 350.98 394.65 A 0.99 0.98 3.4 0 0 351.96 395.75 L 361.19 395.70 A 1.11 1.10 12.7 0 0 362.19 395.07 Q 367.15 384.71 377.09 380.79 A 1.46 1.46 0.0 0 0 378.01 379.53 Q 380.09 344.92 371.84 313.26 A 1.71 1.71 0.0 0 1 373.06 311.18 Q 383.71 308.40 390.99 298.78 A 1.14 1.13 -46.5 0 1 392.76 298.73 Q 393.41 299.51 393.69 300.51 C 401.11 326.91 402.43 355.01 398.99 382.08 A 1.45 1.45 0.0 0 0 399.66 383.48 C 408.74 389.14 412.55 397.92 412.55 408.50 Q 412.56 419.47 405.17 428.39 C 395.53 440.03 381.22 442.15 369.41 432.13 Q 364.22 427.73 361.42 420.66 A 0.95 0.94 79.0 0 0 360.54 420.06 L 340.83 420.08 Q 339.94 420.08 339.54 420.87 Q 335.60 428.82 330.68 437.92 C 328.75 441.48 325.85 443.39 321.95 443.76 C 313.59 444.54 309.92 438.10 311.21 430.58 C 311.85 426.85 314.32 423.16 316.01 419.81 Q 316.31 419.20 315.69 418.92 Z M 349.61 396.43 C 351.90 379.81 341.77 362.14 323.20 362.87 C 310.85 363.35 301.91 373.31 299.67 385.10 C 297.07 398.76 304.30 413.74 317.67 417.98 Q 318.33 418.18 318.03 418.80 Q 315.90 423.27 313.68 427.69 C 311.57 431.89 311.85 438.45 316.24 441.22 C 319.57 443.33 326.28 442.33 328.48 438.57 Q 333.67 429.72 338.82 419.38 A 1.59 1.59 0.0 0 1 340.24 418.51 L 361.71 418.52 A 0.49 0.49 0.0 0 1 362.18 418.86 Q 365.29 427.82 372.57 432.67 C 381.74 438.78 392.94 438.23 400.90 430.70 Q 412.43 419.81 411.03 404.98 C 410.19 396.07 405.94 389.26 398.73 384.52 A 2.05 2.04 20.8 0 1 397.84 382.55 C 399.39 371.04 399.82 360.26 399.63 348.24 Q 399.45 337.10 398.30 328.72 Q 396.51 315.60 392.45 300.88 A 0.66 0.66 0.0 0 0 391.30 300.64 Q 384.35 309.28 374.27 312.31 A 1.20 1.20 0.0 0 0 373.45 313.76 Q 375.95 323.45 377.46 335.48 Q 380.24 357.65 379.24 380.30 A 1.77 1.77 0.0 0 1 378.12 381.87 Q 368.01 385.77 363.12 396.20 Q 362.63 397.23 361.49 397.23 L 350.30 397.22 Q 349.50 397.22 349.61 396.43 Z"></path>
      <path fill="currentColor" d="M 80.04 366.25 Q 78.36 334.97 84.90 307.88 A 1.22 1.22 0.0 0 1 87.02 307.38 C 89.59 310.44 92.72 312.16 96.82 312.09 Q 102.30 311.99 106.99 312.20 A 1.59 1.59 0.0 0 1 108.45 314.20 Q 104.89 327.26 103.34 342.24 A 1.80 1.80 0.0 0 1 102.34 343.68 Q 86.87 351.25 83.18 368.80 Q 82.88 370.19 81.48 370.36 A 0.83 0.83 0.0 0 1 80.59 369.76 Q 80.13 368.05 80.04 366.25 Z M 81.35 365.55 Q 81.32 366.28 81.87 366.77 A 0.50 0.49 27.7 0 0 82.69 366.52 Q 86.49 350.39 100.44 342.97 C 101.62 342.34 102.07 341.30 102.21 340.04 Q 103.74 325.81 106.80 314.77 A 0.70 0.70 0.0 0 0 106.13 313.88 Q 100.00 313.87 95.29 313.66 Q 90.39 313.44 87.49 309.84 A 1.11 1.11 0.0 0 0 85.54 310.29 Q 80.25 334.28 80.76 359.68 C 80.80 361.63 81.43 363.67 81.35 365.55 Z"></path>
      <path fill="currentColor" d="M 161.02 418.97 C 144.66 412.43 138.78 392.21 146.09 377.11 C 155.97 356.72 182.03 355.76 192.81 376.01 Q 197.36 384.54 196.26 394.90 A 0.71 0.70 -87.1 0 0 196.96 395.68 L 211.72 395.75 A 0.96 0.96 0.0 0 0 212.68 394.81 Q 212.89 383.65 212.70 372.91 C 212.61 367.69 214.27 362.72 219.47 360.76 C 227.01 357.93 234.82 362.85 234.85 371.10 Q 234.89 383.09 234.86 394.75 Q 234.86 395.43 235.54 395.41 L 241.92 395.26 Q 242.61 395.24 242.61 394.55 Q 242.65 383.51 242.73 373.79 Q 242.77 368.65 243.75 366.37 C 246.31 360.48 252.48 358.05 258.33 360.77 C 263.09 362.98 264.85 367.23 264.78 372.32 Q 264.64 383.38 264.72 394.61 Q 264.72 395.32 265.44 395.32 L 271.77 395.26 A 0.79 0.78 90.0 0 0 272.55 394.47 Q 272.47 383.05 272.55 371.35 C 272.61 363.59 279.78 357.58 287.36 360.41 C 292.44 362.31 294.68 366.66 294.70 371.86 Q 294.76 389.32 294.63 404.85 Q 294.60 408.33 293.92 411.56 C 292.24 419.60 284.21 420.15 277.58 420.15 Q 232.40 420.15 185.86 420.15 Q 185.28 420.15 185.01 420.66 Q 180.69 428.71 175.88 437.99 C 173.66 442.29 169.08 444.37 164.49 443.83 C 155.18 442.72 154.87 432.09 158.28 425.51 Q 159.84 422.52 161.27 419.64 A 0.49 0.48 24.6 0 0 161.02 418.97 Z M 194.57 396.59 Q 195.44 390.76 194.73 386.92 Q 194.32 384.72 193.75 382.35 C 190.98 370.89 180.61 362.25 168.60 362.92 C 158.64 363.48 151.81 368.92 147.46 377.70 Q 140.82 391.07 147.78 404.61 C 151.14 411.14 156.03 415.88 162.93 418.14 A 0.60 0.60 0.0 0 1 163.26 419.00 C 161.17 422.79 158.06 427.49 157.51 431.84 C 156.75 437.89 160.44 443.13 166.97 442.44 Q 172.34 441.87 174.56 437.51 Q 179.28 428.25 184.21 419.13 Q 184.50 418.60 185.11 418.60 Q 230.62 418.51 278.54 418.63 Q 282.19 418.64 285.83 417.88 C 292.82 416.42 293.41 409.38 293.46 403.39 Q 293.58 386.51 293.50 370.67 C 293.48 366.14 290.26 362.42 285.93 361.49 C 279.08 360.02 273.86 364.70 273.81 371.52 Q 273.72 384.15 273.65 396.21 A 0.47 0.46 0.0 0 1 273.18 396.67 L 264.55 396.73 A 0.89 0.89 0.0 0 1 263.65 395.86 Q 263.36 384.40 263.60 371.95 Q 263.67 368.23 262.38 366.07 C 259.48 361.25 251.91 359.07 247.39 363.21 C 244.47 365.89 243.84 369.29 243.76 373.53 Q 243.56 384.40 243.72 395.69 A 0.99 0.99 0.0 0 1 242.73 396.69 L 234.77 396.66 Q 233.87 396.66 233.86 395.76 Q 233.74 385.72 233.72 372.56 Q 233.71 369.00 232.77 366.76 C 230.88 362.28 225.17 360.55 220.66 361.84 C 215.63 363.29 213.80 367.41 213.69 372.54 Q 213.44 384.81 213.75 396.37 A 0.82 0.82 0.0 0 1 212.94 397.21 L 195.30 397.43 Q 194.44 397.44 194.57 396.59 Z"></path>
      <path fill="currentColor" d="M 98.65 443.44 Q 98.33 446.62 96.12 449.13 C 90.00 456.07 80.41 454.15 77.00 445.86 Q 74.17 438.95 78.37 432.52 C 83.44 424.75 93.72 426.68 97.78 434.28 C 98.46 435.56 98.42 436.78 98.74 438.15 Q 98.99 439.23 99.31 438.17 C 100.34 434.71 101.57 431.93 104.55 429.69 C 109.37 426.06 116.30 427.24 119.83 432.13 Q 124.35 438.41 121.55 445.69 C 119.03 452.23 111.75 455.53 105.43 451.78 C 102.24 449.89 100.42 446.91 99.55 443.37 Q 98.91 440.75 98.65 443.44 Z M 87.5987 451.6897 A 11.27 10.26 89.6 0 0 97.7797 440.3484 A 11.27 10.26 89.6 0 0 87.4413 429.1503 A 11.27 10.26 89.6 0 0 77.2603 440.4916 A 11.27 10.26 89.6 0 0 87.5987 451.6897 Z M 110.9974 451.6592 A 11.25 10.22 89.3 0 0 121.0792 440.2851 A 11.25 10.22 89.3 0 0 110.7226 429.1608 A 11.25 10.22 89.3 0 0 100.6408 440.5349 A 11.25 10.22 89.3 0 0 110.9974 451.6592 Z"></path>
    </svg>
  );
}
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) { return initialValue; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }, [key, value]);

  return [value, setValue];
}

const initialLocations = ['مسجد البصرة', 'موكب كربلاء', 'موكب النجف', 'موكب سامراء', 'المشاية'];

const initialUsers = [
  { id: 1, name: 'المبرمج الأعلى', username: 'dev', password: '123', role: 'developer' },
  { id: 2, name: 'الوالد (المشرف العام)', username: 'father', password: '123', role: 'father' },
  { id: 3, name: 'مدير النظام', username: 'admin', password: '123', role: 'admin' },
  { id: 4, name: 'المفتش أحمد', username: 'user', password: '123', role: 'member' }
];

const initialContacts = [
  { id: 1, name: 'إدارة المسجد', phone: '07800000000' },
  { id: 2, name: 'الصيانة والطوارئ', phone: '07700000000' }
];

const calculateNextDate = (lastDateStr) => {
  if (!lastDateStr) return '';
  const d = new Date(lastDateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
};

const calculateStatus = (nextDateStr, lastInspectionStr) => {
  if (!nextDateStr) return 'مجهولة';
  
  const next = new Date(nextDateStr);
  const now = new Date();
  const diffDays = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'تحتاج صيانة';
  if (diffDays <= 14) return 'صيانة قريبة'; 

  const todayStr = new Date().toISOString().split('T')[0];
  if (lastInspectionStr !== todayStr) return 'تحتاج فحص';

  return 'صالحة';
};

const today = new Date();
const formatDate = (d) => d.toISOString().split('T')[0];
const dToday = formatDate(today);
const d1MonthAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
const d8MonthsAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 8, today.getDate())); 

const initialExtinguishers = [
  { id: 1, number: 'EXT-001', size: '6Kg', type: 'Powder', location: 'مسجد البصرة', subLocation: 'الطابق الأول', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: dToday, status: 'صالحة', notes: 'يوجد خدش بسيط', inCabinet: true },
  { id: 2, number: 'EXT-002', size: '12Kg', type: 'CO2', location: 'موكب كربلاء', subLocation: 'المطبخ الرئيسي', lastDate: d8MonthsAgo, nextDate: calculateNextDate(d8MonthsAgo), lastInspection: dToday, status: 'تحتاج صيانة', notes: 'منتهية الصلاحية', inCabinet: false },
  { id: 3, number: 'EXT-003', size: '6Kg', type: 'Foam', location: 'موكب النجف', subLocation: '', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: d1MonthAgo, status: 'تحتاج فحص', notes: 'لم تفحص اليوم', inCabinet: false },
];

export default function App() {
  const [currentUser, setCurrentUser] = useLocalStorage('fireTracker_user', null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [fbUser, setFbUser] = useState(null);

  const [extinguishers, setExtinguishers] = useLocalStorage('fireTracker_extinguishers', []);
  const [users, setUsers] = useLocalStorage('fireTracker_users', initialUsers);
  const [auditLogs, setAuditLogs] = useLocalStorage('fireTracker_auditLogs', []);
  const [contacts, setContacts] = useLocalStorage('fireTracker_contacts', initialContacts);
  const [locations, setLocations] = useLocalStorage('fireTracker_locations', initialLocations);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) {} };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;

    const unsubExt = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'extinguishers'), (snap) => {
      if (snap.empty) { initialExtinguishers.forEach(ext => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), ext)); } 
      else {
        setExtinguishers(snap.docs.map(d => {
          const data = d.data();
          return { ...data, status: calculateStatus(data.nextDate, data.lastInspection || data.lastDate) };
        }));
      }
    }, console.error);

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      if (snap.empty) { initialUsers.forEach(u => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(u.id)), u)); } 
      else { setUsers(snap.docs.map(d => d.data())); }
    }, console.error);

    const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'auditLogs'), (snap) => {
      setAuditLogs(snap.docs.map(d => d.data()).sort((a,b) => b.id - a.id));
    }, console.error);

    const unsubContacts = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'contacts'), (snap) => {
      if (snap.exists()) setContacts(snap.data().list || []);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'contacts'), { list: initialContacts });
    }, console.error);

    const unsubLocs = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), (snap) => {
      if (snap.exists()) setLocations(snap.data().list || []);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), { list: initialLocations });
    }, console.error);

    return () => { unsubExt(); unsubUsers(); unsubLogs(); unsubContacts(); unsubLocs(); };
  }, [fbUser, setExtinguishers, setUsers, setAuditLogs, setContacts, setLocations]);

  const logAction = (action, details) => {
    const d = new Date();
    const dateString = d.toLocaleString('ar-EG');
    const dayString = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
    
    const newLog = { 
      id: Date.now(), 
      date: dateString, 
      dayStr: dayString, 
      userName: currentUser?.name || 'مجهول', 
      action, 
      details 
    };

    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', String(newLog.id)), newLog).catch(()=>{});
    else setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleSaveContacts = (newContacts) => {
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'contacts'), { list: newContacts }).catch(()=>{});
    else setContacts(newContacts);
  };

  const handleSaveLocations = (newLocations) => {
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), { list: newLocations }).catch(()=>{});
    else setLocations(newLocations);
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} users={users} />;

  const getRoleLabel = (role) => {
    switch(role) {
      case 'developer': return 'المبرمج الأعلى';
      case 'father': return 'المشرف العام';
      case 'admin': return 'مسؤول النظام';
      default: return 'مفتش / عضو';
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'developer': return 'bg-purple-900 border-purple-600';
      case 'father': return 'bg-yellow-600 border-yellow-400 text-yellow-50'; 
      default: return 'bg-red-900 border-red-600';
    }
  };

  return (
    <div className="bg-gray-50 flex flex-col md:flex-row font-sans text-right min-h-screen md:h-screen md:overflow-hidden" dir="rtl">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-red-800 text-white flex flex-col shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 md:p-6 flex justify-between items-center md:flex-col border-b border-red-700 bg-red-800">
          <div className="flex items-center md:flex-col gap-3 md:gap-0 w-full md:justify-center">
            <img src="https://preview.redd.it/%D9%85%D8%B3%D8%AC%D8%AF-%D8%A7%D9%84%D9%85%D9%88%D8%B3%D9%88%D9%8A-%D8%A7%D9%84%D9%83%D8%A8%D9%8A%D8%B1-%D9%81%D9%8A-%D8%A7%D9%84%D8%A8%D8%B5%D8%B1%D8%A9-v0-pbunk76bws571.jpg?width=640&crop=smart&auto=webp&s=dcef5b80db948e2e6789f5bfe95f09703af9e6d1" alt="شعار" className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-red-200 object-cover bg-white" />
            <div className="md:mt-3 text-center flex-1 md:flex-none">
              <h1 className="text-sm md:text-xl font-bold leading-tight">مسجد الموسوي الكبير</h1>
              <p className="hidden md:block text-xs text-red-200 mt-1">نظام تتبع الطفايات</p>
            </div>
            <button className="md:hidden text-red-100 hover:text-white p-1" onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
          </div>
        </div>
        
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 border-b border-red-700/50 flex flex-col justify-center items-center text-center bg-red-900/30">
            <p className="text-sm text-red-100 font-bold">{currentUser.name}</p>
            <span className={`text-xs px-3 py-1 rounded-full mt-2 shadow-sm border ${getRoleColor(currentUser.role)}`}>
              {getRoleLabel(currentUser.role)}
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <SidebarBtn icon={LayoutDashboard} label="لوحة التحكم" active={currentView === 'dashboard'} onClick={() => navigateTo('dashboard')} />
            <SidebarBtn icon={FireExtinguisher} label="سجل الطفايات" active={currentView === 'list'} onClick={() => navigateTo('list')} />
            {(currentUser.role === 'developer' || currentUser.role === 'admin' || currentUser.role === 'father') && (
              <>
                <SidebarBtn icon={Users} label="المستخدمين" active={currentView === 'users'} onClick={() => navigateTo('users')} />
                <SidebarBtn icon={ClipboardList} label="سجل التغييرات" active={currentView === 'audit'} onClick={() => navigateTo('audit')} />
              </>
            )}
            {currentUser.role === 'developer' && (
              <SidebarBtn icon={Settings} label="إعدادات المطور" active={currentView === 'settings'} onClick={() => navigateTo('settings')} />
            )}
          </nav>

          <div className="p-4 border-t border-red-700 mt-auto pb-6 md:pb-4 flex flex-col items-center">
            <button onClick={() => setCurrentUser(null)} className="flex items-center justify-center w-full p-2.5 text-red-200 hover:text-white bg-red-900/50 hover:bg-red-700 rounded-lg transition-colors mb-5 font-medium">
              <LogOut className="w-5 h-5 ml-2" /> تسجيل الخروج
            </button>
            <div className="text-center border-t border-red-700/50 pt-4 w-full">
              <p className="text-[11px] text-red-200 font-medium">© 2026 مسجد الموسوي الكبير.<br/>جميع الحقوق محفوظة.</p>
              <p className="text-[10px] text-red-300/80 mt-1 font-mono">Developed by <a href="https://abnmazin.engineer" target="_blank" rel="noreferrer" className="font-bold text-white opacity-100 hover:underline">abnmazin.engineer</a></p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-hidden">
        <header className="md:hidden bg-red-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <img src="https://preview.redd.it/%D9%85%D8%B3%D8%AC%D8%AF-%D8%A7%D9%84%D9%85%D9%88%D8%B3%D9%88%D9%8A-%D8%A7%D9%84%D9%83%D8%A8%D9%8A%D8%B1-%D9%81%D9%8A-%D8%A7%D9%84%D8%A8%D8%B5%D8%B1%D8%A9-v0-pbunk76bws571.jpg?width=640&crop=smart&auto=webp&s=dcef5b80db948e2e6789f5bfe95f09703af9e6d1" alt="شعار" className="w-10 h-10 rounded-full border border-red-200 object-cover bg-white shadow-sm" />
            <div>
              <h1 className="text-lg font-bold">مسجد الموسوي</h1>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-red-700 rounded-lg transition-colors"><Menu className="w-7 h-7" /></button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-full relative z-0 bg-gray-50">
          {currentView === 'dashboard' && <Dashboard extinguishers={extinguishers} contacts={contacts} setContacts={handleSaveContacts} user={currentUser} locations={locations} />}
          {currentView === 'list' && <ExtinguishersList extinguishers={extinguishers} setExtinguishers={setExtinguishers} user={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} locations={locations} />}
          {currentView === 'users' && <UsersList users={users} setUsers={setUsers} currentUser={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} />}
          {currentView === 'audit' && <AuditLogsList logs={auditLogs} userRole={currentUser.role} />}
          {currentView === 'settings' && <DeveloperSettings locations={locations} setLocations={handleSaveLocations} auditLogs={auditLogs} setAuditLogs={setAuditLogs} extinguishers={extinguishers} setExtinguishers={setExtinguishers} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
}

function SidebarBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center w-full p-3 rounded-lg transition-colors ${active ? 'bg-red-900 text-white font-medium shadow-inner' : 'text-red-100 hover:bg-red-700 hover:text-white'}`}>
      <Icon className="w-5 h-5 ml-3" /> {label}
    </button>
  );
}

function LoginScreen({ onLogin, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) onLogin(user);
    else setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <img src="https://preview.redd.it/%D9%85%D8%B3%D8%AC%D8%AF-%D8%A7%D9%84%D9%85%D9%88%D8%B3%D9%88%D9%8A-%D8%A7%D9%84%D9%83%D8%A8%D9%8A%D8%B1-%D9%81%D9%8A-%D8%A7%D9%84%D8%A8%D8%B5%D8%B1%D8%A9-v0-pbunk76bws571.jpg?width=640&crop=smart&auto=webp&s=dcef5b80db948e2e6789f5bfe95f09703af9e6d1" alt="شعار" className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-red-100 object-cover shadow-sm bg-white" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">مسجد الموسوي الكبير</h2>
          <p className="text-gray-500 text-sm mt-2">نظام تتبع طفايات الحريق</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none"  required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none" required /></div>
          <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 shadow-md mb-4">تسجيل الدخول</button>
        </form>
        
        <div className="mt-8 text-center border-t pt-5">
          <p className="text-xs text-gray-500 font-medium tracking-wide">© 2026 جميع الحقوق محفوظة.</p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">Developed by <a href="https://abnmazin.engineer" target="_blank" rel="noreferrer" className="font-bold text-gray-600 hover:underline">abnmazin.engineer</a></p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ extinguishers, contacts, setContacts, user }) {
  const [showContactsModal, setShowContactsModal] = useState(false);
  const stats = useMemo(() => ({
    total: extinguishers.length,
    valid: extinguishers.filter(e => e.status === 'صالحة').length,
    warning: extinguishers.filter(e => e.status === 'فحص قريب' || e.status === 'تحتاج فحص').length,
    expired: extinguishers.filter(e => e.status === 'تحتاج صيانة' || e.status === 'منتهية').length,
  }), [extinguishers]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">نظرة عامة</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="إجمالي الطفايات" count={stats.total} icon={FireExtinguisher} color="bg-blue-500" />
        <StatCard title="صالحة للعمل" count={stats.valid} icon={ShieldCheck} color="bg-green-500" />
        <StatCard title="تنبيهات الفحص" count={stats.warning} icon={AlertTriangle} color="bg-yellow-500" />
        <StatCard title="تحتاج صيانة" count={stats.expired} icon={ShieldAlert} color="bg-red-600" />
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><AlertTriangle className="w-5 h-5 ml-2 text-red-500" />تتطلب انتباهاً عاجلاً</h3>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right min-w-[300px]">
            <thead><tr className="border-b text-gray-500 text-sm"><th className="p-3">الرقم</th><th className="p-3">الموقع</th><th className="p-3">الحالة</th></tr></thead>
            <tbody>
              {extinguishers.filter(e => e.status !== 'صالحة').map(ext => (
                <tr key={ext.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{ext.number}</td>
                  <td className="p-3 text-gray-600 text-sm">{ext.location}{ext.subLocation && <span className="text-xs text-gray-400 mr-2">({ext.subLocation})</span>}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${ext.status.includes('صيانة') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{ext.status}</span></td>
                </tr>
              ))}
              {extinguishers.filter(e => e.status !== 'صالحة').length === 0 && <tr><td colSpan="3" className="p-4 text-center text-green-600 font-medium text-sm">جميع الطفايات بحالة جيدة حالياً!</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="md:hidden flex flex-col gap-3">
          {extinguishers.filter(e => e.status !== 'صالحة').map(ext => (
            <div key={ext.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex justify-between items-center">
              <div><div className="font-bold text-gray-800 text-sm">{ext.number}</div><div className="text-xs text-gray-500 mt-1">{ext.location}{ext.subLocation && <span className="block text-gray-400 text-[10px]">{ext.subLocation}</span>}</div></div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${ext.status.includes('صيانة') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{ext.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 mt-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center"><Phone className="w-5 h-5 ml-2 text-blue-500" />أرقام الطوارئ</h3>
          {(user.role === 'developer' || user.role === 'admin' || user.role === 'father') && <button onClick={() => setShowContactsModal(true)} className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg flex items-center font-medium transition-colors w-full sm:w-auto justify-center"><Edit className="w-4 h-4 ml-1" /> تعديل الأرقام</button>}
        </div>
        {contacts.length === 0 ? <p className="text-gray-500 text-sm text-center py-4">لا توجد أرقام مسجلة.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {contacts.map(c => {
              const waNumber = c.phone.startsWith('0') ? '964' + c.phone.slice(1) : c.phone;
              return (
                <div key={c.id} className="border border-gray-200 bg-white p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm hover:shadow transition-shadow">
                  <span className="font-bold text-gray-800 mb-1 text-lg">{c.name}</span>
                  <span className="text-gray-500 font-medium text-sm mb-4" dir="ltr">{c.phone}</span>
                  <div className="flex w-full gap-2 border-t border-gray-100 pt-3">
                    <a href={`tel:${c.phone}`} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"><Phone className="w-4 h-4 ml-1.5" /> اتصال</a>
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"><MessageCircle className="w-4 h-4 ml-1.5" /> واتساب</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showContactsModal && <EditContactsModal contacts={contacts} onClose={() => setShowContactsModal(false)} onSave={setContacts} />}
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-3 md:p-6 border border-gray-100 flex items-center"><div className={`${color} p-2 md:p-4 rounded-lg text-white ml-2 md:ml-4 shadow-sm`}><Icon className="w-5 h-5 md:w-6 md:h-6" /></div><div><h4 className="text-gray-500 text-[10px] md:text-sm font-medium">{title}</h4><p className="text-lg md:text-2xl font-bold text-gray-800">{count}</p></div></div>
  );
}

function ExtinguishersList({ extinguishers, setExtinguishers, user, logAction, db, fbUser, appId, locations }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionModalData, setActionModalData] = useState(null); 
  const [transferModalData, setTransferModalData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editModalData, setEditModalData] = useState(null);
  const [showCustomSelectModal, setShowCustomSelectModal] = useState(false);

  const canEdit = user.role === 'developer' || user.role === 'admin' || user.role === 'father';

  const filtered = extinguishers.filter(e => {
    const searchLower = searchTerm.toLowerCase();
    return (e.number.toLowerCase().includes(searchLower) || e.location.includes(searchTerm) || (e.subLocation && e.subLocation.toLowerCase().includes(searchLower))) &&
           (filterType === 'All' || e.type === filterType) &&
           (filterLocation === 'All' || e.location === filterLocation);
  });

  const handleAddExtinguisher = (newExt) => {
    const newId = extinguishers.length ? Math.max(...extinguishers.map(e=>Number(e.id))) + 1 : 1;
    const extWithDates = { ...newExt, id: newId, nextDate: calculateNextDate(newExt.lastDate), lastInspection: newExt.lastDate, status: calculateStatus(calculateNextDate(newExt.lastDate), newExt.lastDate) };
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(newId)), extWithDates).catch(()=>{});
    else setExtinguishers(prev => [...prev, extWithDates]);
    setShowAddModal(false);
    logAction('إضافة طفاية', `إضافة طفاية ${newExt.number} في ${newExt.location}`);
  };

  const handleActionSubmit = (extIds, actionType, condition, remarks, date) => {
    const extsToUpdate = extinguishers.filter(e => extIds.includes(e.id));
    const isMaintenance = actionType === 'maintenance';
    
    let newExts = extinguishers.map(ext => {
      if (extIds.includes(ext.id)) {
        let updatedExt = { ...ext, notes: remarks.trim() };
        if (isMaintenance) {
          const nextD = condition === 'سليمة' ? calculateNextDate(date) : ext.nextDate;
          updatedExt = { ...updatedExt, lastDate: date, nextDate: nextD, lastInspection: date, status: condition === 'سليمة' ? calculateStatus(nextD, date) : 'تحتاج صيانة' };
        } else {
          updatedExt = { ...updatedExt, lastInspection: date, status: condition === 'سليمة' ? calculateStatus(ext.nextDate, date) : 'تحتاج صيانة' };
        }
        if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), updatedExt).catch(()=>{});
        return updatedExt;
      }
      return ext;
    });
    
    if (!db || !fbUser) setExtinguishers(newExts);

    const actionName = isMaintenance ? 'صيانة شاملة' : 'فحص يومي';
    const numbers = extsToUpdate.map(e=>e.number).join('، ');
    logAction(actionName, `تم تنفيذ ${actionName} لـ (${extsToUpdate.length}) طفايات: ${numbers} بنتيجة: ${condition}`);
    setActionModalData(null);
    setSelectedIds([]);
  };

  const handleEdit = (updatedExt) => {
    const extWithDates = { ...updatedExt, nextDate: calculateNextDate(updatedExt.lastDate), status: calculateStatus(calculateNextDate(updatedExt.lastDate), updatedExt.lastInspection) };
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(updatedExt.id)), extWithDates).catch(()=>{});
    else setExtinguishers(prev => prev.map(e => e.id === updatedExt.id ? extWithDates : e));
    logAction('تعديل طفاية', `تعديل بيانات الطفاية ${updatedExt.number}`);
    setEditModalData(null);
  };

  const handleTransfer = (extIds, newLocation) => {
    const extsToTransfer = extinguishers.filter(e => extIds.includes(e.id));
    if (db && fbUser) {
      extsToTransfer.forEach(ext => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, location: newLocation }).catch(()=>{}));
    } else { setExtinguishers(prev => prev.map(e => extIds.includes(e.id) ? { ...e, location: newLocation } : e)); }
    logAction(extIds.length > 1 ? 'ترحيل جماعي' : 'ترحيل طفاية', `نقل (${extsToTransfer.map(e=>e.number).join('، ')}) إلى ${newLocation}`);
    setTransferModalData(null); setSelectedIds([]); 
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const extsToDelete = extinguishers.filter(e => selectedIds.includes(e.id));
    if (db && fbUser) {
      selectedIds.forEach(id => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(id))).catch(()=>{}));
    } else { setExtinguishers(prev => prev.filter(e => !selectedIds.includes(e.id))); }
    logAction('حذف طفايات', `حذف نهائي لـ (${selectedIds.length}) طفاية: ${extsToDelete.map(e=>e.number).join('، ')}`);
    setSelectedIds([]);
  };

  const applyCustomSelection = (text) => {
    const numbers = text.match(/\d+/g) || [];
    const targetNumbers = numbers.map(n => `EXT-${String(n).padStart(3, '0')}`);
    const matchedIds = filtered.filter(ext => targetNumbers.includes(ext.number)).map(e => e.id);
    setSelectedIds(matchedIds);
    setShowCustomSelectModal(false);
  };

  const getStatusColor = (status) => {
    if (status === 'صالحة') return 'bg-green-100 text-green-700 border border-green-200';
    if (status === 'تحتاج فحص') return 'bg-orange-100 text-orange-700 border border-orange-200';
    if (status === 'صيانة قريبة') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    return 'bg-red-100 text-red-700 border border-red-200 shadow-sm';
  };

  const transferrableCount = filtered.filter(e => selectedIds.includes(e.id) && !e.inCabinet).length;
  
  // دالة تأكيد الحذف الخاصة بالقائمة
  const [confirmDialog, setConfirmDialog] = useState(null);

  return (
    <div className="space-y-4">
      {/* شريط الأدوات والفلاتر */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
        <h2 className="text-xl font-bold text-gray-800">دليل الطفايات</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap items-center">
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36"><Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400" /><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50"><option value="All">كل الأنواع</option><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div className="relative flex-1 sm:w-36"><MapPin className="w-4 h-4 absolute right-3 top-3 text-gray-400" /><select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50"><option value="All">الموقع (الكل)</option>{locations.map(loc => (<option key={loc} value={loc}>{loc}</option>))}</select></div>
          </div>
          <div className="relative w-full sm:w-48 lg:w-56"><Search className="w-5 h-5 absolute right-3 top-2.5 text-gray-400" /><input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" /></div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {selectedIds.length > 0 && (
              <>
                <button onClick={() => setActionModalData(extinguishers.filter(e => selectedIds.includes(e.id)))} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm whitespace-nowrap"><Activity className="w-4 h-4 ml-1" /> إجراء جماعي ({selectedIds.length})</button>
                {canEdit && <button onClick={() => setTransferModalData(extinguishers.filter(e => selectedIds.includes(e.id) && !e.inCabinet))} disabled={transferrableCount === 0} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm whitespace-nowrap ${transferrableCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}><ArrowRightLeft className="w-4 h-4 ml-1" /> ترحيل ({transferrableCount})</button>}
                {canEdit && <button onClick={() => setConfirmDialog({ title: 'تأكيد الحذف', message: `هل أنت متأكد من رغبتك في حذف (${selectedIds.length}) طفاية بشكل نهائي؟`, action: handleBulkDelete, isDestructive: true })} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm"><Trash2 className="w-4 h-4" /></button>}
              </>
            )}
            {canEdit && <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm whitespace-nowrap shadow-sm"><Plus className="w-4 h-4 sm:w-5 sm:h-5 ml-1" /> إضافة</button>}
          </div>
        </div>
      </div>

      {/* أدوات التحديد السريع */}
      <div className="flex gap-2 flex-wrap items-center bg-gray-100 p-2 rounded-lg border border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded shadow-sm border">
          <input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" onChange={(e) => setSelectedIds(e.target.checked ? filtered.map(ext => ext.id) : [])} checked={filtered.length > 0 && selectedIds.length === filtered.length} />
          <span className="text-sm font-bold text-gray-700 select-none">تحديد المعروض</span>
        </label>
        <button onClick={() => setShowCustomSelectModal(true)} className="bg-white hover:bg-blue-50 text-blue-700 px-3 py-1.5 rounded shadow-sm border flex items-center text-sm font-bold transition-colors">
          <Target className="w-4 h-4 ml-1" /> تحديد بالأرقام
        </button>
        {selectedIds.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">{selectedIds.length} محدد</span>}
      </div>

      {/* العرض الخاص بالشاشات الكبيرة */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full relative z-10">
        <table className="w-full text-right"><thead className="bg-gray-50 text-gray-600 font-medium text-sm"><tr><th className="p-3 w-10 text-center"></th><th className="p-3">الرقم</th><th className="p-3">النوع والحجم</th><th className="p-3">الموقع</th><th className="p-3">آخر فحص (يومي)</th><th className="p-3">موعد الصيانة (6 أشهر)</th><th className="p-3">الحالة</th><th className="p-3">ملاحظات</th><th className="p-3 text-center">إجراءات</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">
            {filtered.map(ext => (
              <tr key={ext.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(ext.id) ? 'bg-red-50' : ''}`}>
                <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" checked={selectedIds.includes(ext.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, ext.id] : selectedIds.filter(id => id !== ext.id))} /></td>
                <td className="p-3 font-bold text-gray-800"><div className="flex items-center gap-2" dir="ltr">{ext.number}{ext.inCabinet && <span title="في كابينة" className="bg-gray-200 text-gray-500 p-1 rounded-md ml-2"><Archive className="w-3 h-3" /></span>}</div></td>
                <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs">{ext.type}</span> {ext.size}</td><td className="p-3"><div className="text-gray-800">{ext.location}</div>{ext.subLocation && <div className="text-xs text-gray-500">{ext.subLocation}</div>}</td>
                <td className="p-3 text-gray-600 font-medium whitespace-nowrap">{ext.lastInspection || ext.lastDate}</td>
                <td className="p-3 text-gray-500 whitespace-nowrap">{ext.nextDate}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center w-max ${getStatusColor(ext.status)}`}>{ext.status === 'صالحة' ? <CheckCircle className="w-3 h-3 ml-1" /> : <XCircle className="w-3 h-3 ml-1" />}{ext.status}</span></td>
                <td className="p-3 text-gray-500 text-xs max-w-[120px] truncate" title={ext.notes}>{ext.notes || '-'}</td>
                <td className="p-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => setActionModalData([ext])} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded text-xs font-medium transition-colors border border-blue-200">إجراء</button>
                    {canEdit && (<><button onClick={() => setEditModalData(ext)} className="bg-gray-50 text-gray-600 hover:bg-gray-200 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center border"><Edit className="w-3 h-3 ml-1" /> تعديل</button></>)}
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="9" className="p-6 text-center text-gray-500">لا يوجد بيانات.</td></tr>}
          </tbody></table>
      </div>

      {/* العرض الخاص بالموبايل */}
      <div className="md:hidden flex flex-col gap-4">
        {filtered.map(ext => (
          <div key={ext.id} className={`bg-white rounded-xl shadow-sm border flex flex-col gap-3 p-4 transition-colors ${selectedIds.includes(ext.id) ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start"><div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.includes(ext.id)} className="w-5 h-5 text-red-600 rounded" onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, ext.id] : selectedIds.filter(id => id !== ext.id))} />
                <div><div className="flex items-center gap-2" dir="ltr"><span className="font-bold text-gray-800 text-lg">{ext.number}</span>{ext.inCabinet && <span className="bg-gray-200 text-gray-500 p-1.5 rounded-md ml-2"><Archive className="w-3 h-3" /></span>}</div><span className="text-gray-500 text-xs">{ext.type} - {ext.size}</span></div>
              </div><span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center ${getStatusColor(ext.status)}`}>{ext.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div><span className="text-gray-400 block text-[10px] mb-0.5">الموقع</span><span className="font-medium text-gray-700">{ext.location}</span>{ext.subLocation && <span className="text-gray-500 text-[10px] block mt-0.5 bg-gray-200/50 px-1 rounded w-max">{ext.subLocation}</span>}</div>
              <div><span className="text-gray-400 block text-[10px] mb-0.5">آخر فحص يومي</span><span className="font-bold text-gray-700">{ext.lastInspection || ext.lastDate}</span></div>
              <div className="col-span-2 pt-2 border-t border-gray-200/60"><span className="text-gray-400 block text-[10px] mb-0.5">موعد الصيانة الشاملة القادم</span><span className="font-bold text-gray-800">{ext.nextDate}</span></div>
            </div>
            {ext.notes && <div className="text-xs bg-yellow-50 text-yellow-800 p-2.5 rounded-lg border border-yellow-100 flex items-start"><FileText className="w-4 h-4 ml-1.5 shrink-0 mt-0.5 text-yellow-600" /><span><strong className="font-bold">ملاحظة: </strong>{ext.notes}</span></div>}
            <div className="flex gap-2 pt-1"><button onClick={() => setActionModalData([ext])} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center shadow-sm">إجراء (فحص/صيانة)</button>
              {canEdit && (<button onClick={() => setEditModalData(ext)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center border"><Edit className="w-4 h-4" /></button>)}
            </div>
          </div>
        ))}
      </div>

      {showCustomSelectModal && <CustomSelectModal onClose={() => setShowCustomSelectModal(false)} onApply={applyCustomSelection} />}
      {showAddModal && <AddExtinguisherModal onClose={() => setShowAddModal(false)} onAdd={handleAddExtinguisher} locations={locations} />}
      {actionModalData && <ActionModal exts={actionModalData} onClose={() => setActionModalData(null)} onSubmit={handleActionSubmit} userRole={user.role} />}
      {editModalData && <EditExtinguisherModal ext={editModalData} onClose={() => setEditModalData(null)} onEdit={handleEdit} locations={locations} />}
      {transferModalData && <TransferModal exts={transferModalData} onClose={() => setTransferModalData(null)} onSubmit={handleTransfer} locations={locations} />}
      
      {/* نافذة التأكيد */}
      {confirmDialog && <CustomConfirmModal title={confirmDialog.title} message={confirmDialog.message} isDestructive={confirmDialog.isDestructive} onConfirm={confirmDialog.action} onClose={() => setConfirmDialog(null)} />}
    </div>
  );
}

// نافذة التحديد المخصص
function CustomSelectModal({ onClose, onApply }) {
  const [text, setText] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onApply(text); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg flex items-center"><Target className="w-5 h-5 ml-2"/> تحديد مخصص</h3><button onClick={onClose} className="text-blue-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <p className="text-sm text-gray-600">اكتب أرقام الطفايات التي تريد تحديدها. يمكنك فصل الأرقام بمسافة أو فارزة (مثال: 1 5 12 أو 1, 2, 3).</p>
          <textarea autoFocus className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 h-32 outline-none font-mono text-left" dir="ltr" placeholder="1, 2, 3..." value={text} onChange={e => setText(e.target.value)}></textarea>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-md">تحديد الطفايات</button><button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

// نافذة الإجراءات الموحدة
function ActionModal({ exts, onClose, onSubmit, userRole }) {
  const [actionType, setActionType] = useState('inspection'); 
  const [condition, setCondition] = useState('سليمة');
  const [remarks, setRemarks] = useState(exts.length === 1 ? (exts[0].notes || '') : ''); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const canDoMaintenance = ['developer', 'father', 'admin'].includes(userRole);
  const isSingle = exts.length === 1;

  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onSubmit(exts.map(e=>e.id), actionType, condition, remarks, date); 
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-blue-600 text-white p-4">
          <h3 className="font-bold text-lg flex items-center"><Activity className="w-5 h-5 ml-2"/> تسجيل إجراء {isSingle ? 'لطفاية' : 'جماعي'}</h3>
          <p className="text-sm text-blue-100 opacity-90 mt-1">{isSingle ? `رقم: ${exts[0].number}` : `العدد: ${exts.length} طفايات محددة`}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button type="button" onClick={() => setActionType('inspection')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${actionType === 'inspection' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>فحص ميداني (يومي)</button>
            {canDoMaintenance ? (
              <button type="button" onClick={() => setActionType('maintenance')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${actionType === 'maintenance' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>صيانة شاملة (6 أشهر)</button>
            ) : (
              <div className="flex-1 py-2 text-sm font-medium text-gray-400 text-center" title="ليس لديك صلاحية لإجراء صيانة">صيانة (مقفلة)</div>
            )}
          </div>

          <div className={`p-3 rounded-lg border ${actionType === 'maintenance' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-xs text-gray-600 font-medium">
              {actionType === 'inspection' ? '📌 الفحص الميداني: يثبت أن الطفاية موجودة وسليمة لهذا اليوم فقط. لا يغير موعد الصيانة الأساسي.' : '🔧 الصيانة الشاملة: يجدد صلاحية الطفاية بالكامل، وسيقوم النظام ببرمجة الموعد القادم بعد 6 أشهر من اليوم.'}
            </p>
          </div>

          <div><label className="block text-sm font-bold text-gray-700 mb-1">تاريخ الإجراء</label><input required type="date" className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1">النتيجة / الحالة</label><select className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" value={condition} onChange={e => setCondition(e.target.value)}><option value="سليمة">سليمة وجاهزة للعمل</option><option value="تالفة">تالفة / تحتاج استبدال</option><option value="تسريب">يوجد تسريب</option><option value="إعادة تعبئة">تحتاج إعادة تعبئة</option></select></div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ملاحظات (اختياري)</label>
            <textarea className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 h-24 text-sm outline-none bg-gray-50" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={isSingle ? "امسح النص لإلغاء الملاحظة السابقة..." : "ستطبق هذه الملاحظة على جميع الطفايات المحددة..."} />
          </div>
          
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-md">تأكيد وحفظ</button><button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold transition-colors">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

function AddExtinguisherModal({ onClose, onAdd, locations }) {
  const [formData, setFormData] = useState({ numPart: '', size: '6Kg', type: 'Powder', location: locations[0] || '', subLocation: '', lastDate: new Date().toISOString().split('T')[0], notes: '', inCabinet: false });
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    const finalNumber = `EXT-${String(formData.numPart).padStart(3, '0')}`;
    onAdd({ ...formData, number: finalNumber }); 
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-red-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">إضافة طفاية مفردة</h3><button onClick={onClose} className="text-red-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">رقم الطفاية (أدخل الأرقام فقط)</label>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500 bg-gray-50" dir="ltr">
              <span className="bg-gray-200 text-gray-600 font-bold px-4 py-2 border-r border-gray-300 select-none">EXT-</span>
              <input required type="number" min="1" placeholder="001" className="w-full px-3 py-2 outline-none bg-transparent" value={formData.numPart} onChange={e => setFormData({...formData, numPart: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><input required type="text" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الرئيسي</label><select className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الفرعي (اختياري)</label><input type="text" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.subLocation} onChange={e => setFormData({...formData, subLocation: e.target.value})} /></div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="inCabinet" className="w-4 h-4 text-red-600 rounded" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="inCabinet" className="text-sm font-bold text-gray-700 cursor-pointer select-none">مثبتة داخل كابينة</label></div>
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ الإنشاء / الصيانة</label><input required type="date" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} /></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 shadow-md">حفظ</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-300">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

function EditExtinguisherModal({ ext, onClose, onEdit, locations }) {
  const [formData, setFormData] = useState({ ...ext });
  const handleSubmit = (e) => { e.preventDefault(); onEdit(formData); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-green-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">تعديل بيانات الطفاية</h3><button onClick={onClose} className="text-green-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div><label className="block text-sm text-gray-600 mb-1">رقم الطفاية</label><input required type="text" className="w-full border p-2 rounded bg-gray-200 text-gray-600 font-bold outline-none cursor-not-allowed" value={formData.number} disabled dir="ltr" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الرئيسي</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الفرعي (اختياري)</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.subLocation || ''} onChange={e => setFormData({...formData, subLocation: e.target.value})} /></div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="editInCabinet" className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="editInCabinet" className="text-sm font-bold text-gray-700 cursor-pointer select-none">مثبتة داخل كابينة</label></div>
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ آخر صيانة شاملة</label><input required type="date" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} /></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-md">حفظ التعديلات</button><button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-200">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

function CustomConfirmModal({ title, message, isDestructive, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden my-auto p-6 text-center transform transition-all">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 text-white py-2.5 rounded-lg font-bold transition-colors shadow-md ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>تأكيد</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold transition-colors">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ exts, onClose, onSubmit, locations }) {
  const [newLocation, setNewLocation] = useState(locations[0] || '');
  const handleSubmit = (e) => { e.preventDefault(); if(newLocation.trim() === '') return; onSubmit(exts.map(e => e.id), newLocation); };
  const isSingle = exts.length === 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto"><div className="bg-purple-600 text-white p-4"><h3 className="font-bold text-lg flex items-center"><ArrowRightLeft className="w-5 h-5 ml-2" /> {isSingle ? 'ترحيل الطفاية' : 'ترحيل جماعي'}</h3><p className="text-sm text-purple-100 opacity-90 mt-1">{isSingle ? `رقم: ${exts[0].number}` : `العدد: ${exts.length}`}</p></div><form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">{isSingle && (<div><label className="block text-sm text-gray-600 mb-1">الموقع الحالي</label><input type="text" disabled className="w-full border p-2 rounded bg-gray-100 text-gray-500" value={exts[0].location} /></div>)}<div><label className="block text-sm text-gray-600 mb-1">الموقع الجديد</label><select required className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500" value={newLocation} onChange={e => setNewLocation(e.target.value)}>{locations.map(loc => <option key={loc} value={loc} disabled={isSingle && exts[0].location === loc}>{loc}</option>)}</select></div><div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center">تأكيد الترحيل</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium">إلغاء</button></div></form></div></div>
  );
}

function UsersList({ users, setUsers, currentUser, logAction, db, fbUser, appId }) {
  const [showAddModal, setShowAddModal] = useState(false);

  if (currentUser.role === 'member') return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const handleAddUser = (newUser) => {
    const newId = users.length ? Math.max(...users.map(u => Number(u.id))) + 1 : 1;
    const userObj = { ...newUser, id: newId };
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(newId)), userObj).catch(()=>{});
    else setUsers([...users, userObj]);
    setShowAddModal(false);
    logAction('إضافة مستخدم', `إضافة حساب "${newUser.name}"`);
  };

  const handleDeleteUser = (id, name) => {
    if (id === currentUser.id) return; 
    if (db && fbUser) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(id))).catch(()=>{});
    else setUsers(users.filter(u => u.id !== id));
    logAction('حذف مستخدم', `حذف حساب "${name}"`);
  };

  const canSeePassword = (targetRole) => currentUser.role === 'developer' || ((currentUser.role === 'admin' || currentUser.role === 'father') && targetRole !== 'developer');
  const canDelete = (targetId, targetRole) => targetId !== currentUser.id && (currentUser.role === 'developer' || ((currentUser.role === 'admin' || currentUser.role === 'father') && targetRole !== 'developer' && targetRole !== 'father'));

  const getRoleLabel = (role) => {
    if (role === 'developer') return 'مبرمج';
    if (role === 'father') return 'مشرف عام';
    if (role === 'admin') return 'مسؤول';
    return 'مفتش';
  };
  const getRoleBadgeColor = (role) => {
    if (role === 'developer') return 'bg-purple-100 text-purple-700';
    if (role === 'father') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (role === 'admin') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3"><h2 className="text-xl font-bold text-gray-800">فريق العمل</h2><button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm font-medium"><UserPlus className="w-4 h-4 ml-2" /> إضافة مستخدم</button></div>
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-right min-w-[500px]"><thead className="bg-gray-50 text-gray-600 text-sm"><tr><th className="p-3">الاسم</th><th className="p-3">الحساب</th><th className="p-3">المرور</th><th className="p-3">الصلاحية</th><th className="p-3 text-center">إجراء</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{u.name}</td><td className="p-3 text-gray-600" dir="ltr">{u.username}</td>
                <td className="p-3 text-gray-400 font-mono tracking-widest">{canSeePassword(u.role) ? u.password : '••••••'}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${getRoleBadgeColor(u.role)}`}>{getRoleLabel(u.role)}</span></td>
                <td className="p-3 text-center">{canDelete(u.id, u.role) ? (<button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center mx-auto"><Trash2 className="w-3 h-3 ml-1" /> حذف</button>) : (<span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">غير مصرح</span>)}</td>
              </tr>
            ))}
          </tbody></table>
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {users.map(u => (
          <div key={u.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col gap-3 relative">
            <div className="flex justify-between items-start"><span className="font-bold text-gray-800">{u.name}</span><span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(u.role)}`}>{getRoleLabel(u.role)}</span></div>
            <div className="text-sm text-gray-600 bg-white p-2 rounded border">الحساب: <span dir="ltr" className="font-medium text-gray-800">{u.username}</span></div>
            <div className="text-sm text-gray-600 bg-white p-2 rounded border">كلمة المرور: <span dir="ltr" className="text-gray-400 font-mono tracking-widest">{canSeePassword(u.role) ? u.password : '••••••'}</span></div>
            {canDelete(u.id, u.role) && <button onClick={() => handleDeleteUser(u.id, u.name)} className="w-full mt-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium flex justify-center items-center"><Trash2 className="w-4 h-4 ml-1" /> حذف</button>}
          </div>
        ))}
      </div>
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdd={handleAddUser} currentUser={currentUser} />}
    </div>
  );
}

function AddUserModal({ onClose, onAdd, currentUser }) {
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'member' });
  const handleSubmit = (e) => { e.preventDefault(); onAdd(formData); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto"><div className="bg-blue-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">إضافة مستخدم</h3><button onClick={onClose} className="text-blue-200 hover:text-white p-1">&times;</button></div><form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4"><div><label className="block text-sm text-gray-600 mb-1">الاسم الكامل</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div><div><label className="block text-sm text-gray-600 mb-1">الحساب</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} dir="ltr" /></div><div><label className="block text-sm text-gray-600 mb-1">المرور</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" /></div><div><label className="block text-sm text-gray-600 mb-1">الصلاحية</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}><option value="member">مفتش (محدودة)</option><option value="admin">مسؤول (إدارة)</option>{currentUser.role === 'developer' && (<><option value="father">مشرف عام (الوالد)</option><option value="developer">مبرمج (كاملة)</option></>)}</select></div><div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center">إضافة</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium">إلغاء</button></div></form></div></div>
  );
}

function AuditLogsList({ logs, userRole }) {
  if (userRole === 'member') return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const [selectedDay, setSelectedDay] = useState('All');

  const logsWithDay = useMemo(() => {
    return logs.map(log => {
      const dayStr = log.dayStr || log.date.split(/,|،/)[0].trim();
      return { ...log, dayStr };
    });
  }, [logs]);

  const availableDays = useMemo(() => {
    const days = new Set(logsWithDay.map(l => l.dayStr));
    return [...days]; 
  }, [logsWithDay]);

  const filteredLogs = useMemo(() => {
    if (selectedDay === 'All') return logsWithDay;
    return logsWithDay.filter(l => l.dayStr === selectedDay);
  }, [logsWithDay, selectedDay]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full relative z-10">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center"><ClipboardList className="w-6 h-6 ml-2 text-red-600" />سجل التغييرات والمهام</h2>
        
        <div className="w-full sm:w-auto relative">
          <Calendar className="w-4 h-4 absolute right-3 top-3 text-gray-500" />
          <select 
            value={selectedDay} 
            onChange={(e) => setSelectedDay(e.target.value)} 
            className="w-full sm:w-56 pl-3 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm text-gray-700 bg-gray-50 appearance-none font-medium"
            dir="rtl"
          >
            <option value="All">كل الأيام (الجميع)</option>
            {availableDays.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-right min-w-[600px]"><thead className="bg-gray-50 text-gray-600 text-sm border-y"><tr><th className="p-3">التاريخ والوقت</th><th className="p-3">المستخدم</th><th className="p-3">الإجراء</th><th className="p-3">التفاصيل</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">{filteredLogs.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-500">لا توجد سجلات لهذا اليوم.</td></tr> : filteredLogs.map(log => <tr key={log.id} className="hover:bg-gray-50"><td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{log.date}</td><td className="p-3 font-medium text-blue-700 whitespace-nowrap">{log.userName}</td><td className="p-3"><span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-lg text-[11px] font-bold border whitespace-nowrap">{log.action}</span></td><td className="p-3 text-gray-700 min-w-[200px]">{log.details}</td></tr>)}</tbody></table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">لا توجد سجلات لهذا اليوم.</div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 relative">
              <div className="flex justify-between items-start mb-1">
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-[10px] font-bold border">{log.action}</span>
                <span className="text-gray-400 text-[10px]" dir="ltr">{log.date}</span>
              </div>
              <div className="text-sm font-bold text-blue-700">{log.userName}</div>
              <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded border border-gray-200">{log.details}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 10. إعدادات المطور
function DeveloperSettings({ locations, setLocations, auditLogs, setAuditLogs, extinguishers, setExtinguishers, db, fbUser, appId, logAction, currentUser }) {
  const [newLocation, setNewLocation] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null); 
  const [bulkData, setBulkData] = useState({ quantity: 10, type: 'Powder', size: '6Kg', location: locations[0] || '' });

  if (currentUser.role !== 'developer') return <div className="p-8 text-center text-red-500">خاص بالمطورين فقط.</div>;

  const handleAddLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (loc) => {
    if (locations.length > 1) setLocations(locations.filter(l => l !== loc));
    else alert("يجب أن يبقى موقع واحد على الأقل.");
  };

  const executeClearLogs = () => {
    if (db && fbUser) auditLogs.forEach(log => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', String(log.id))).catch(()=>{}));
    else setAuditLogs([]);
    logAction('تنظيف النظام', 'تم مسح سجل النشاطات بالكامل.');
  };

  const executeWipeData = () => {
    if (db && fbUser) extinguishers.forEach(ext => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id))).catch(()=>{}));
    else { window.localStorage.setItem('fireTracker_extinguishers', '[]'); window.location.reload(); }
    logAction('تهيئة النظام', 'تم مسح قاعدة بيانات الطفايات بالكامل.');
  };

  const handleBulkAdd = () => {
    const quantity = Number(bulkData.quantity);
    if (quantity <= 0 || quantity > 500) return; 
    
    const maxExtNumber = extinguishers.reduce((max, ext) => {
      const numMatch = ext.number.match(/\d+/);
      const num = numMatch ? parseInt(numMatch[0], 10) : 0;
      return Math.max(max, num);
    }, 0);

    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const nextDateStr = calculateNextDate(todayStr);
    const status = calculateStatus(nextDateStr, todayStr);

    const newExts = [];
    for (let i = 1; i <= quantity; i++) {
      const newNum = maxExtNumber + i;
      const formattedNum = `EXT-${String(newNum).padStart(3, '0')}`;
      const newId = Date.now() + i + Math.floor(Math.random() * 1000); 
      
      newExts.push({
        id: newId,
        number: formattedNum,
        size: bulkData.size,
        type: bulkData.type,
        location: bulkData.location,
        subLocation: '',
        lastDate: todayStr,
        nextDate: nextDateStr,
        lastInspection: todayStr,
        status: status,
        notes: '',
        inCabinet: false
      });
    }

    if (db && fbUser) {
       newExts.forEach(ext => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), ext).catch(()=>{}));
    } else {
       setExtinguishers(prev => [...prev, ...newExts]);
    }
    
    logAction('إضافة جماعية', `تم إنشاء ${quantity} طفاية جديدة تلقائياً في ${bulkData.location}.`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 flex items-center"><Settings className="w-6 h-6 ml-2 text-red-600"/> إعدادات النظام الأساسية (للمطور)</h2>
      
      {/* 1. الإضافة الجماعية */}
      <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-2 bg-purple-500 h-full"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><CopyPlus className="w-5 h-5 ml-2 text-purple-600"/> مشغل الأوامر (الإضافة الجماعية)</h3>
        <p className="text-sm text-gray-600 mb-4">تقوم هذه الأداة بإنشاء عدد كبير من الطفايات دفعة واحدة، وستقوم بتسلسل الأرقام تلقائياً بناءً على آخر رقم موجود في النظام.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">العدد المطلوب</label>
            <input type="number" min="1" max="100" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.quantity} onChange={e => setBulkData({...bulkData, quantity: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">النوع</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.type} onChange={e => setBulkData({...bulkData, type: e.target.value})}>
              <option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الحجم</label>
            <input type="text" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.size} onChange={e => setBulkData({...bulkData, size: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الموقع الأساسي</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.location} onChange={e => setBulkData({...bulkData, location: e.target.value})}>
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
        </div>
        <button 
          onClick={() => setConfirmDialog({ title: 'تأكيد الإضافة الجماعية', message: `سيتم الآن إنشاء (${bulkData.quantity}) طفاية جديدة بتسلسلات تلقائية في "${bulkData.location}". هل أنت متأكد؟`, action: handleBulkAdd, isDestructive: false })} 
          className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors shadow-md"
        >
          تنفيذ الإضافة الجماعية الآن
        </button>
      </div>

      {/* 2. إدارة المواقع */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><MapPin className="w-5 h-5 ml-2 text-blue-600"/> إدارة المواقع الأساسية</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="اسم الموقع الجديد..." className="flex-1 border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newLocation} onChange={e => setNewLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddLocation()} />
          <button onClick={handleAddLocation} className="bg-blue-600 text-white px-5 rounded-lg font-medium hover:bg-blue-700 transition-colors">إضافة</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {locations.map(loc => (
            <div key={loc} className="bg-gray-100 border border-gray-200 text-gray-800 px-3 py-1.5 rounded-full flex items-center text-sm font-medium shadow-sm">
              {loc}
              <button onClick={() => handleRemoveLocation(loc)} className="ml-1 mr-2 text-gray-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. أدوات الخطر */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
        <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center"><DatabaseBackup className="w-5 h-5 ml-2"/> منطقة الخطر (إدارة البيانات)</h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-red-50 p-4 rounded-lg border border-red-100">
            <div>
              <p className="font-bold text-gray-800">مسح سجل النشاطات</p>
              <p className="text-xs text-gray-600 mt-1">مسح جميع التغييرات السابقة ({auditLogs.length} سجل حالياً).</p>
            </div>
            <button onClick={() => setConfirmDialog({ title: 'تفريغ السجل', message: 'هل أنت متأكد من مسح جميع سجلات النشاطات نهائياً؟', action: executeClearLogs, isDestructive: true })} disabled={auditLogs.length === 0} className="w-full sm:w-auto mt-3 sm:mt-0 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
              تفريغ السجل
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between bg-red-100 p-4 rounded-lg border border-red-300">
            <div>
              <p className="font-bold text-red-900">إعادة ضبط المصنع (مسح الطفايات)</p>
              <p className="text-xs text-red-700 mt-1">يحذف جميع الطفايات المسجلة نهائياً للبدء من جديد.</p>
            </div>
            <button onClick={() => setConfirmDialog({ title: 'مسح الطفايات!', message: 'تحذير خطير: هل أنت متأكد من مسح جميع بيانات الطفايات؟ لا يمكن التراجع عن هذه الخطوة!', action: executeWipeData, isDestructive: true })} disabled={extinguishers.length === 0} className="w-full sm:w-auto mt-3 sm:mt-0 bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
              مسح كل البيانات!
            </button>
          </div>
        </div>
      </div>

      {confirmDialog && (
        <CustomConfirmModal 
          title={confirmDialog.title} 
          message={confirmDialog.message} 
          isDestructive={confirmDialog.isDestructive} 
          onConfirm={confirmDialog.action} 
          onClose={() => setConfirmDialog(null)} 
        />
      )}

    </div>
  );
}