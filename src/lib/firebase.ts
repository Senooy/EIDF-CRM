import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics"; // Uncomment if you need Analytics

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6cMUsQYN2Yy9yC5UucMisegy9Jt3uF5k",
  authDomain: "eidf-ebdf4.firebaseapp.com",
  projectId: "eidf-ebdf4",
  storageBucket: "eidf-ebdf4.firebasestorage.app",
  messagingSenderId: "278830945504",
  appId: "1:278830945504:web:6a06b1cbe313212c7b2c85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
// const analytics = getAnalytics(app); // Uncomment if needed

export { auth, firestore /*, analytics */ }; // Export the services you need 