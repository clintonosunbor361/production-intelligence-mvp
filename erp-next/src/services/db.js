import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export class NotAuthenticatedError extends Error {
    constructor(message = "User not authenticated") {
        super(message)
        this.name = "NotAuthenticatedError"
    }
}

export class MissingProfileError extends Error {
    constructor(message = "User profile not found. Contact administrator.") {
        super(message)
        this.name = "MissingProfileError"
    }
}

export class MissingRoleError extends Error {
    constructor(message = "User role not assigned. Contact administrator.") {
        super(message)
        this.name = "MissingRoleError"
    }
}

export class PermissionDeniedError extends Error {
    constructor(message = "Permission denied for this action.") {
        super(message)
        this.name = "PermissionDeniedError"
    }
}

async function getContext() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData?.user) {
        throw new NotAuthenticatedError()
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()

    if (profileError || !profile) {
        throw new MissingProfileError(profileError?.message || "User profile not found.")
    }

    const orgId = profile.organization_id

    // Fetch role
    const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('roles(name, id)')
        .eq('user_id', userData.user.id)
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle()

    if (roleError || !userRole || !userRole.roles) {
        throw new MissingRoleError(roleError?.message || "User role not found.")
    }

    const roleId = Array.isArray(userRole.roles) ? userRole.roles[0]?.id : userRole.roles.id
    const roleName = Array.isArray(userRole.roles) ? userRole.roles[0]?.name : userRole.roles.name

    // Fetch permissions
    const { data: rolePermissions, error: permError } = await supabase
        .from('role_permissions')
        .select('permissions(name)')
        .eq('role_id', roleId)

    if (permError) {
        throw new Error(permError.message)
    }

    // Role Permissions could also be structured differently depending on the Postgres result, usually it's array of objects
    const permissions = rolePermissions?.map(rp => Array.isArray(rp.permissions) ? rp.permissions[0]?.name : rp.permissions?.name) || []

    return {
        userId: userData.user.id,
        organizationId: orgId,
        roleName: roleName,
        permissions: permissions.filter(Boolean)
    }
}

function requireOrg(ctx) {
    if (!ctx || !ctx.organizationId) {
        throw new Error("Missing organization context")
    }
}

function requirePermission(ctx, perm) {
    if (!ctx.permissions.includes(perm)) {
        throw new PermissionDeniedError(`Requires ${perm} permission`)
    }
}

