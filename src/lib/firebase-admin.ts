import {
  getApps,
  getApp,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  "nerdshouse";

function getCredential() {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  return applicationDefault();
}

function getAdminApp(): App {
  const existing = getApps().find((a: App) => a.name === "[DEFAULT]");
  if (existing) return getApp();
  return initializeApp(
    { credential: getCredential(), projectId },
    "[DEFAULT]",
  );
}

let adminFirestore: Firestore | null = null;

/**
 * Server-only Firestore instance (Firebase Admin).
 * Use in API routes, server actions, and server components.
 * Requires service account: set GOOGLE_APPLICATION_CREDENTIALS or
 * FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY.
 */
export function getAdminDb(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getAdminApp());
  }
  return adminFirestore;
}

export { getAdminApp };
