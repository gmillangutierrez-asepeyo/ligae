/**
 * @fileoverview This file contains role definitions for the application.
 * It defines the manager hierarchy by reading from an environment variable.
 */

// Define a type for our hierarchy structure for type safety.
type ManagerHierarchy = Record<string, string[]>;

/**
 * Parses the manager hierarchy from an environment variable.
 * The variable should be a JSON string.
 * Example: '{"manager.email@asepeyo.es":["user1.email@asepeyo.es"]}'
 * @returns {ManagerHierarchy} The parsed hierarchy object.
 */
function getManagerHierarchy(): ManagerHierarchy {
  const hierarchyJson = process.env.NEXT_PUBLIC_MANAGER_HIERARCHY;

  if (!hierarchyJson) {
    // If the variable is not set, return an empty hierarchy.
    // This allows the app to run without a defined hierarchy (e.g., in some dev environments).
    console.warn("La variable de entorno NEXT_PUBLIC_MANAGER_HIERARCHY no está definida. La jerarquía de managers estará vacía.");
    return {};
  }

  try {
    // Attempt to parse the JSON string from the environment variable.
    const parsedHierarchy = JSON.parse(hierarchyJson);
    
    // Basic validation to ensure it's an object.
    if (typeof parsedHierarchy !== 'object' || parsedHierarchy === null || Array.isArray(parsedHierarchy)) {
        throw new Error("El valor parseado no es un objeto.");
    }

    return parsedHierarchy;
  } catch (error: any) {
    // If parsing fails, log a detailed error and return an empty hierarchy.
    console.error(
      "Error al parsear NEXT_PUBLIC_MANAGER_HIERARCHY. Asegúrate de que es una cadena JSON válida.",
      `Error: ${error.message}`,
      `Valor recibido: "${hierarchyJson}"`
    );
    return {};
  }
}

/**
 * The manager hierarchy object, defining which users report to which manager.
 * This configuration is loaded from the NEXT_PUBLIC_MANAGER_HIERARCHY environment variable.
 */
export const MANAGER_HIERARCHY: ManagerHierarchy = getManagerHierarchy();


/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
