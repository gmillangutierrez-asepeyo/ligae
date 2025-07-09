/**
 * @fileoverview This file contains role definitions for the application.
 * This is a simplified implementation for a prototype. In a production
 * environment, roles would typically be managed via a database or
 * Identity and Access Management (IAM) system.
 */

// Define which users report to which manager.
// The key is the manager's email, and the value is an array of user emails.
export const MANAGER_HIERARCHY: Record<string, string[]> = {
  'manager@asepeyo.es': [
    // Añade aquí los correos de los usuarios a cargo de 'manager@asepeyo.es'
    // 'usuario1@asepeyo.es',
  ],
  'gmillangutierrez@asepeyo.es': [
    // Añade aquí los correos de los usuarios a cargo de 'gmillangutierrez@asepeyo.es'
  ],
  // Ejemplo: 'juan.perez@asepeyo.es': ['laura.gomez@asepeyo.es'],
};

// A simple way to get all manager emails from the hierarchy.
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
