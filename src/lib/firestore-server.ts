/**
 * Server-only Firestore helpers. Use in API routes, server actions, getServerSideProps.
 * Uses Firebase Admin SDK (getAdminDb). Do not import in client components.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type DocumentData,
  type QueryConstraint,
} from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

export { getAdminDb };

export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
};
export type { DocumentData, QueryConstraint };

/**
 * Server-side collection reference.
 */
export function collectionRef(path: string, ...pathSegments: string[]) {
  return collection(getAdminDb(), path, ...pathSegments);
}

/**
 * Server-side document reference.
 */
export function docRef(path: string, ...pathSegments: string[]) {
  return doc(getAdminDb(), path, ...pathSegments);
}
