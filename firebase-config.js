// Importar Firebase App, Firestore y Storage
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

// 🔹 Configuración Firebase ÚNICA
const firebaseConfig = {
  apiKey: "AIzaSyA_1wMkWbb0tsxBi8Z2HkeK7dzJ_2ionTw",
  authDomain: "mabel2-66b08.firebaseapp.com",
  projectId: "mabel2-66b08",
  storageBucket: "mabel2-66b08.firebasestorage.app",
  messagingSenderId: "689226318857",
  appId: "1:689226318857:web:3345c73a2a9f7eafeea4d8"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Exportar para usar en otros archivos
export { db, storage };