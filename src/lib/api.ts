// This file is intended for client-side execution. Do NOT add 'use server'.
// It uses the Fetch API to communicate with Google Cloud REST endpoints.

// Base path for Firestore documents, used for running queries.
const FIRESTORE_PARENT_PATH = 'https://firestore.googleapis.com/v1/projects/ligae-asepeyo-463510/databases/ticketsligae/documents';
// Specific path for the 'tickets' collection, used for CRUD operations on individual documents.
const FIRESTORE_COLLECTION_PATH = `${FIRESTORE_PARENT_PATH}/tickets`;

const STORAGE_UPLOAD_URL = 'https://storage.googleapis.com/upload/storage/v1/b/ticketimages/o';
const STORAGE_BUCKET_URL = 'https://storage.googleapis.com/storage/v1/b/ticketimages/o';

/**
 * A helper function to handle API response errors consistently.
 * @param response The fetch Response object.
 * @param action A description of the action that failed (e.g., "upload image").
 * @throws An error with a descriptive message.
 */
async function handleResponseError(response: Response, action: string): Promise<never> {
    let errorMessage = `Failed to ${action}: ${response.status} ${response.statusText}`;
    try {
        const errorData = await response.json();
        console.error(`${action} failed:`, errorData);
        // Google Cloud APIs usually have a standard error format
        if (errorData.error && errorData.error.message) {
            errorMessage = `Failed to ${action}: ${errorData.error.message}`;
        }
    } catch (e) {
        // Not a JSON response, the statusText is the best info we have.
        console.error(`Could not parse error response for ${action} as JSON.`);
    }
    throw new Error(errorMessage);
}


function dataURIToBlob(dataURI: string): Blob {
  const [meta, data] = dataURI.split(',');
  const mimeType = meta.split(':')[1].split(';')[0];
  const byteString = atob(data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

export async function uploadToStorage(photoDataUri: string, fileName: string, token: string): Promise<string> {
  const blob = dataURIToBlob(photoDataUri);
  const uploadUrl = `${STORAGE_UPLOAD_URL}?uploadType=media&name=${fileName}`;
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: blob,
  });

  if (!response.ok) {
    await handleResponseError(response, 'upload image');
  }

  // Manually construct the public URL for consistency
  const publicUrl = `https://storage.googleapis.com/ticketimages/${fileName}`;

  // Make the file public so it can be viewed in the browser
  const aclUrl = `${STORAGE_BUCKET_URL}/${encodeURIComponent(fileName)}/acl`;
  const aclResponse = await fetch(aclUrl, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entity: 'allUsers', role: 'READER' }),
  });

  if (!aclResponse.ok) {
    await handleResponseError(aclResponse, 'make image public');
  }

  return publicUrl;
}

export async function saveToFirestore(data: any, token: string): Promise<{ id: string }> {
  const firestorePayload = {
    fields: {
      sector: { stringValue: data.sector },
      importe: { doubleValue: Number(data.importe) },
      fecha: { stringValue: data.fecha },
      usuario: { stringValue: data.usuario },
      photoUrl: { stringValue: data.photoUrl },
      fileName: { stringValue: data.fileName },
    },
  };

  const response = await fetch(FIRESTORE_COLLECTION_PATH, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(firestorePayload),
  });

  if (!response.ok) {
    await handleResponseError(response, 'save receipt data');
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
  usuario: string;
}

function transformFirestoreDoc(doc: any): CleanReceipt {
  const id = doc.name.split('/').pop();
  const fields = doc.fields;
  return {
    id: id,
    sector: fields.sector?.stringValue || 'otros',
    importe: fields.importe?.doubleValue || fields.importe?.integerValue || 0,
    fecha: fields.fecha?.stringValue || '',
    photoUrl: fields.photoUrl?.stringValue || '',
    fileName: fields.fileName?.stringValue || '',
    usuario: fields.usuario?.stringValue || '',
  };
}

export async function fetchTickets(userEmail: string, token: string): Promise<CleanReceipt[]> {
  const queryPayload = {
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

  const response = await fetch(`${FIRESTORE_PARENT_PATH}:runQuery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryPayload),
  });

  if (!response.ok) {
      await handleResponseError(response, 'load receipts');
  }

  const results = await response.json();
  if (!Array.isArray(results)) return [];

  return results
    .filter((item: any) => item.document)
    .map((item: any) => transformFirestoreDoc(item.document));
}

export async function deleteFromStorage(fileName: string, token: string): Promise<void> {
    const deleteUrl = `${STORAGE_BUCKET_URL}/${encodeURIComponent(fileName)}`;

    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
        await handleResponseError(response, 'delete image');
    }
}

export async function deleteFromFirestore(docId: string, token: string): Promise<void> {
    const deleteUrl = `${FIRESTORE_COLLECTION_PATH}/${docId}`;

    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        await handleResponseError(response, 'delete receipt data');
    }
}
