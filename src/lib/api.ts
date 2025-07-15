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
 * It is designed to understand standard Google Cloud error formats, including those
 * from the Firestore API which might be wrapped in an array.
 * @param response The fetch Response object.
 * @param action A description of the action that failed (e.g., "upload image").
 * @throws An error with a descriptive message.
 */
async function handleResponseError(response: Response, action: string): Promise<never> {
    let errorMessage = `Fallo al ${action}: ${response.status} ${response.statusText}`;
    try {
        const errorData = await response.json();
        console.error(`Fallo en la acción '${action}':`, errorData);
        
        // Firestore runQuery can return an error in an array, e.g. [{ "error": {...} }]
        const errorDetail = (Array.isArray(errorData) ? errorData[0]?.error : errorData.error);
        
        if (errorDetail && errorDetail.message) {
            errorMessage = `Fallo al ${action}: ${errorDetail.message}`;
        }
    } catch (e) {
        // Not a JSON response, the statusText is the best info we have.
        console.error(`No se pudo interpretar la respuesta de error para '${action}' como JSON.`);
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
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: blob,
  });

  if (!uploadResponse.ok) {
    await handleResponseError(uploadResponse, 'subir la imagen');
  }

  // The image is uploaded and remains private.
  // Construct the direct-access URL which requires authentication to be fetched.
  // Use storage.cloud.google.com for the console-like URL format.
  const authenticatedUrl = `https://storage.cloud.google.com/ticketimages/${fileName}`;
  return authenticatedUrl;
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
      fechaSubida: { timestampValue: new Date().toISOString() },
      estado: { stringValue: 'pendiente' },
      ...(data.observaciones && { observaciones: { stringValue: data.observaciones } }),
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
    await handleResponseError(response, 'guardar los datos del recibo');
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
  photoUrl: string; // This now holds the direct public URL to the GCS object
  fileName: string;
  usuario: string;
  observaciones?: string;
  fechaSubida: string;
  estado: string;
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
    observaciones: fields.observaciones?.stringValue,
    fechaSubida: fields.fechaSubida?.timestampValue || doc.createTime || new Date(0).toISOString(),
    estado: fields.estado?.stringValue || 'pendiente',
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
      orderBy: [{
        field: { fieldPath: 'fechaSubida' },
        direction: 'DESCENDING'
      }]
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
      await handleResponseError(response, 'cargar los recibos');
  }

  const results = await response.json();
  
  // The runQuery endpoint returns a JSON array.
  // It might be an empty array, an array of documents, or an array containing an error object.
  if (!Array.isArray(results)) {
    console.error("Respuesta inesperada de Firestore, no es un array:", results);
    return []; // Return empty on unexpected format
  }

  // Check if the first element signals an error, which Firestore does for some query issues.
  const potentialError = results[0]?.error;
  if (potentialError) {
      console.error('Error en la consulta a Firestore:', potentialError);
      throw new Error(`Error al cargar recibos: ${potentialError.message}`);
  }

  // Filter out any non-document items (like readTime objects) and transform the data.
  return results
    .filter((item: any) => item.document)
    .map((item: any) => transformFirestoreDoc(item.document));
}

export async function fetchAllPendingTickets(token: string, userEmails?: string[]): Promise<CleanReceipt[]> {
  // If userEmails is provided and is empty, it means the manager has no assigned users.
  // Return early to avoid an invalid Firestore query.
  if (userEmails && userEmails.length === 0) {
    return [];
  }

  const structuredQuery: any = {
    from: [{ collectionId: 'tickets' }],
    orderBy: [{
      field: { fieldPath: 'fechaSubida' },
      direction: 'DESCENDING'
    }]
  };

  const filters: any[] = [
    {
      fieldFilter: {
        field: { fieldPath: 'estado' },
        op: 'EQUAL',
        value: { stringValue: 'pendiente' },
      },
    }
  ];

  // If userEmails are provided, add the 'IN' filter.
  if (userEmails) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'usuario' },
        op: 'IN',
        value: { arrayValue: { values: userEmails.map(email => ({ stringValue: email })) } },
      },
    });
  }

  // If there's more than one filter, wrap them in a compositeFilter.
  if (filters.length > 1) {
    structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: filters,
      },
    };
  } else {
    // Otherwise, just use the single 'pendiente' filter.
    structuredQuery.where = filters[0];
  }
  
  const queryPayload = { structuredQuery };

  const response = await fetch(`${FIRESTORE_PARENT_PATH}:runQuery`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(queryPayload),
  });

  if (!response.ok) {
    await handleResponseError(response, 'cargar los recibos pendientes');
  }

  const results = await response.json();
  
  if (!Array.isArray(results)) {
    console.error("Respuesta inesperada de Firestore, no es un array:", results);
    return [];
  }

  const potentialError = results[0]?.error;
  if (potentialError) {
      console.error('Error en la consulta a Firestore:', potentialError);
      throw new Error(`Error al cargar recibos pendientes: ${potentialError.message}. Es posible que necesites crear un índice compuesto en Firestore. Revisa la consola para ver el enlace de creación del índice.`);
  }

  return results
    .filter((item: any) => item.document)
    .map((item: any) => transformFirestoreDoc(item.document));
}

