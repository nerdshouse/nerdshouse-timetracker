/**
 * Server-only Firestore helpers. Use in API routes, server actions, getServerSideProps.
 * Uses Firebase Admin SDK (getAdminDb). Do not import in client components.
 * Admin API uses the Firestore instance: db.collection(), db.doc(), ref.get(), etc.
 */
import type { CollectionReference, DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

export { getAdminDb };

/**
 * Server-side collection reference.
 * collectionRef('projects') or collectionRef('projects', 'projId', 'tasks') for subcollections.
 */
export function collectionRef(path: string, ...pathSegments: string[]): CollectionReference {
  const db = getAdminDb();
  let ref: CollectionReference | DocumentReference = db.collection(path);
  for (let i = 0; i < pathSegments.length; i += 2) {
    const docId = pathSegments[i];
    const nextCol = pathSegments[i + 1];
    if (!docId) break;
    ref = (ref as CollectionReference).doc(docId);
    if (nextCol) ref = (ref as DocumentReference).collection(nextCol);
  }
  return ref as CollectionReference;
}

/**
 * Server-side document reference. Pass collection path and doc id, or full path.
 */
export function docRef(collectionPath: string, docId?: string): DocumentReference {
  const db = getAdminDb();
  if (docId === undefined) return db.doc(collectionPath);
  return db.collection(collectionPath).doc(docId);
}
