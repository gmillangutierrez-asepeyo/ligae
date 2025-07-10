/**
 * @fileoverview This file contains role definitions for the application.
 * It defines the manager hierarchy as a hardcoded constant for simplicity.
 */

// Define a type for our hierarchy structure for type safety.
type ManagerHierarchy = Record<string, string[]>;

/**
 * The manager hierarchy object, defining which users report to which manager.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 *
 * To add or change managers/users, edit this constant directly.
 * Example:
 * {
 *   "manager.email@asepeyo.es": ["user1.email@asepeyo.es", "user2.email@asepeyo.es"],
 *   "another.manager@asepeyo.es": ["user3.email@asepeyo.es"]
 * }
 */
export const MANAGER_HIERARCHY: ManagerHierarchy = {
  "gmillangutierrez@asepeyo.es": ["gmillangutierrez@asepeyo.es", "pmoratomolina@asepeyo.es"],
};


/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
