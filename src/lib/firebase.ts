import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

// IMPORTANT: This configuration has been updated to point to the correct
// Firebase project. The previous configuration was for a different project,
// which was causing authentication and API errors.
const firebaseConfig: FirebaseOptions = {
  // The apiKey and other IDs are from the original template. These might
  // need to be updated with the specific values from your Firebase project console
  // if you experience authentication issues.
  apiKey: "AIzaSyA_NjfA7m2Lu0ATwgZs5E1d32Eujw08mf8",
  authDomain: "ligae-asepeyo-463510.firebaseapp.com", // Corrected
  projectId: "ligae-asepeyo-463510", // Corrected
  storageBucket: "ligae-asepeyo-463510.appspot.com", // Corrected to default
  messagingSenderId: "95809932023",
  appId: "1:95809932023:web:095cc4dd47075bf1ea21f2"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
