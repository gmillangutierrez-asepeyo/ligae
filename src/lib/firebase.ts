import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

// IMPORTANT: This configuration is for the client-side Firebase SDK.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyD7GxppTv5E2i2_xCzPti3U4PftEw7vn_A",
  authDomain: "ligae-asepeyo-463510.firebaseapp.com",
  projectId: "ligae-asepeyo-463510",
  storageBucket: "ligae-asepeyo-463510.appspot.com",
  messagingSenderId: "624538650771",
  appId: "1:624538650771:web:cc11fec35127108a7aa566"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
