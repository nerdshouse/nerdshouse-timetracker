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
  type CollectionReference,
  type DocumentReference,
  type QueryConstraint,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getDb } from "./firebase";

export { getDb };
export type { Firestore };

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
export type { CollectionReference, DocumentReference, QueryConstraint };

/**
 * Get a collection reference. Uses the app's Firestore instance.
 */
export function getCollection<T = Record<string, unknown>>(
  path: string,
  ...pathSegments: string[]
): CollectionReference<T> {
  return collection(getDb(), path, ...pathSegments) as CollectionReference<T>;
}

/**
 * Get a document reference.
 */
export function getDocRef(path: string, ...pathSegments: string[]) {
  return doc(getDb(), path, ...pathSegments);
}
