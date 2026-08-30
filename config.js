// Money Tree Firebase configuration.
// Firebase web configuration is public by design. Protect customer data with
// the Firestore rules supplied in this project and restrict the API key to the
// approved Money Tree domains in Google Cloud Console.
const firebaseConfig = {
    apiKey: "AIzaSyAB2vdiwyC3cQGnczRTeL0JptHl70ImtAE",
    authDomain: "money-tree-loan-app.firebaseapp.com",
    projectId: "money-tree-loan-app",
    storageBucket: "money-tree-loan-app.firebasestorage.app",
    messagingSenderId: "360207414093",
    appId: "1:360207414093:web:9f6dc2743200b3fbf83d04"
};

// Private supporting documents are uploaded to the administrator-owned
// Google Apps Script web app. This must remain the deployed /exec URL.
const documentUploadConfig = Object.freeze({
    webAppUrl: "https://script.google.com/macros/s/AKfycbzaYWrlcwTffYn1P9lhaks33c011owRJTZ9h6vDPRP3LkRtdpMG6A-nIp2igJKqog7Xwg/exec",
    maximumFileSizeMb: 5
});

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

window.auth = auth;
window.db = db;
window.firebase = firebase;
window.documentUploadConfig = documentUploadConfig;
