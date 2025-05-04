import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAJneFO6AYsj5_w3hIKzPGDa8yR6Psng4M",
    authDomain: "hub-de-calculadoras.firebaseapp.com",
    projectId: "hub-de-calculadoras",
    storageBucket: "hub-de-calculadoras.appspot.com",
    messagingSenderId: "203883856586",
    appId: "1:203883856586:web:a00536536a32ae76c5aa33",
    measurementId: "G-7H314CT9SH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

try {
    console.log("Firebase inicializado com sucesso!");
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    throw error;
}

export { db, auth };

