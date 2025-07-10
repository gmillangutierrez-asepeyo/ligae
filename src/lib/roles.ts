/**
 * @fileoverview This file contains role definitions for the application.
 * It reads the manager hierarchy from an environment variable for flexibility.
 */

// Define a type for our hierarchy structure for type safety.
type ManagerHierarchy = Record<string, string[]>;

/**
 * Parses the manager hierarchy from the NEXT_PUBLIC_MANAGER_HIERARCHY environment variable.
 * The variable is expected to be a JSON string.
 * Example: '{"manager.email@asepeyo.es":["user1.email@asepeyo.es"]}'
 * If the variable is not set or is invalid JSON, it returns an empty object and logs an error.
 * @returns {ManagerHierarchy} The parsed manager hierarchy.
 */
function getManagerHierarchy(): ManagerHierarchy {
  const hierarchyJson = process.env.NEXT_PUBLIC_MANAGER_HIERARCHY;

  if (!hierarchyJson) {
    // This is not an error, it just means no hierarchy is defined.
    // The app will function correctly with an empty hierarchy.
    console.info("NEXT_PUBLIC_MANAGER_HIERARCHY is not set. No manager roles will be applied.");
    return {};
  }

  try {
    const parsedHierarchy = JSON.parse(hierarchyJson);
    // Basic validation to ensure it's an object.
    if (typeof parsedHierarchy !== 'object' || parsedHierarchy === null || Array.isArray(parsedHierarchy)) {
        throw new Error("The parsed JSON is not an object.");
    }
    return parsedHierarchy;
  } catch (error: any) {
    console.error(
      "ERROR: Failed to parse NEXT_PUBLIC_MANAGER_HIERARCHY. Please ensure it's a valid JSON string.",
      `\nReceived value: ${hierarchyJson}`,
      `\nError details: ${error.message}`
    );
    // Return an empty object to prevent the app from crashing.
    return {};
  }
}

/**
 * The manager hierarchy object, defining which users report to which manager.
 * This is loaded dynamically from environment variables.
 */
export const MANAGER_HIERARCHY: ManagerHierarchy = getManagerHierarchy();


/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
