
"use server";

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface Member {
  email: string;
}

export interface Manager {
    displayName: string;
    email: string;
    photoUrl?: string;
}

function isDirectorGroup(group: { name?: string | null; email?: string | null }): boolean {
    const combinedStr = `${group.name || ''} ${group.email || ''}`;
    const words = combinedStr.toLowerCase().replace(/[-_@.]/g, ' ').split(/\s+/);
    return words.includes('director');
}

function isPersonalGroup(group: { name?: string | null; email?: string | null }): boolean {
    const combinedStr = `${group.name || ''} ${group.email || ''}`;
    const words = combinedStr.toLowerCase().replace(/[-_@.]/g, ' ').split(/\s+/);
    return words.includes('personal');
}


async function getGroupMembers(groupEmail: string, auth: JWT): Promise<{ members: Member[] | null; error: string | null; }> {
  try {
      const admin = google.admin({ version: 'directory_v1', auth });

      const response = await admin.members.list({
          groupKey: groupEmail,
          maxResults: 200,
          includeDerivedMembership: true,
      });

      const memberList = response.data.members;
      if (!memberList || memberList.length === 0) {
          return { members: [], error: null };
      }

      const members: Member[] = memberList
          .filter(member => member.email && member.type === 'USER')
          .map(member => ({
              email: member.email!,
          }));

      return { members, error: null };

  } catch (error: any) {
      console.error(`Error fetching group members for ${groupEmail}:`, error);
      let errorMessage = `An unexpected error occurred while fetching group members for ${groupEmail}.`;
       if (error.code === 403 || error.response?.status === 403) {
            errorMessage = `Permission denied to view members for ${groupEmail}. Ensure the service account has domain-wide delegation for the Admin SDK scope.`;
        } else if (error.code === 404 || error.response?.status === 404) {
            errorMessage = `Group not found: ${groupEmail}. Please check the email and try again.`;
        }
      return { members: null, error: errorMessage };
  }
}

async function getJWTAuth(): Promise<JWT> {
    const credentialsString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const adminUserEmail = process.env.GOOGLE_ADMIN_USER_EMAIL;

    if (!credentialsString || !adminUserEmail) {
      throw new Error("Service account credentials or admin email not configured.");
    }
    const credentials = JSON.parse(credentialsString);
    // The private key from the .env file has its newlines escaped.
    // We need to un-escape them for the crypto library to parse the PEM key correctly.
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');


    return new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
            'https://www.googleapis.com/auth/admin.directory.group.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
            'https://www.googleapis.com/auth/admin.directory.user.readonly'
        ],
        subject: adminUserEmail,
    });
}

