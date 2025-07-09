/**
 * @fileoverview This file contains role definitions for the application.
 */

/**
 * Defines which users report to which manager.
 * The key is the manager's email, and the value is an array of user emails.
 *
 * To add or change managers and the users they are in charge of,
 * modify the object below.
 */
export const MANAGER_HIERARCHY: Record<string, string[]> = {
    "gmillangutierrez@asepeyo.es": ["gmillangutierrez@asepeyo.es", "pmoratomolina@asepeyo.es"],
    // Example for another manager:
    // "another.manager@asepeyo.es": ["user3@asepeyo.es", "user4@asepeyo.es"]
};

/**
 * A simple way to get all manager emails from the hierarchy.
 * A user is considered a manager if they have an entry as a key in the hierarchy.
 */
export const ALL_MANAGER_EMAILS: string[] = Object.keys(MANAGER_HIERARCHY);
