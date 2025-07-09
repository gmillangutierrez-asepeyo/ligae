/**
 * @fileoverview This file contains role definitions for the application.
 * Roles are determined by the NEXT_PUBLIC_MANAGER_HIERARCHY environment variable.
 */

// Initialize an empty hierarchy. It will be populated from the environment variable.
const parsedHierarchy: Record<string, string[]> = {};
const hierarchyEnvVar = process.env.NEXT_PUBLIC_MANAGER_HIERARCHY;

/**
 * Parses the manager hierarchy string from the environment variable.
 * The variable should contain a valid JSON string.
 * Example: '{"manager1@email.com":["user1@email.com","user2@email.com"],"manager2@email.com":["user3@email.com"]}'
 */
if (hierarchyEnvVar) {
  try {
    // Attempt to parse the string as JSON
    const parsedJson = JSON.parse(hierarchyEnvVar);

    // Basic validation to ensure it's an object
    if (typeof parsedJson === 'object' && parsedJson !== null && !Array.isArray(parsedJson)) {
      // Further validation can be added here if needed (e.g., check if values are arrays of strings)
      Object.assign(parsedHierarchy, parsedJson);
    } else {
      throw new Error("El JSON no es un objeto válido de manager-a-usuarios.");
    }
  } catch (error) {
    console.error(
      "Error crítico al interpretar NEXT_PUBLIC_MANAGER_HIERARCHY. La variable debe ser una cadena de texto JSON válida.",
      "\nFormato esperado: '{\"manager1@email.com\":[\"user1\",\"user2\"],\"manager2@email.com\":[\"user3\"]}'",
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
 * Example for .env or .yaml file:
 * NEXT_PUBLIC_MANAGER_HIERARCHY='{"manager1@asepeyo.es":["user1@asepeyo.es","user2@asepeyo.es"],"manager2@asepeyo.es":["user3@asepeyo.es"]}'
 */
export const MANAGER_HIERARCHY: Record<string, string[]> = parsedHierarchy;

/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
