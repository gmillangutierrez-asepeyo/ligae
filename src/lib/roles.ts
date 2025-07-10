/**
 * @fileoverview This file contains role definitions for the application,
 * loaded from environment variables for flexibility.
 */

// Define a type for our hierarchy structure for type safety.
type ManagerHierarchy = Record<string, string[]>;

/**
 * Initializes the manager hierarchy from an environment variable.
 * The variable `NEXT_PUBLIC_MANAGER_HIERARCHY` should contain a string
 * in the format: 'manager1:user1 user2;manager2:user3'
 * - Manager groups are separated by a semicolon (;)
 * - The manager is separated from their users by a colon (:)
 * - Users are separated by a space
 *
 * If the variable is not set or invalid, it defaults to an empty object
 * and logs an error to the console for easier debugging.
 * @returns The parsed manager hierarchy.
 */
function getManagerHierarchy(): ManagerHierarchy {
  const hierarchyStr = process.env.NEXT_PUBLIC_MANAGER_HIERARCHY;

  if (!hierarchyStr) {
    // Variable not set, return an empty hierarchy.
    return {};
  }

  const hierarchy: ManagerHierarchy = {};

  try {
    const managerGroups = hierarchyStr.split(';').filter(Boolean); // Split by ; and remove empty strings

    for (const group of managerGroups) {
      const parts = group.split(':');
      if (parts.length !== 2) {
        // Malformed group, skip it
        console.warn(`Grupo de jerarquía mal formado, se omitirá: "${group}"`);
        continue;
      }
      
      const managerEmail = parts[0].trim();
      const userEmails = parts[1].trim().split(' ').filter(Boolean); // Split by space and remove empty strings

      if (managerEmail && userEmails.length > 0) {
        hierarchy[managerEmail] = userEmails;
      }
    }
    
    return hierarchy;

  } catch (error) {
    console.error(
      'Error al parsear NEXT_PUBLIC_MANAGER_HIERARCHY. Asegúrate de que tiene el formato correcto.',
      'Valor recibido:', hierarchyStr,
      'Error:', error
    );
    // On parsing error, return an empty hierarchy to prevent crashes.
    return {};
  }
}

/**
 * The manager hierarchy object, defining which users report to which manager.
 * The key is the manager's email, and the value is an array of user emails.
 * This is loaded from the `NEXT_PUBLIC_MANAGER_HIERARCHY` environment variable.
 */
export const MANAGER_HIERARCHY: ManagerHierarchy = getManagerHierarchy();

/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
