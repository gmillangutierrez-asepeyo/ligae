'use server';

import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

const PROJECT_ID = 'ligae-asepeyo-463510';
const BUCKET_NAME = 'ligae-asepeyo-463510.appspot.com'; 

// Initialize Google Cloud clients.
// The SDKs will automatically use the service account credentials
// if the GOOGLE_SERVICE_ACCOUNT_KEY_JSON environment variable is set.
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON!);

const db = new Firestore({ projectId: PROJECT_ID, credentials });
const storage = new Storage({ projectId: PROJECT_ID, credentials });
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Converts a data URI string into a Buffer.
 * @param dataURI The data URI to convert.
 * @returns A Buffer containing the image data and its mime type.
 */
function dataURIToBuffer(dataURI: string): { buffer: Buffer; mimeType: string } {
  if (!dataURI.includes(',')) {
    throw new Error('Invalid data URI');
  }
  const [meta, data] = dataURI.split(',');
  const mimeType = meta.split(':')[1].split(';')[0];
  const buffer = Buffer.from(data, 'base64');
  return { buffer, mimeType };
}

/**
 * Uploads a file (from a data URI) to Google Cloud Storage.
 * @param photoDataUri The photo data as a data URI string.
 * @param fileName The desired file name in the bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadToStorage(photoDataUri: string, fileName: string): Promise<string> {
  const { buffer, mimeType } = dataURIToBuffer(photoDataUri);
  const file = bucket.file(fileName);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
  });

  return file.publicUrl();
}

/**
 * Saves a new receipt document to Firestore.
 * @param data The receipt data to save.
 * @returns An object containing the ID of the newly created document.
 */
export async function saveToFirestore(data: any): Promise<{ id: string }> {
  const docRef = await db.collection('tickets').add({
    ...data,
    // Ensure importe is stored as a number
    importe: Number(data.importe)
  });
  return { id: docRef.id };
}

// Interface for a cleanly formatted receipt object.
export interface CleanReceipt {
  id: string;
  sector: string;
  importe: number;
  fecha: string;
  photoUrl: string;
  fileName: string;
  usuario: string; // Add usuario to the interface
}

/**
 * Fetches all receipt tickets for a specific user from Firestore.
 * @param userEmail The email of the user whose receipts to fetch.
 * @returns An array of receipt objects.
 */
export async function fetchTickets(userEmail: string): Promise<CleanReceipt[]> {
  const ticketsCollection = db.collection('tickets');
  const snapshot = await ticketsCollection.where('usuario', '==', userEmail).get();

  if (snapshot.empty) {
    return [];
  }

  const receipts: CleanReceipt[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    receipts.push({
      id: doc.id,
      sector: data.sector || 'otros',
      importe: data.importe || 0,
      fecha: data.fecha || '',
      photoUrl: data.photoUrl || '',
      fileName: data.fileName || '',
      usuario: data.usuario || '',
    });
  });
  
  return receipts;
}

/**
 * Deletes a file from Google Cloud Storage.
 * @param fileName The full path of the file to delete.
 */
export async function deleteFromStorage(fileName: string): Promise<void> {
  try {
    // Prevent deleting from unintended paths
    if (!fileName.startsWith('ticketimages/')) {
        throw new Error("Invalid file path for deletion.");
    }
    await bucket.file(fileName).delete();
  } catch (error: any) {
    // It's okay if the file doesn't exist (e.g., error code 404).
    if (error.code !== 404) {
      console.error('Storage delete failed:', error);
      throw new Error(`Storage delete failed: ${error.message}`);
    }
  }
}

/**
 * Deletes a document from the 'tickets' collection in Firestore.
 * @param docId The ID of the document to delete.
 */
export async function deleteFromFirestore(docId: string): Promise<void> {
  await db.collection('tickets').doc(docId).delete();
}
