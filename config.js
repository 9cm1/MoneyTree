// ============================================================
// FIREBASE CONFIG - Money Tree Loan App
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAB2vdiwyC3cQGnczRTeL0JptHl70ImtAE",
    authDomain: "money-tree-loan-app.firebaseapp.com",
    projectId: "money-tree-loan-app",
    storageBucket: "money-tree-loan-app.firebasestorage.app",
    messagingSenderId: "360207414093",
    appId: "1:360207414093:web:9f6dc2743200b3fbf83d04"
};

// ============================================================
// INITIALIZE FIREBASE
// ============================================================

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ============================================================
// EXPOSE TO GLOBAL SCOPE (so all pages can use them)
// ============================================================
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebase = firebase;

console.log('🔥 Firebase initialized successfully!');
console.log('📁 Project:', firebaseConfig.projectId);