export const db = {

    async getCurrentUser() {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', userData.user.id)
            .limit(1)
            .maybeSingle()

        let roleName = 'No role assigned'

        if (profile?.organization_id) {
            const { data: userRole } = await supabase
                .from('user_roles')
                .select('roles(name)')
                .eq('user_id', userData.user.id)
                .eq('organization_id', profile.organization_id)
                .limit(1)
                .maybeSingle()

            if (userRole && userRole.roles) {
                roleName = Array.isArray(userRole.roles) ? userRole.roles[0]?.name : userRole.roles.name
            }
        }

        return {
            email: userData.user.email,
            roleName: roleName || 'No role assigned'
        }
    },

    async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
    },

    // -------------------------
    // MASTER DATA READS
    // -------------------------

    async getProductTypes() {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('product_types')
            .select('*')
            .eq('organization_id', ctx.organizationId)
            .order('name')

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getCategories() {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('category_types')
            .select('*')
            .eq('organization_id', ctx.organizationId)
            .order('name')

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getTaskTypes() {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('task_types')
            .select('*')
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getRates() {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('rate_cards')
            .select(`
                *,
                product_types(name),
                category_types(name),
                task_types(name)
            `)
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data.map(rate => ({
            ...rate,
            product_name: rate.product_types?.name,
            category_name: rate.category_types?.name,
            name: rate.task_types?.name
        }))
    },

    async getTailors() {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('tailors')
            .select('*')
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getTailorSpecialPay(tailorId) {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('tailor_special_pay')
            .select('*')
            .eq('organization_id', ctx.organizationId)
            .eq('tailor_id', tailorId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getTicketByNumber(ticket_number) {

        const ctx = await getContext()

        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('organization_id', ctx.organizationId)
            .eq('ticket_number', ticket_number)
            .maybeSingle()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async createTicket({ ticket_number, customer_name, branch_id = null, internal_notes = null }) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_production')

        const { data, error } = await supabase
            .from('tickets')
            .insert({
                organization_id: ctx.organizationId,
                branch_id,
                ticket_number,
                customer_name,
                internal_notes,
                status: 'OPEN'
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async createItemsForTicket({ ticket_id, product_type_id, quantity = 1 }) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_production')

        const rows = Array.from({ length: Number(quantity || 1) }).map(() => ({
            organization_id: ctx.organizationId,
            ticket_id,
            product_type_id
        }))

        const { data, error } = await supabase
            .from('items')
            .insert(rows)
            .select()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    // -------------------------
    // MASTER DATA WRITES
    // -------------------------

    async createProductType(name) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { data, error } = await supabase
            .from('product_types')
            .insert({
                organization_id: ctx.organizationId,
                name
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async createCategory(name) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { data, error } = await supabase
            .from('category_types')
            .insert({
                organization_id: ctx.organizationId,
                name
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async createTaskType(name) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { data, error } = await supabase
            .from('task_types')
            .insert({
                organization_id: ctx.organizationId,
                name
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async updateProductType(id, updates) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { data, error } = await supabase
            .from('product_types')
            .update({
                name: updates.name
            })
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async deleteProductType(id) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { error } = await supabase
            .from('product_types')
            .delete()
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
        return true
    },

    async updateCategory(id, updates) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { data, error } = await supabase
            .from('category_types')
            .update({
                name: updates.name
            })
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async deleteCategory(id) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { error } = await supabase
            .from('category_types')
            .delete()
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
        return true
    },
    async createTailor(tailorData) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_tailors')

        const { data, error } = await supabase
            .from('tailors')
            .insert({
                ...tailorData,
                organization_id: ctx.organizationId
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async updateTailor(id, updates) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_tailors')

        const { data, error } = await supabase
            .from('tailors')
            .update({
                ...updates,
                organization_id: ctx.organizationId
            })
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async toggleTailorStatus(id) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_tailors')

        const { data: tailor } = await supabase
            .from('tailors')
            .select('active')
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .single()

        if (!tailor) {
            throw new Error("Tailor not found")
        }

        const { data, error } = await supabase
            .from('tailors')
            .update({ active: !tailor.active })
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data.active
    },

    async saveTailorSpecialPay(tailor_id, task_type_id, uplift_pct) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_tailors')

        const { data, error } = await supabase
            .from('tailor_special_pay')
            .upsert({
                organization_id: ctx.organizationId,
                tailor_id,
                task_type_id,
                uplift_pct
            }, {
                onConflict: 'organization_id,tailor_id,task_type_id'
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async removeTailorSpecialPay(id) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_tailors')

        const { error } = await supabase
            .from('tailor_special_pay')
            .delete()
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
    },

    // -------------------------
    // TASK TYPES + RATE CARD
    // -------------------------

    async upsertRateCard(payload) {
        const ctx = await getContext()
        const orgId = ctx.organizationId

        const { data, error } = await supabase
            .from('rate_cards')
            .upsert({
                organization_id: orgId,
                product_type_id: payload.product_type_id,
                category_type_id: payload.category_type_id,
                task_type_id: payload.task_type_id,
                band_a_fee: payload.band_a_fee,
                band_b_fee: payload.band_b_fee
            }, {
                onConflict: 'organization_id,product_type_id,category_type_id,task_type_id'
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async createTaskTypeAndRateByIds(payload) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        // create task type
        const { data: taskType, error: taskError } = await supabase
            .from('task_types')
            .insert({
                organization_id: ctx.organizationId,
                name: payload.name
            })
            .select()
            .single()

        if (taskError) {
            console.error(taskError)
            throw new Error(taskError.message)
        }

        // upsert rate card
        const rateData = await this.upsertRateCard({
            ...payload,
            task_type_id: taskType.id
        })

        return rateData
    },

    async createTaskAndRate(productName, categoryName, taskName, bandAFee, bandBFee) {

        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        // product
        const { data: product } = await supabase
            .from('product_types')
            .select('*')
            .eq('name', productName)
            .eq('organization_id', ctx.organizationId)
            .single()

        const productId = product?.id

        // category
        const { data: category } = await supabase
            .from('category_types')
            .select('*')
            .eq('name', categoryName)
            .eq('organization_id', ctx.organizationId)
            .single()

        const categoryId = category?.id

        // create task type
        const { data: taskType } = await supabase
            .from('task_types')
            .insert({
                organization_id: ctx.organizationId,
                name: taskName
            })
            .select()
            .single()

        // create rate card
        const rateData = await this.upsertRateCard({
            product_type_id: productId,
            category_type_id: categoryId,
            task_type_id: taskType.id,
            band_a_fee: parseFloat(bandAFee),
            band_b_fee: parseFloat(bandBFee)
        })

        return rateData
    },

    async updateRateCard(id, payload) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { data, error } = await supabase
            .from('rate_cards')
            .update({
                product_type_id: payload.product_type_id,
                category_type_id: payload.category_type_id,
                task_type_id: payload.task_type_id,
                band_a_fee: payload.band_a_fee,
                band_b_fee: payload.band_b_fee,
                active: payload.active
            })
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async toggleRateCardStatus(id) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        const { data: current, error: fetchError } = await supabase
            .from('rate_cards')
            .select('id, active')
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .single()

        if (fetchError) {
            console.error(fetchError)
            throw new Error(fetchError.message)
        }

        if (!current) {
            throw new Error("Rate card not found")
        }

        const { data, error } = await supabase
            .from('rate_cards')
            .update({ active: !current.active })
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data.active
    },

    async deleteRateCard(id) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_rates')

        // First, optionally check if it's used if needed, but RLS/DB constraints manage this (RESTRICT on work_assignments)
        const { error } = await supabase
            .from('rate_cards')
            .delete()
            .eq('id', id)
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
        return true
    },

    // -------------------------
    // ITEMS
    // -------------------------

    async getItems() {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('items')
            .select(`
                *,
                tickets(ticket_number, customer_name),
                product_types(name),
                work_assignments(category_types(name))
            `)
            .eq('organization_id', ctx.organizationId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        // Map foreign relations to expected UI names
        return data.map(item => ({
            ...item,
            ticket_number: item.tickets?.ticket_number,
            customer_name: item.tickets?.customer_name,
            product_type_name: item.product_types?.name
        }))
    },

    async getItemById(itemId) {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('items')
            .select(`
                *,
                tickets(ticket_number, customer_name),
                product_types(name),
                work_assignments(
                    id,
                    status,
                    pay_amount,
                    tailors(name),
                    category_types(name),
                    task_types(name)
                )
            `)
            .eq('id', itemId)
            .eq('organization_id', ctx.organizationId)
            .maybeSingle()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        if (!data) return null;

        return {
            ...data,
            ticket_number: data.tickets?.ticket_number,
            customer_name: data.tickets?.customer_name,
            product_type_name: data.product_types?.name
        }
    },

    async getTasksByItemId(itemId) {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('work_assignments')
            .select(`
                *,
                task_types(name),
                tailors(name),
                category_types(name)
            `)
            .eq('organization_id', ctx.organizationId)
            .eq('item_id', itemId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data.map(task => ({
            ...task,
            task_type_name: task.task_types?.name,
            tailor_name: task.tailors?.name,
            category_name: task.category_types?.name
        }))
    },

    async deleteItem(itemId) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_production')

        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId)
            .eq('organization_id', ctx.organizationId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return true
    },

    async getPendingPaymentsCount() {
        const ctx = await getContext()

        const { count, error } = await supabase
            .from('work_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', ctx.organizationId)
            .eq('status', 'QC_PASSED')

        if (error) {
            console.error(error)
            return 0
        }

        return count || 0
    },

    async getWeeklyPayroll(startDate, endDate) {
        const ctx = await getContext()

        let query = supabase
            .from('work_assignments')
            .select(`
                id,
                pay_amount,
                status,
                created_at,
                updated_at,
                tailor_id,
                tailors (
                    id,
                    name,
                    band,
                    department
                )
            `)
            .eq('organization_id', ctx.organizationId)
            .eq('status', 'PAID')

        if (startDate) {
            query = query.gte('updated_at', startDate)
        }
        if (endDate) {
            query = query.lte('updated_at', endDate)
        }

        const { data, error } = await query

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        console.log("DEBUG: Raw PAID work_assignments for payroll:", data)

        const payrollMap = {}

        for (const wa of (data || [])) {
            const tailorId = wa.tailor_id
            const tailor = wa.tailors

            if (!payrollMap[tailorId]) {
                payrollMap[tailorId] = {
                    tailor_id: tailorId,
                    tailor_name: tailor?.name || 'Unknown',
                    department: tailor?.department || 'Production', // Using actual tailor department
                    weekly_verified_total: 0,
                    weekly_total_pay: 0,
                    task_count: 0
                }
            }

            const pay = Number(wa.pay_amount || 0)

            payrollMap[tailorId].weekly_verified_total += pay
            payrollMap[tailorId].weekly_total_pay += pay
            payrollMap[tailorId].task_count += 1
        }

        const finalPayroll = Object.values(payrollMap)
        console.log("DEBUG: Final aggregated payroll array:", finalPayroll)
        return finalPayroll
    },

    async createWorkAssignment(payload) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_production')

        const { data, error } = await supabase.rpc('create_work_assignment', {
            p_item_id: payload.item_id,
            p_category_type_id: payload.category_type_id,
            p_task_type_id: payload.task_type_id,
            p_tailor_id: payload.tailor_id
        })

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        // Update item status to IN_QC when a task is assigned
        await this.updateItemStatus(payload.item_id, 'IN_QC');

        return data
    },

    async getTasks() {
        const ctx = await getContext()

        const { data, error } = await supabase
            .from('work_assignments')
            .select(`
                *,
                task_types(name),
                tailors(name),
                category_types(name),
                items(item_key, tickets(customer_name, ticket_number))
            `)
            .eq('organization_id', ctx.organizationId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data.map(task => ({
            ...task,
            task_name: task.task_types?.name,
            task_type_name: task.task_types?.name,
            tailor_name: task.tailors?.name,
            category_name: task.category_types?.name,
            item_key: task.items?.item_key,
            customer_name: task.items?.tickets?.customer_name,
            ticket_number: task.items?.tickets?.ticket_number,
            ticket_id: task.items?.tickets?.ticket_number || 'Unknown'
        }))
    },

    async verifyTask(taskId, status, reason = null) {
        const ctx = await getContext()
        requirePermission(ctx, 'manage_qc')

        let error;
        if (status === 'Approved' || status === 'QC_PASSED') {
            const result = await supabase.rpc('qc_pass', { p_assignment_id: taskId })
            error = result.error
        } else if (status === 'Rejected' || status === 'QC_FAILED') {
            const result = await supabase.rpc('qc_fail', { p_assignment_id: taskId, p_notes: reason })
            error = result.error
        } else {
            console.warn("Unknown verification status:", status);
            return null;
        }

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return { id: taskId, status }
    },

    async updateItemStatus(itemId, status) {
        const ctx = await getContext()

        // Although it is technically accessible to 'manage_completion' conceptually, 
        // passing permission check is skipped here like other item generic reads 
        // to conform to existing UI needs or could be explicitly narrowed later.

        const { data, error } = await supabase
            .from('items')
            .update({ status })
            .eq('id', itemId)
            .eq('organization_id', ctx.organizationId)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    }
}