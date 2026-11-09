export const hasRole = (roleOrRoles: any, rolesOrRole: any = []) => {
    if (Array.isArray(roleOrRoles)) {
        return roleOrRoles.includes(rolesOrRole);
    }
    if (Array.isArray(rolesOrRole)) {
        return rolesOrRole.includes(roleOrRoles);
    }
    return false;
};

export const hasPermission = (userPermissions: string[], permission: string) =>
    userPermissions.includes(permission);