
'use server';

import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

const PROJECT_ID = 'ligae-asepeyo-463510';
const BUCKET_NAME = 'ticketimages';
const FIRESTORE_DATABASE_ID = 'ticketsligae';
const FIRESTORE_COLLECTION_ID = 'tickets';

const credentials = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!credentials.client_email || !credentials.private_key) {
  console.error("FATAL: Service account credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) are not set in environment variables.");
}

const db = new Firestore({ projectId: PROJECT_ID, credentials, databaseId: FIRESTORE_DATABASE_ID });
const storage = new Storage({ projectId: PROJECT_ID, credentials });
const bucket = storage.bucket(BUCKET_NAME);

function dataURIToBuffer(dataURI: string): { buffer: Buffer; mimeType: string } {
  if (!dataURI.includes(',')) {
    throw new Error('Invalid data URI');
  }
  const [meta, data] = dataURI.split(',');
  const mimeType = meta.split(':')[1].split(';')[0];
  const buffer = Buffer.from(data, 'base64');
  return { buffer, mimeType };
}

export async function uploadToStorage(photoDataUri: string, fileName: string): Promise<string> {
  const { buffer, mimeType } = dataURIToBuffer(photoDataUri);
  const file = bucket.file(fileName);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
  });

  await file.makePublic();
  
  return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
}

export async function saveToFirestore(data: any): Promise<{ id: string }> {
  const docRef = await db.collection(FIRESTORE_COLLECTION_ID).add({
    ...data,
    importe: Number(data.importe)
  });
  return { id: docRef.id };
}

export interface CleanReceipt {
  id: string;
  sector: string;
  importe: number;
  fecha: string;
  photoUrl: string;
  fileName: string;
  usuario: string;
}

export async function fetchTickets(userEmail: string): Promise<CleanReceipt[]> {
  const ticketsCollection = db.collection(FIRESTORE_COLLECTION_ID);
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

export async function deleteFromStorage(fileName: string): Promise<void> {
  try {
    if (!fileName.startsWith('ticketimages/')) {
        throw new Error("Invalid file path for deletion.");
    }
    await bucket.file(fileName).delete();
  } catch (error: any) {
    if (error.code !== 404) {
      console.error('Storage delete failed:', error);
      throw new Error(`Storage delete failed: ${error.message}`);
    }
  }
}

export async function deleteFromFirestore(docId: string): Promise<void> {
  await db.collection(FIRESTORE_COLLECTION_ID).doc(docId).delete();
}
