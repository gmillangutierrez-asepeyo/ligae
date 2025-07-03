// IMPORTANT: This file contains client-side logic.

const PROJECT_ID = 'receipt-snap-e3z1z';
const BUCKET_NAME = `${PROJECT_ID}.appspot.com`;

function getAuthToken(): string {
  if (typeof window === 'undefined') {
    // This function should not be called on the server.
    return '';
  }
  const token = localStorage.getItem('oauth_token');
  if (!token) {
    throw new Error('OAuth token not found. Please set it on the Settings page.');
  }
  return token;
}

function dataURIToBuffer(dataURI: string): ArrayBuffer {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return ab;
}

export async function uploadToStorage(photoDataUri: string, fileName: string): Promise<string> {
  const token = getAuthToken();
  const buffer = dataURIToBuffer(photoDataUri);
  const mimeType = photoDataUri.substring(photoDataUri.indexOf(':') + 1, photoDataUri.indexOf(';'));

  const response = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(fileName)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': mimeType,
      'Content-Length': buffer.byteLength.toString(),
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Storage upload failed:', errorData);
    throw new Error(`Storage upload failed: ${errorData.error.message}`);
  }
  
  // The public URL for the object
  return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
}

export async function saveToFirestore(data: any): Promise<{ id: string }> {
    const token = getAuthToken();
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tickets`;

    const firestoreData = {
        fields: {
            sector: { stringValue: data.sector },
            importe: { doubleValue: Number(data.importe) },
            usuario: { stringValue: data.usuario },
            fecha: { stringValue: data.fecha },
            photoUrl: { stringValue: data.photoUrl },
            fileName: { stringValue: data.fileName },
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(firestoreData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Firestore save failed:', errorData);
        throw new Error(`Firestore save failed: ${errorData.error.message}`);
    }

    const result = await response.json();
    const docId = result.name.split('/').pop();
    return { id: docId };
}

export interface CleanReceipt {
  id: string;
  sector: string;
  importe: number;
  fecha: string;
  photoUrl: string;
  fileName: string;
}

// Helper to parse Firestore's specific object format
const parseFirestoreDoc = (doc: any): CleanReceipt => {
    const fields = doc.document.fields;
    return {
        id: doc.document.name.split('/').pop(),
        sector: fields.sector?.stringValue || 'otros',
        importe: fields.importe?.doubleValue || fields.importe?.integerValue || 0,
        fecha: fields.fecha?.stringValue || '',
        photoUrl: fields.photoUrl?.stringValue || '',
        fileName: fields.fileName?.stringValue || '',
    };
};


export async function fetchTickets(userEmail: string): Promise<CleanReceipt[]> {
    const token = getAuthToken();
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

    const body = {
        structuredQuery: {
            from: [{ collectionId: 'tickets' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'usuario' },
                    op: 'EQUAL',
                    value: { stringValue: userEmail },
                },
            },
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Firestore fetch failed:', errorData);
        throw new Error(`Firestore fetch failed: ${errorData.error.message}`);
    }
    
    const results = await response.json();
    if (!results || results.length === 0 || !results[0].document) {
        return []; // No documents found
    }
    
    return results.map(parseFirestoreDoc);
}


export async function deleteFromStorage(fileName: string): Promise<void> {
    const token = getAuthToken();
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(fileName)}`;
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    // It's okay if the file doesn't exist (404)
    if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        console.error('Storage delete failed:', errorData);
        throw new Error(`Storage delete failed: ${errorData.error.message}`);
    }
}

export async function deleteFromFirestore(docId: string): Promise<void> {
    const token = getAuthToken();
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tickets/${docId}`;
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        console.error('Firestore delete failed:', errorData);
        throw new Error(`Firestore delete failed: ${errorData.error.message}`);
    }
}
