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
      motivo: { stringValue: '' }, // Initialize an empty reason
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
  photoUrl: string;
  fileName: string;
  usuario: string;
  observaciones?: string;
  motivo?: string;
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
    motivo: fields.motivo?.stringValue,
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
  
  if (!Array.isArray(results)) {
    console.error("Respuesta inesperada de Firestore, no es un array:", results);
    return [];
  }

  const potentialError = results[0]?.error;
  if (potentialError) {
      console.error('Error en la consulta a Firestore:', potentialError);
      throw new Error(`Error al cargar recibos: ${potentialError.message}`);
  }

  return results
    .filter((item: any) => item.document)
    .map((item: any) => transformFirestoreDoc(item.document));
}

export async function fetchAllPendingTickets(token: string, userEmails?: string[]): Promise<CleanReceipt[]> {
  if (userEmails && userEmails.length === 0) {
    return [];
  }

  const filters: any[] = [
    {
      fieldFilter: {
        field: { fieldPath: 'estado' },
        op: 'EQUAL',
        value: { stringValue: 'pendiente' },
      },
    }
  ];

  if (userEmails) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'usuario' },
        op: 'IN',
        value: { arrayValue: { values: userEmails.map(email => ({ stringValue: email })) } },
      },
    });
  }
  
  const structuredQuery: any = {
    from: [{ collectionId: 'tickets' }],
    orderBy: [{
      field: { fieldPath: 'fechaSubida' },
      direction: 'DESCENDING'
    }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: filters,
      },
    },
  };
  
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
      throw new Error(`Error al cargar recibos pendientes: ${potentialError.message}. Es posible que necesites crear un índice compuesto en Firestore. Revisa la consola para ver el enlace de creación del índice. Asegúrate de que la primera prioridad sea 'fechaSubida' (descendente).`);
  }

  return results
    .filter((item: any) => item.document)
    .map((item: any) => transformFirestoreDoc(item.document));
}

export async function updateTicketStatus(
  docId: string, 
  data: { estado: 'aprobado' | 'denegado', motivo: string }, 
  token: string
): Promise<void> {
  const updateUrl = `${FIRESTORE_COLLECTION_PATH}/${docId}?updateMask.fieldPaths=estado&updateMask.fieldPaths=motivo`;

  const firestorePayload = {
    fields: {
      estado: { stringValue: data.estado },
      motivo: { stringValue: data.motivo },
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


// --- Role & Hierarchy Management ---
export type ManagerHierarchy = Record<string, string[]>;

export async function fetchHierarchy(token: string): Promise<ManagerHierarchy> {
  const hierarchyDocPath = 'https://firestore.googleapis.com/v1/projects/ligae-asepeyo-463510/databases/ticketsligae/documents/manager_hierarchy/main';

  const response = await fetch(hierarchyDocPath, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.warn('El documento de jerarquía "main" no se encontró. Se usará una jerarquía vacía.');
      return {};
    }
    await handleResponseError(response, 'cargar la jerarquía de managers');
  }

  const doc = await response.json();
  const hierarchyMap = doc.fields?.hierarchy?.mapValue?.fields;

  if (!hierarchyMap) {
    console.warn('El documento de jerarquía "main" no contiene un campo "hierarchy" válido. Se usará una jerarquía vacía.');
    return {};
  }

  const parsedHierarchy: ManagerHierarchy = {};
  for (const managerEmail in hierarchyMap) {
    const managedUsersArray = hierarchyMap[managerEmail]?.arrayValue?.values || [];
    parsedHierarchy[managerEmail] = managedUsersArray
      .map((userValue: any) => userValue.stringValue)
      .filter((email: string | undefined): email is string => !!email);
  }

  return parsedHierarchy;
}

export async function fetchExporterEmails(token: string): Promise<string[]> {
  const exportersDocPath = 'https://firestore.googleapis.com/v1/projects/ligae-asepeyo-463510/databases/ticketsligae/documents/manager_hierarchy/exporters';
  
  const response = await fetch(exportersDocPath, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.warn('El documento "exporters" no se encontró. Nadie tendrá permisos de exportación.');
      return [];
    }
    await handleResponseError(response, 'cargar la lista de exportadores');
  }

  const doc = await response.json();
  const emailsArray = doc.fields?.emails?.arrayValue?.values || [];
  return emailsArray
    .map((v: any) => v.stringValue)
    .filter((email: string | undefined): email is string => !!email);
}


export async function getManagersForUser(userEmail: string, token: string): Promise<string[]> {
    const hierarchy = await fetchHierarchy(token);
    const managers: string[] = [];
    
    if (hierarchy[userEmail]) {
        managers.push(userEmail);
    }

    for (const manager in hierarchy) {
        if (hierarchy[manager].includes(userEmail)) {
            if (!managers.includes(manager)) {
                managers.push(manager);
            }
        }
    }
    
    return Array.from(new Set(managers));
}

// --- Data for Export Page ---

interface ApprovedTicketsFilters {
    userEmail?: string;
    startDate?: Date;
    endDate?: Date;
}

export async function fetchAllApprovedTickets(token: string, filters: ApprovedTicketsFilters = {}): Promise<CleanReceipt[]> {
    const queryFilters: any[] = [
        {
            fieldFilter: {
                field: { fieldPath: 'estado' },
                op: 'EQUAL',
                value: { stringValue: 'aprobado' },
            },
        }
    ];

    if (filters.userEmail) {
        queryFilters.push({
            fieldFilter: {
                field: { fieldPath: 'usuario' },
                op: 'EQUAL',
                value: { stringValue: filters.userEmail },
            },
        });
    }

    if (filters.startDate) {
        queryFilters.push({
            fieldFilter: {
                field: { fieldPath: 'fecha' },
                op: 'GREATER_THAN_OR_EQUAL',
                value: { stringValue: filters.startDate.toISOString().split('T')[0] },
            },
        });
    }

    if (filters.endDate) {
        queryFilters.push({
            fieldFilter: {
                field: { fieldPath: 'fecha' },
                op: 'LESS_THAN_OR_EQUAL',
                value: { stringValue: filters.endDate.toISOString().split('T')[0] },
            },
        });
    }
    
    const structuredQuery: any = {
        from: [{ collectionId: 'tickets' }],
        orderBy: [{
            field: { fieldPath: 'fechaSubida' },
            direction: 'DESCENDING'
        }],
        where: {
            compositeFilter: {
                op: 'AND',
                filters: queryFilters,
            },
        },
    };
  
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
        await handleResponseError(response, 'cargar los recibos aprobados');
    }

    const results = await response.json();
  
    if (!Array.isArray(results)) return [];
    const potentialError = results[0]?.error;
    if (potentialError) {
        throw new Error(`Error al cargar recibos aprobados: ${potentialError.message}. Puede que necesites un índice compuesto. Revisa la consola para ver el enlace.`);
    }

    return results
        .filter((item: any) => item.document)
        .map((item: any) => transformFirestoreDoc(item.document));
}

export async function fetchAllUsers(token: string): Promise<string[]> {
    const queryPayload = {
        structuredQuery: {
            from: [{ collectionId: 'tickets' }],
            select: { fields: [{ fieldPath: 'usuario' }] },
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
        await handleResponseError(response, 'cargar la lista de usuarios');
    }

    const results = await response.json();
    if (!Array.isArray(results)) return [];

    const emails = results
        .filter((item: any) => item.document?.fields?.usuario?.stringValue)
        .map((item: any) => item.document.fields.usuario.stringValue);

    return Array.from(new Set(emails)); // Return unique emails
}