export async function getMyManagers(userEmail: string): Promise<{ managers: Manager[] | null; error:string | null; }> {
    try {
        const domain = 'asepeyo.es';

        if (!userEmail) {
            throw new Error("Email not found or could not be verified.");
        }

        const auth = await getJWTAuth();
        const admin = google.admin({ version: 'directory_v1', auth });

        let allManagers: Manager[] = [];
        
        const groupsRes = await admin.groups.list({ userKey: userEmail });
        const userGroups = groupsRes.data.groups;

        if (!userGroups || userGroups.length === 0) {
            return { managers: [], error: null };
        }

        // 1. Find direct managers
        const personalGroups = userGroups.filter(isPersonalGroup);
        for (const personalGroup of personalGroups) {
            if (!personalGroup.email) continue;
            
            try {
                // Get members of the personal group, which can include other groups (subgroups)
                const personalGroupMembersRes = await admin.members.list({ groupKey: personalGroup.email, includeDerivedMembership: true });
                const members = personalGroupMembersRes.data.members ?? [];
                
                // Find the director subgroup within the personal group's members
                for (const member of members) {
                     if (member.type === 'GROUP' && member.email) {
                         const groupDetails = await admin.groups.get({ groupKey: member.email });
                         if(isDirectorGroup(groupDetails.data)) {
                             // Get the members of that director subgroup, these are the direct managers
                            const directorGroupMembersRes = await getGroupMembers(member.email, auth);
                            if(directorGroupMembersRes.members) {
                                for (const managerMember of directorGroupMembersRes.members) {
                                    // Ensure we only add actual users, not other groups
                                    if (managerMember.email && managerMember.email !== userEmail) {
                                        try {
                                            const userRes = await admin.users.get({ userKey: managerMember.email });
                                            const managerUser = userRes.data;
                                            allManagers.push({
                                                displayName: managerUser.name?.fullName ?? 'No Name',
                                                email: managerUser.primaryEmail ?? 'No email',
                                                photoUrl: managerUser.thumbnailPhotoUrl ?? undefined,
                                            });
                                        } catch (userError: any) {
                                            if (userError.code === 404) {
                                                console.warn(`Could not find user details for manager email: ${managerMember.email}`);
                                            } else {
                                                throw userError;
                                            }
                                        }
                                    }
                                }
                            }
                         }
                     }
                }

            } catch (groupError: any) {
                 if (groupError.code !== 404) {
                     console.error(`Error processing personal group ${personalGroup.email}:`, groupError);
                }
            }
        }
        
        // 2. Find superior manager
        const referenceGroup = userGroups.find(isDirectorGroup) || userGroups.find(isPersonalGroup);
       
        if (referenceGroup && referenceGroup.name) {
            const prefix = referenceGroup.name.split(/[\s_-]/)[0];
            
            if (prefix) {
                const possibleSuperiorEmails = [
                    `${prefix.toLowerCase()}_ag_director@${domain}`,
                    `${prefix.toLowerCase()}_director@${domain}`,
                    `${prefix.toLowerCase()}_ac_director@${domain}`
                ];

                for (const superiorEmail of possibleSuperiorEmails) {
                    try {
                        const membersRes = await getGroupMembers(superiorEmail, auth);
                        
                        if (membersRes.members && membersRes.members.length > 0) {
                            for (const managerMember of membersRes.members) {
                                if (managerMember.email) {
                                    try {
                                        const userRes = await admin.users.get({ userKey: managerMember.email });
                                        const managerUser = userRes.data;
                                        allManagers.push({
                                            displayName: managerUser.name?.fullName ?? 'No Name',
                                            email: managerUser.primaryEmail ?? 'No email',
                                            photoUrl: managerUser.thumbnailPhotoUrl ?? undefined,
                                        });
                                    } catch (userError: any) {
                                         if (userError.code === 404) {
                                            console.warn(`Could not find user details for superior manager email: ${managerMember.email}`);
                                        } else {
                                            throw userError;
                                        }
                                    }
                                }
                            }
                            break; 
                        }
                    } catch (error: any) {
                         if (error.code !== 404) { 
                            console.error(`Error checking superior manager group ${superiorEmail}:`, error.message);
                        }
                    }
                }
            }
        }

        const uniqueManagers = allManagers.filter((manager, index, self) => 
            index === self.findIndex((m) => m.email === manager.email)
        );

        return { managers: uniqueManagers, error: null };

    } catch (error: any) {
        console.error("Error fetching managers:", error);
        let errorMessage = "Ocurrió un error inesperado al obtener los managers.";
        if (error.code === 403 || (error.response?.status === 403)) {
            errorMessage = "Permiso denegado. Asegúrate de que la cuenta de servicio tiene los permisos de delegación de dominio necesarios.";
        } else if (error.code === 404 || (error.response?.status === 404)) {
            errorMessage = `Usuario o grupo no encontrado. Por favor, comprueba el email.`;
        }
        return { managers: null, error: errorMessage };
    }
}


export async function getManagedUsers(managerEmail: string): Promise<{ users: Member[] | null; error: string | null; }> {
    try {
        if (!managerEmail) {
            return { users: null, error: "Manager email is required." };
        }

        const auth = await getJWTAuth();
        const admin = google.admin({ version: 'directory_v1', auth });
        const managerGroupsRes = await admin.groups.list({ userKey: managerEmail });
        
        const directorGroups = managerGroupsRes.data.groups?.filter(isDirectorGroup);
        
        if (!directorGroups || directorGroups.length === 0) {
            return { users: [], error: null }; // Return empty array, not an error, as a user might not be a manager
        }
        
        let allManagedUsers: Member[] = [];
        
        for (const directorGroup of directorGroups) {
            if (!directorGroup.email || !directorGroup.name) continue;

             try {
                const parentGroupsRes = await admin.groups.list({ userKey: directorGroup.email, maxResults: 200, });
                const parentGroups = parentGroupsRes.data.groups;

                if (!parentGroups) continue;

                for(const parentGroup of parentGroups) {
                    if (parentGroup.email && isPersonalGroup(parentGroup)) {
                         const teamMembersRes = await getGroupMembers(parentGroup.email, auth);
                         if (teamMembersRes.members) {
                             allManagedUsers.push(...teamMembersRes.members);
                         }
                    }
                }
             } catch(e: any) {
                console.error(`Could not check parent groups for ${directorGroup.email}: ${e.message}`);
             }
        }
        
        const uniqueUsers = allManagedUsers
            .filter((user, index, self) => 
                index === self.findIndex((u) => u.email === user.email) && user.email !== managerEmail
            );
        
        return { users: uniqueUsers, error: null };

    } catch (error: any) {
        console.error("Error fetching managed users:", error);
        let errorMessage = "Ocurrió un error inesperado al obtener los usuarios gestionados.";
        if (error.code === 403 || (error.response?.status === 403)) {
            errorMessage = "Permiso denegado. Asegúrate de que la cuenta de servicio tiene los permisos de delegación de dominio necesarios.";
        } else if (error.code === 404 || (error.response?.status === 404)) {
            errorMessage = `No se pudo encontrar el usuario o grupos para '${managerEmail}'. Por favor, comprueba el email.`;
        }
        return { users: null, error: errorMessage };
    }
}
