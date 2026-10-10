// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDIeCF6rJhA-H_RvDHfmpQ2WTZg0Uc09jI",
  authDomain: "expense-tracker-ccd31.firebaseapp.com",
  projectId: "expense-tracker-ccd31",
  storageBucket: "expense-tracker-ccd31.firebasestorage.app",
  messagingSenderId: "889404145854",
  appId: "1:889404145854:web:a0e58e1289138156581eef",
  measurementId: "G-5C4505Z8NW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)


// firebase login
// firbase init
// firebase deploy