import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

// IMPORTANT: Replace this with your own Firebase project configuration.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyA_NjfA7m2Lu0ATwgZs5E1d32Eujw08mf8",
  authDomain: "receipt-snap-e3z1z.firebaseapp.com",
  projectId: "receipt-snap-e3z1z",
  storageBucket: "receipt-snap-e3z1z.appspot.com",
  messagingSenderId: "95809932023",
  appId: "1:95809932023:web:095cc4dd47075bf1ea21f2"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
