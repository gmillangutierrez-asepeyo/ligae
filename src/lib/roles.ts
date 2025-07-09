/**
 * @fileoverview This file contains role definitions for the application.
 * Roles are determined by the MANAGER_HIERARCHY environment variable.
 */

// Initialize an empty hierarchy. It will be populated from the environment variable.
let parsedHierarchy: Record<string, string[]> = {};

try {
  // Check if the environment variable is set.
  if (process.env.MANAGER_HIERARCHY) {
    // Attempt to parse the JSON string from the environment variable.
    parsedHierarchy = JSON.parse(process.env.MANAGER_HIERARCHY);
  } else {
    // Log a warning if the variable is not set during development, as it's key for manager functionality.
    if (process.env.NODE_ENV === 'development') {
        console.warn("MANAGER_HIERARCHY environment variable is not set. Manager functionality will be limited. Please define it in your .env file as a JSON string, e.g., MANAGER_HIERARCHY='{\"manager@example.com\":[\"user@example.com\"]}'");
    }
  }
} catch (error) {
  // Log an error if the JSON is invalid, but don't crash the app.
  console.error(
    "Error parsing MANAGER_HIERARCHY environment variable. Please ensure it is a valid JSON string.",
    error
  );
  // Default to an empty object on parsing failure.
  parsedHierarchy = {};
}

/**
 * Defines which users report to which manager.
 * This is populated from the MANAGER_HIERARCHY environment variable.
 * The key is the manager's email, and the value is an array of user emails.
 * Example format for the .env file:
 * MANAGER_HIERARCHY='{"manager1@asepeyo.es":["user1@asepeyo.es"],"manager2@asepeyo.es":["user2@asepeyo.es","user3@asepeyo.es"]}'
 */
export const MANAGER_HIERARCHY: Record<string, string[]> = parsedHierarchy;

/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
