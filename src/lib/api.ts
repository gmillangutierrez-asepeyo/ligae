'use server';

import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

// These environment variables are automatically available in Firebase App Hosting.
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'ligae-asepeyo-463510';
const BUCKET_NAME = 'ticketimages';

// Initialize clients. They will automatically use the service account credentials
// from the environment when deployed to App Hosting.
const firestore = new Firestore({ projectId: PROJECT_ID });
const storage = new Storage({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

// Helper to convert data URI to Buffer
function dataURIToBuffer(dataURI: string) {
  return Buffer.from(dataURI.split(',')[1], 'base64');
}

export async function uploadToStorage(photoDataUri: string, fileName: string) {
  try {
    const buffer = dataURIToBuffer(photoDataUri);
    const file = bucket.file(fileName);
    
    // Determine the content type from the data URI
    const mimeString = photoDataUri.split(',')[0].split(':')[1].split(';')[0];

    await file.save(buffer, {
      metadata: {
        contentType: mimeString,
      },
    });

    // Return the public URL. Note: The bucket must be publicly readable,
    // or you'd need to generate signed URLs for access.
    // For simplicity here, we assume public access.
    return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error('Storage upload failed:', error);
    throw new Error('Storage upload failed.');
  }
}

export async function saveToFirestore(data: any) {
  try {
    const collectionRef = firestore.collection('tickets');
    const docRef = await collectionRef.add({
      sector: data.sector,
      importe: Number(data.importe),
      usuario: data.usuario,
      fecha: data.fecha,
      photoUrl: data.photoUrl,
      fileName: data.fileName,
    });
    return { id: docRef.id };
  } catch (error) {
    console.error('Firestore save failed:', error);
    throw new Error('Firestore save failed.');
  }
}

export async function fetchTickets(userEmail: string) {
  try {
    const ticketsRef = firestore.collection('tickets');
    const snapshot = await ticketsRef.where('usuario', '==', userEmail).get();
    
    if (snapshot.empty) {
      return [];
    }

    // Generate signed URLs for each image for secure, temporary access
    const receipts = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let signedUrl = '';
      if (data.fileName) {
          try {
              const [url] = await bucket.file(data.fileName).getSignedUrl({
                  action: 'read',
                  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
              });
              signedUrl = url;
          } catch(e) {
              console.error(`Failed to get signed URL for ${data.fileName}:`, e)
              signedUrl = `https://placehold.co/400x400.png` // Fallback URL
          }
      }

      return {
        id: doc.id,
        sector: { stringValue: data.sector },
        importe: { doubleValue: data.importe },
        fecha: { stringValue: data.fecha },
        // Instead of the raw photoUrl, we send a temporary signed URL
        photoUrl: { stringValue: signedUrl }, 
        fileName: { stringValue: data.fileName },
      };
    }));

    return receipts;
  } catch (error) {
    console.error('Firestore fetch failed:', error);
    throw new Error('Firestore fetch failed.');
  }
}

export async function deleteFromStorage(fileName: string) {
  try {
    await bucket.file(fileName).delete();
  } catch (error: any) {
    // It's okay if the file doesn't exist (e.g., already deleted)
    if (error.code !== 404) {
      console.error('Storage delete failed:', error);
      throw new Error('Storage delete failed.');
    }
  }
}

export async function deleteFromFirestore(docId: string) {
  try {
    await firestore.collection('tickets').doc(docId).delete();
  } catch (error) {
    console.error('Firestore delete failed:', error);
    throw new Error('Firestore delete failed.');
  }
}
