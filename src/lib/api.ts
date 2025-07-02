'use client';

const PROJECT_ID = 'ligae-asepeyo-463510';
const DATABASE_ID = 'ticketsligae';
const BUCKET_NAME = 'ticketimages';

// Helper to convert data URI to Blob
function dataURIToBlob(dataURI: string) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

export async function uploadToStorage(photoDataUri: string, fileName: string, token: string) {
  const blob = dataURIToBlob(photoDataUri);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${fileName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': blob.type,
    },
    body: blob,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Storage upload failed: ${error.error.message}`);
  }

  const result = await response.json();
  // The mediaLink is an authenticated URL to download the object's data.
  // It requires an 'Authorization: Bearer <token>' header for access.
  return result.mediaLink;
}

export async function saveToFirestore(data: any, token: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/tickets`;

  const firestoreData = {
    fields: {
      sector: { stringValue: data.sector },
      importe: { doubleValue: Number(data.importe) },
      usuario: { stringValue: data.usuario },
      fecha: { stringValue: data.fecha },
      photoUrl: { stringValue: data.photoUrl },
      fileName: { stringValue: data.fileName },
    },
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
    const error = await response.json();
    throw new Error(`Firestore save failed: ${error.error.message}`);
  }

  return await response.json();
}

export async function fetchTickets(userEmail: string, token: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:runQuery`;
    
    const query = {
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
        body: JSON.stringify(query)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Firestore fetch failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data
        .filter((item: any) => item.document) // Firestore returns an empty object for one of the items sometimes
        .map((item: any) => {
            const docId = item.document.name.split('/').pop();
            return { id: docId, ...item.document.fields };
        });
}

export async function deleteFromStorage(fileName: string, token: string) {
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${fileName}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok && response.status !== 404) {
        const error = await response.json();
        throw new Error(`Storage delete failed: ${error.error.message}`);
    }
}

export async function deleteFromFirestore(docId: string, token: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/tickets/${docId}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok && response.status !== 404) {
        const error = await response.json();
        throw new Error(`Firestore delete failed: ${error.error.message}`);
    }
}
