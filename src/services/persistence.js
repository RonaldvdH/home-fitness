import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { APP_STATE, STORAGE_KEYS, saveLocalState } from '../state/store.js';

let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;
let cloudAvailable = false;

export function getCloudStatus() {
  return { auth, db, currentUser, cloudAvailable };
}

/**
 * Initialize optional Firebase Auth + Firestore sync.
 * Falls back transparently to localStorage when __firebase_config is absent.
 */
export async function initCloudPersistence({ onSyncStatus, onRemoteHydrated }) {
  const rawFirebaseConfig =
    typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : null;

  if (!rawFirebaseConfig || !rawFirebaseConfig.apiKey) {
    onSyncStatus?.('local', 'Saved Locally (Auto)', null);
    return;
  }

  try {
    firebaseApp = initializeApp(rawFirebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    cloudAvailable = true;

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        const label = user.isAnonymous
          ? 'Cloud Session Active'
          : `Synced (${user.displayName || user.email})`;
        onSyncStatus?.('cloud', label, user);
        await pullStateFromFirestore(user.uid, { onSyncStatus, onRemoteHydrated });
      } else {
        try {
          await signInAnonymously(auth);
        } catch {
          onSyncStatus?.('local', 'Saved Locally', null);
        }
      }
    });
  } catch (err) {
    console.warn('Firebase init skipped, using localStorage:', err);
    onSyncStatus?.('local', 'Saved Locally', null);
  }
}

export async function pullStateFromFirestore(uid, { onSyncStatus, onRemoteHydrated }) {
  if (!db || !uid) return;
  try {
    onSyncStatus?.('syncing', 'Syncing...', currentUser);
    const userDocRef = doc(db, 'dumbbell_workouts', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.exercises) && data.exercises.length > 0) {
        APP_STATE.exercises = data.exercises;
        localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(APP_STATE.exercises));
      }
      if (data.settings) {
        APP_STATE.settings = { ...APP_STATE.settings, ...data.settings };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(APP_STATE.settings));
      }
      if (Array.isArray(data.history)) {
        APP_STATE.history = data.history;
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(APP_STATE.history));
      }
      onRemoteHydrated?.();
    } else {
      await persistAllState(onSyncStatus);
    }
    const label = currentUser?.isAnonymous
      ? 'Saved to Cloud'
      : `Synced (${currentUser?.displayName || 'Google'})`;
    onSyncStatus?.('cloud', label, currentUser);
  } catch (err) {
    console.warn('Firestore pull failed:', err);
    onSyncStatus?.('local', 'Saved Locally', currentUser);
  }
}

export async function persistAllState(onSyncStatus) {
  saveLocalState();

  if (db && currentUser) {
    try {
      onSyncStatus?.('syncing', 'Saving...', currentUser);
      const userDocRef = doc(db, 'dumbbell_workouts', currentUser.uid);
      await setDoc(
        userDocRef,
        {
          exercises: APP_STATE.exercises,
          settings: APP_STATE.settings,
          history: APP_STATE.history,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      const label = currentUser.isAnonymous
        ? 'Saved to Cloud'
        : `Synced (${currentUser.displayName || 'Google'})`;
      onSyncStatus?.('cloud', label, currentUser);
    } catch (err) {
      console.warn('Firestore save failed, kept locally:', err);
      onSyncStatus?.('local', 'Saved Locally', currentUser);
    }
  } else {
    onSyncStatus?.('local', 'Saved Locally', currentUser);
  }
}

export async function signInWithGoogle() {
  if (!auth) return { ok: false, reason: 'no-auth' };
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  return { ok: true };
}

export async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}
