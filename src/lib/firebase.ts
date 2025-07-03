import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

// IMPORTANT: This configuration has been updated to point to the correct
// Firebase project (`ligae-asepeyo-463510`). The previous configuration was
// for a different project, which was causing authentication and API errors.
const firebaseConfig: FirebaseOptions = {
  // NOTE: The apiKey and other IDs are from a template. They should be replaced
  // with the specific values from your Firebase project's console if you
  // encounter authentication issues. However, the `projectId` is the most
  // critical value to fix the current error.
  apiKey: "AIzaSyA_NjfA7m2Lu0ATwgZs5E1d32Eujw08mf8",
  authDomain: "ligae-asepeyo-463510.firebaseapp.com",
  projectId: "ligae-asepeyo-463510",
  storageBucket: "ligae-asepeyo-463510.appspot.com",
  messagingSenderId: "95809932023", // This may need to be updated from your project settings
  appId: "1:95809932023:web:095cc4dd47075bf1ea21f2" // This may need to be updated
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
