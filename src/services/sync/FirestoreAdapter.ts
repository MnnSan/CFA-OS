/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../firebase';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';

export class FirestoreAdapter {
  private static instance: FirestoreAdapter;

  private constructor() {}

  public static getInstance(): FirestoreAdapter {
    if (!FirestoreAdapter.instance) {
      FirestoreAdapter.instance = new FirestoreAdapter();
    }
    return FirestoreAdapter.instance;
  }

  // --- Coach Plans (Templates) ---

  public async getCoachPlans(uid: string): Promise<Record<string, any>> {
    const colRef = collection(db, 'users', uid, 'coachPlans');
    const snap = await getDocs(colRef);
    const plans: Record<string, any> = {};
    snap.forEach(docSnap => {
      plans[docSnap.id] = docSnap.data();
    });
    return plans;
  }

  public async saveCoachPlan(uid: string, templateId: string, plan: any): Promise<void> {
    const docRef = doc(db, 'users', uid, 'coachPlans', templateId);
    await setDoc(docRef, plan, { merge: true });
  }

  public async deleteCoachPlan(uid: string, templateId: string): Promise<void> {
    const docRef = doc(db, 'users', uid, 'coachPlans', templateId);
    await deleteDoc(docRef);
  }

  // --- Study Strategy ---

  public async getStudyStrategy(uid: string): Promise<any> {
    const docRef = doc(db, 'users', uid, 'studyStrategy', 'main');
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  public async saveStudyStrategy(uid: string, strategy: any): Promise<void> {
    const docRef = doc(db, 'users', uid, 'studyStrategy', 'main');
    await setDoc(docRef, strategy, { merge: true });
  }

  // --- Metadata ---

  public async getMetadata(uid: string): Promise<any> {
    const docRef = doc(db, 'users', uid, 'metadata', 'main');
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  public async saveMetadata(uid: string, metadata: any): Promise<void> {
    const docRef = doc(db, 'users', uid, 'metadata', 'main');
    await setDoc(docRef, metadata, { merge: true });
  }

  // --- Analytics ---

  public async saveAnalyticsEvent(uid: string, event: any): Promise<void> {
    const docRef = doc(db, 'users', uid, 'analyticsEvents', event.id);
    await setDoc(docRef, event);
  }
}

export const firestoreAdapter = FirestoreAdapter.getInstance();
