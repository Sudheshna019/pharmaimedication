import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AnalysisResult } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyDLmBPCpz6LEv3zoKY9nWc3QQR9qg_bhKQ",
  authDomain: "ddi-and-adr.firebaseapp.com",
  projectId: "ddi-and-adr",
  storageBucket: "ddi-and-adr.firebasestorage.app",
  messagingSenderId: "126488630814",
  appId: "1:126488630814:web:e08512407f1ca9adf7000f"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Synchronizes an analysis result directly into Firestore under user collection
 */
export async function syncAnalysisToFirestore(userId: string, result: AnalysisResult): Promise<boolean> {
  if (!userId || userId === 'GUEST-001' || userId === 'usr_guest') {
    return false;
  }
  try {
    const docRef = doc(db, "users", userId, "analyses", result.id);
    await setDoc(docRef, {
      ...result,
      syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Client Firestore sync notice:", error);
    return false;
  }
}

/**
 * Fetches user-isolated analysis history directly from Firestore
 */
export async function fetchUserAnalysesFromFirestore(userId: string): Promise<AnalysisResult[]> {
  if (!userId || userId === 'GUEST-001' || userId === 'usr_guest') {
    return [];
  }
  try {
    const collRef = collection(db, "users", userId, "analyses");
    const snapshot = await getDocs(collRef);
    const results: AnalysisResult[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        results.push(docSnap.data() as AnalysisResult);
      }
    });
    return results;
  } catch (error) {
    console.warn("Client Firestore fetch notice:", error);
    return [];
  }
}

/**
 * Deletes an analysis result directly from Firestore under user collection
 */
export async function deleteAnalysisFromFirestore(userId: string, analysisId: string): Promise<boolean> {
  if (!userId || userId === 'GUEST-001' || userId === 'usr_guest') {
    return false;
  }
  try {
    const docRef = doc(db, "users", userId, "analyses", analysisId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn("Client Firestore delete notice:", error);
    return false;
  }
}