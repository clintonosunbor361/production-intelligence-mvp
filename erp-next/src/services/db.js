import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

async function getOrgId() {

    const { data: userData } = await supabase.auth.getUser()

    if (!userData?.user) {
        throw new Error("User not authenticated")
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error(error)
        throw new Error(error.message)
    }

    if (!data) {
        throw new Error("User profile not found. Create a profile row.")
    }

    return data.organization_id
}

export const db = {

    // -------------------------
    // MASTER DATA READS
    // -------------------------

    async getProductTypes() {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('product_types')
            .select('*')
            .eq('organization_id', orgId)
            .order('name')

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getCategories() {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('category_types')
            .select('*')
            .eq('organization_id', orgId)
            .order('name')

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getTaskTypes() {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('task_types')
            .select('*')
            .eq('organization_id', orgId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getRates() {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('rate_cards')
            .select(`
                *,
                product_types(name),
                category_types(name),
                task_types(name)
            `)
            .eq('organization_id', orgId)

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
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('tailors')
            .select('*')
            .eq('organization_id', orgId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getTailorSpecialPay(tailorId) {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('tailor_special_pay')
            .select('*')
            .eq('organization_id', orgId)
            .eq('tailor_id', tailorId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async getTicketByNumber(ticket_number) {

        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('organization_id', orgId)
            .eq('ticket_number', ticket_number)
            .maybeSingle()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async createTicket({ ticket_number, customer_name, branch_id = null, internal_notes = null }) {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('tickets')
            .insert({
                organization_id: orgId,
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
        const orgId = await getOrgId()

        const rows = Array.from({ length: Number(quantity || 1) }).map(() => ({
            organization_id: orgId,
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

        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('product_types')
            .insert({
                organization_id: orgId,
                name,
                active: true
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

        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('category_types')
            .insert({
                organization_id: orgId,
                name,
                active: true
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async createTailor(tailorData) {

        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('tailors')
            .insert({
                organization_id: orgId,
                ...tailorData
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

        const { data, error } = await supabase
            .from('tailors')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data
    },

    async toggleTailorStatus(id) {

        const { data: tailor } = await supabase
            .from('tailors')
            .select('active')
            .eq('id', id)
            .single()

        const { data, error } = await supabase
            .from('tailors')
            .update({ active: !tailor.active })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return data.active
    },

    async saveTailorSpecialPay(tailor_id, task_type_id, uplift_pct) {

        const { data, error } = await supabase
            .from('tailor_special_pay')
            .upsert({
                tailor_id,
                task_type_id,
                uplift_pct
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

        const { error } = await supabase
            .from('tailor_special_pay')
            .delete()
            .eq('id', id)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }
    },

    // -------------------------
    // TASK TYPES + RATE CARD
    // -------------------------

    async upsertRateCard(payload) {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('rate_cards')
            .upsert({
                organization_id: orgId,
                product_type_id: payload.product_type_id,
                category_type_id: payload.category_type_id,
                task_type_id: payload.task_type_id,
                band_a_fee: payload.band_a_fee,
                band_b_fee: payload.band_b_fee,
                active: payload.active !== undefined ? payload.active : true
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
        const orgId = await getOrgId()

        // create task type
        const { data: taskType, error: taskError } = await supabase
            .from('task_types')
            .insert({
                organization_id: orgId,
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

        const orgId = await getOrgId()

        // product
        const { data: product } = await supabase
            .from('product_types')
            .select('*')
            .eq('name', productName)
            .eq('organization_id', orgId)
            .single()

        const productId = product?.id

        // category
        const { data: category } = await supabase
            .from('category_types')
            .select('*')
            .eq('name', categoryName)
            .eq('organization_id', orgId)
            .single()

        const categoryId = category?.id

        // create task type
        const { data: taskType } = await supabase
            .from('task_types')
            .insert({
                organization_id: orgId,
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

    async updateTaskAndRate(taskTypeId, payload) {

        const orgId = await getOrgId()

        await supabase
            .from('task_types')
            .update({ name: payload.name })
            .eq('id', taskTypeId)
            .eq('organization_id', orgId)

        const rateData = await this.upsertRateCard({
            product_type_id: payload.product_type_id,
            category_type_id: payload.category_type_id,
            task_type_id: taskTypeId,
            band_a_fee: payload.band_a_fee,
            band_b_fee: payload.band_b_fee
        })

        return rateData
    },

    // -------------------------
    // ITEMS
    // -------------------------

    async getItems() {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('items')
            .select(`
                *,
                tickets(ticket_number, customer_name),
                product_types(name)
            `)
            .eq('organization_id', orgId)
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

    async getTasksByItemId(itemId) {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('work_assignments')
            .select(`
                *,
                task_types(name),
                tailors(name),
                category_types(name)
            `)
            .eq('organization_id', orgId)
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
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId)

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        return true
    },

    async getWeeklyPayroll() {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('work_assignments')
            .select(`
      id,
      pay_amount,
      status,
      tailor_id,
      tailors (
        id,
        name
      )
    `)
            .eq('organization_id', orgId)
            .eq('status', 'PAID')

        if (error) {
            console.error(error)
            throw new Error(error.message)
        }

        const payrollMap = {}

        for (const wa of (data || [])) {
            const tailorId = wa.tailor_id
            const tailor = wa.tailors

            if (!payrollMap[tailorId]) {
                payrollMap[tailorId] = {
                    tailor_id: tailorId,
                    tailor_name: tailor?.name || 'Unknown',
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

        return Object.values(payrollMap)
    },

    async createWorkAssignment(payload) {
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

        return data
    },

    async getTasks() {
        const orgId = await getOrgId()

        const { data, error } = await supabase
            .from('work_assignments')
            .select(`
                *,
                task_types(name),
                tailors(name),
                category_types(name),
                items(item_key, tickets(customer_name, ticket_number))
            `)
            .eq('organization_id', orgId)
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
    }
}