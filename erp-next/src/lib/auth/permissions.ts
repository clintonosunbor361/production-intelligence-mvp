import { createClient } from './server'

export async function getUserPermissions() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { user: null, permissions: [] }
    }

    // Get permissions from DB
    const { data, error } = await supabase
        .from('user_roles')
        .select(`
      role_id,
      roles (
        role_permissions (
          permissions (name)
        )
      )
    `)
        .eq('user_id', user.id)
        .single()

    if (error || !data || !data.roles) {
        return { user, permissions: [] }
    }

    // Define typing ad-hoc
    type RolePermsRow = { permissions: { name: string } };
    const rp = (data.roles as any).role_permissions as RolePermsRow[];
    const permissions = rp.map(item => item.permissions.name);

    return { user, permissions }
}

export async function hasPermission(permissionName: string) {
    const { permissions } = await getUserPermissions()
    return permissions.includes(permissionName) || permissions.includes('admin')
}
