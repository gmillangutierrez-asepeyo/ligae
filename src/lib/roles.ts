/**
 * @fileoverview This file contains role definitions for the application,
 * loaded from environment variables for flexibility.
 */

// Define a type for our hierarchy structure for type safety.
type ManagerHierarchy = Record<string, string[]>;

/**
 * Initializes the manager hierarchy from an environment variable.
 * The variable `NEXT_PUBLIC_MANAGER_HIERARCHY` should contain a JSON string.
 * Example: '{"manager1@asepeyo.es":["user1@asepeyo.es"], "manager2@asepeyo.es":["user3@asepeyo.es"]}'
 * 
 * If the variable is not set or invalid, it defaults to an empty object
 * and logs an error to the console for easier debugging.
 * @returns The parsed manager hierarchy.
 */
function getManagerHierarchy(): ManagerHierarchy {
  const hierarchyJson = process.env.NEXT_PUBLIC_MANAGER_HIERARCHY;

  if (!hierarchyJson) {
    // Variable not set, return an empty hierarchy.
    return {};
  }

  try {
    // Attempt to parse the JSON string from the environment variable.
    const parsedHierarchy = JSON.parse(hierarchyJson);
    
    // Basic validation to ensure it's an object.
    if (typeof parsedHierarchy === 'object' && parsedHierarchy !== null && !Array.isArray(parsedHierarchy)) {
        return parsedHierarchy;
    } else {
       console.error(
        'Error: NEXT_PUBLIC_MANAGER_HIERARCHY no es un objeto JSON válido.',
        'Valor recibido:', hierarchyJson
      );
      return {};
    }
  } catch (error) {
    console.error(
      'Error al parsear NEXT_PUBLIC_MANAGER_HIERARCHY. Asegúrate de que es una cadena JSON válida.',
      'Valor recibido:', hierarchyJson,
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
