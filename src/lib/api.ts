// This file is intended for client-side execution. Do NOT add 'use server'.
// It uses the Fetch API to communicate with Google Cloud REST endpoints.

const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/ligae-asepeyo-463510/databases/ticketsligae/documents/tickets';
const STORAGE_UPLOAD_URL = 'https://storage.googleapis.com/upload/storage/v1/b/ticketimages/o';

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
    const errorData = await response.json();
    console.error("Storage upload failed:", errorData);
    throw new Error(`Failed to upload image: ${errorData.error.message}`);
  }

  const result = await response.json();
  return `https://storage.googleapis.com/${result.bucket}/${result.name}`;
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

  const response = await fetch(FIRESTORE_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(firestorePayload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Firestore save failed:", errorData);
    throw new Error(`Failed to save data: ${errorData.error.message}`);
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

  const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryPayload),
  });

  if (!response.ok) {
      const errorData = await response.json();
      console.error("Firestore fetch failed:", errorData);
      throw new Error(`Failed to load receipts: ${errorData.error.message}`);
  }

  const results = await response.json();
  if (!Array.isArray(results)) return [];

  return results
    .filter((item: any) => item.document)
    .map((item: any) => transformFirestoreDoc(item.document));
}

export async function deleteFromStorage(fileName: string, token: string): Promise<void> {
    const deleteUrl = `https://storage.googleapis.com/storage/v1/b/ticketimages/o/${encodeURIComponent(fileName)}`;

    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
        const errorData = await response.json();
        throw new Error(`Failed to delete image: ${errorData.error.message}`);
    }
}

export async function deleteFromFirestore(docId: string, token: string): Promise<void> {
    const deleteUrl = `${FIRESTORE_BASE_URL}/${docId}`;

    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete data: ${errorData.error.message}`);
    }
}
