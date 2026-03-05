export function hasPerm(perms: string[] | undefined, perm: string) {
    return Array.isArray(perms) && perms.includes(perm)
}
