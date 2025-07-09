/**
 * @fileoverview This file contains role definitions for the application.
 * Roles are determined by the NEXT_PUBLIC_MANAGER_HIERARCHY environment variable.
 */

// Initialize an empty hierarchy. It will be populated from the environment variable.
const parsedHierarchy: Record<string, string[]> = {};
const hierarchyEnvVar = process.env.NEXT_PUBLIC_MANAGER_HIERARCHY;

/**
 * Parses the manager hierarchy string from the environment variable.
 * New Format: A single string where manager-user groups are separated by semicolons (;).
 * Within each group, the manager's email is separated from their users' emails by a colon (:).
 * Users' emails are separated by commas (,).
 *
 * Example: 'manager1@email.com:user1@email.com,user2@email.com;manager2@email.com:user3@email.com'
 */
if (hierarchyEnvVar) {
  try {
    const managerEntries = hierarchyEnvVar.split(';').filter(Boolean); // Split by ; and remove empty strings
    for (const entry of managerEntries) {
      const parts = entry.split(':');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.warn(`Entrada de jerarquía con formato incorrecto, omitida: "${entry}"`);
        continue;
      }
      
      const managerEmail = parts[0].trim();
      const userEmails = parts[1].split(',').map(email => email.trim()).filter(Boolean);

      if (managerEmail && userEmails.length > 0) {
        if (parsedHierarchy[managerEmail]) {
          // Merge if manager is defined multiple times
          parsedHierarchy[managerEmail] = [...new Set([...parsedHierarchy[managerEmail], ...userEmails])];
        } else {
          parsedHierarchy[managerEmail] = userEmails;
        }
      }
    }
  } catch (error) {
    console.error(
      "Error crítico al interpretar NEXT_PUBLIC_MANAGER_HIERARCHY. Asegúrate de que el formato es correcto.",
      "\nFormato esperado: 'manager1@email.com:user1,user2;manager2@email.com:user3'",
      "\nValor recibido:", hierarchyEnvVar,
      "\nError de parseo:", error
    );
  }
} else {
  // Log a warning if the variable is not set during development.
  if (process.env.NODE_ENV === 'development') {
    console.warn("NEXT_PUBLIC_MANAGER_HIERARCHY environment variable is not set. Manager functionality will be limited.");
  }
}


/**
 * Defines which users report to which manager.
 * This is populated from the NEXT_PUBLIC_MANAGER_HIERARCHY environment variable.
 * The key is the manager's email, and the value is an array of user emails.
 *
 * New Format Example for .env or .yaml file:
 * NEXT_PUBLIC_MANAGER_HIERARCHY='manager1@asepeyo.es:user1@asepeyo.es,user2@asepeyo.es;manager2@asepeyo.es:user3@asepeyo.es'
 */
export const MANAGER_HIERARCHY: Record<string, string[]> = parsedHierarchy;

/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
