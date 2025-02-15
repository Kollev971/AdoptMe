import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Load service account from JSON file
const serviceAccountPath = path.join(process.cwd(), 'attached_assets', 'doggycat-5b20c-firebase-adminsdk-fbsvc-cc965d8904.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

export const auth = getAuth(app);

export async function setAdminRole(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    return true;
  } catch (error) {
    console.error('Error setting admin role:', error);
    return false;
  }
}