export async function updateTicketStatus(
  docId: string, 
  data: { estado: 'aprobado' | 'denegado', observaciones: string }, 
  token: string
): Promise<void> {
  const updateUrl = `${FIRESTORE_COLLECTION_PATH}/${docId}?updateMask.fieldPaths=estado&updateMask.fieldPaths=observaciones`;

  const firestorePayload = {
    fields: {
      estado: { stringValue: data.estado },
      observaciones: { stringValue: data.observaciones },
    },
  };

  const response = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(firestorePayload),
  });

  if (!response.ok) {
    await handleResponseError(response, 'actualizar el estado del recibo');
  }
}

export async function deleteFromStorage(fileName: string, token: string): Promise<void> {
    const deleteUrl = `${STORAGE_BUCKET_URL}/${encodeURIComponent(fileName)}`;

    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
        await handleResponseError(response, 'eliminar la imagen');
    }
}

export async function deleteFromFirestore(docId: string, token: string): Promise<void> {
    const deleteUrl = `${FIRESTORE_COLLECTION_PATH}/${docId}`;

    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        await handleResponseError(response, 'eliminar los datos del recibo');
    }
}


// --- Hierarchy Management ---
export type ManagerHierarchy = Record<string, string[]>;

/**
 * Fetches the manager hierarchy configuration from a specific Firestore document.
 * This allows for dynamic, real-time updates to user roles and permissions without
 * needing to redeploy the application.
 *
 * @param token The authentication token required to access Firestore.
 * @returns A promise that resolves to the ManagerHierarchy object.
 */
export async function fetchHierarchy(token: string): Promise<ManagerHierarchy> {
  // Path to the specific document that stores the hierarchy.
  const hierarchyDocPath = 'https://firestore.googleapis.com/v1/projects/ligae-asepeyo-463510/databases/ticketsligae/documents/manager_hierarchy/main';

  const response = await fetch(hierarchyDocPath, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // If the document is not found (404), return an empty object, as it's a valid state.
    if (response.status === 404) {
      console.warn('El documento de jerarquía "main" no se encontró en Firestore. Se usará una jerarquía vacía.');
      return {};
    }
    // For other errors, throw an exception.
    await handleResponseError(response, 'cargar la jerarquía de managers');
  }

  const doc = await response.json();
  const hierarchyMap = doc.fields?.hierarchy?.mapValue?.fields;

  if (!hierarchyMap) {
    console.warn('El documento de jerarquía "main" no contiene un campo "hierarchy" de tipo "map" válido. Se usará una jerarquía vacía.');
    return {};
  }

  // Transform the Firestore map structure into a plain JavaScript object.
  const parsedHierarchy: ManagerHierarchy = {};
  for (const managerEmail in hierarchyMap) {
    const managedUsersArray = hierarchyMap[managerEmail]?.arrayValue?.values || [];
    parsedHierarchy[managerEmail] = managedUsersArray
      .map((userValue: any) => userValue.stringValue)
      .filter((email: string | undefined): email is string => !!email);
  }

  return parsedHierarchy;
}


/**
 * Finds the manager for a given user email by searching the hierarchy.
 * @param userEmail The email of the user.
 * @param token The authentication token to fetch the hierarchy.
 * @returns The manager's email or null if not found.
 */
export async function getManagerForUser(userEmail: string, token: string): Promise<string | null> {
    const hierarchy = await fetchHierarchy(token);
    for (const manager in hierarchy) {
        if (hierarchy[manager].includes(userEmail)) {
            return manager;
        }
    }
    return null;
}
