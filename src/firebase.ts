/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  Firestore
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD9wIs_MfgZ4atxbnruUzKMBLgjkCtCBMM",
  authDomain: "cfa-l3-dashboard.firebaseapp.com",
  projectId: "cfa-l3-dashboard",
  storageBucket: "cfa-l3-dashboard.firebasestorage.app",
  messagingSenderId: "1012431565553",
  appId: "1:1012431565553:web:6c81c2a5494ea49e526f50",
  measurementId: "G-3J4RSD3L2L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with persistence and stable settings
let db: Firestore;
try {
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: undefined // will be handled by enableIndexedDbPersistence
  });
  enableIndexedDbPersistence(db, { forceOwnership: false }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore: Multiple tabs open — persistence disabled on this tab');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore: Browser does not support persistence');
    } else {
      console.error('Firestore: Persistence enable failed', err);
    }
  });
} catch (e) {
  console.error('Firestore: Initialization failed, falling back to getFirestore', e);
  db = getFirestore(app);
}

const googleProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  db,
  googleProvider,
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  firebaseUpdateProfile,
  onAuthStateChanged
};
