'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgId(supabase: any): Promise<string> {
    const { data, error } = await supabase.rpc('current_org_id')
    if (error || !data) throw new Error('Could not determine organization. Is your account configured?')
    return data
}

async function requirePermission(supabase: any, permission: string) {
    const { data } = await supabase.rpc('has_permission', { required_permission: permission })
    if (!data) throw new Error(`Permission denied: requires '${permission}'`)
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION ITEMS
// ══════════════════════════════════════════════════════════════════════════════

export async function createProductionBatchAction(
    ticketNumber: string,
    productTypeId: string,
    quantity: number
) {
    const supabase = await createClient()
    const orgId = await getOrgId(supabase)

    // Upsert ticket by ticket_number (idempotent)
    const { data: ticket, error: ticketErr } = await supabase
        .from('tickets')
        .upsert(
            { organization_id: orgId, ticket_number: ticketNumber.trim() },
            { onConflict: 'organization_id,ticket_number' }
        )
        .select('id')
        .single()
    if (ticketErr) throw new Error(ticketErr.message)

    // Fetch product type name for item_key generation
    const { data: pt, error: ptErr } = await supabase
        .from('product_types')
        .select('name')
        .eq('id', productTypeId)
        .single()
    if (ptErr) throw new Error(ptErr.message)

    // Count existing items for this ticket + product type (for sequential numbering)
    const { count: existing } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('ticket_id', ticket.id)
        .eq('product_type_id', productTypeId)

    const items = Array.from({ length: quantity }, (_, i) => {
        const itemNo = (existing ?? 0) + i + 1
        return {
            organization_id: orgId,
            ticket_id: ticket.id,
            product_type_id: productTypeId,
            item_key: `${ticketNumber.trim()}-${pt.name}-${itemNo}`,
        }
    })

    const { error: insertErr } = await supabase.from('items').insert(items)
    if (insertErr) throw new Error(insertErr.message)

    revalidatePath('/production')
    return { ticketId: ticket.id, count: quantity }
}

export async function deleteItemAction(itemId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('items').delete().eq('id', itemId)
    if (error) throw new Error(error.message)
    revalidatePath('/production')
    return { success: true }
}

// ══════════════════════════════════════════════════════════════════════════════
// WORK ASSIGNMENTS (QC)
// ══════════════════════════════════════════════════════════════════════════════

export async function createWorkAssignmentAction(
    itemId: string,
    taskTypeId: string,
    tailorId: string
) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('create_work_assignment', {
        p_item_id: itemId,
        p_task_type_id: taskTypeId,
        p_tailor_id: tailorId,
    })
    if (error) throw new Error(error.message)
    revalidatePath('/qc')
    return data
}

export async function qcPassAction(assignmentId: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('qc_pass', { p_assignment_id: assignmentId })
    if (error) throw new Error(error.message)
    revalidatePath('/qc')
    revalidatePath('/accounts')
    return { success: true }
}

export async function qcFailAction(assignmentId: string, notes: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('qc_fail', {
        p_assignment_id: assignmentId,
        p_notes: notes,
    })
    if (error) throw new Error(error.message)
    revalidatePath('/qc')
    return { success: true }
}

export async function cancelItemAction(itemId: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('cancel_item', { p_item_id: itemId })
    if (error) throw new Error(error.message)
    revalidatePath('/production')
    revalidatePath('/qc')
    return { success: true }
}

export async function completeItemAction(itemId: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('complete_item', { p_item_id: itemId })
    if (error) throw new Error(error.message)
    revalidatePath('/completion')
    revalidatePath('/production')
    return { success: true }
}

export async function cancelTicketAction(ticketId: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('cancel_ticket', { p_ticket_id: ticketId })
    if (error) throw new Error(error.message)
    revalidatePath('/production')
    return { success: true }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS (Accounts)
// ══════════════════════════════════════════════════════════════════════════════

export async function createPaymentBatchAction(
    assignmentIds: string[],
    batchRef: string,
    paidAt: string
) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('create_payment_batch', {
        p_assignment_ids: assignmentIds,
        p_batch_ref: batchRef,
        p_paid_at: paidAt,
    })
    if (error) throw new Error(error.message)
    revalidatePath('/accounts')
    return data
}

export async function reversePaymentAction(assignmentId: string, reason: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('reverse_payment', {
        p_assignment_id: assignmentId,
        p_reason: reason,
    })
    if (error) throw new Error(error.message)
    revalidatePath('/accounts')
    return { success: true }
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER DATA — use admin client after permission check
// (RLS has no write policies for master data tables; writes are admin-only)
// ══════════════════════════════════════════════════════════════════════════════

export async function upsertTailorAction(formData: {
    name: string
    band: 'A' | 'B'
    active: boolean
    id?: string
}) {
    const supabase = await createClient()
    await requirePermission(supabase, 'admin')
    const orgId = await getOrgId(supabase)
    const admin = createAdminClient()

    if (formData.id) {
        const { error } = await admin
            .from('tailors')
            .update({ name: formData.name, band: formData.band, active: formData.active })
            .eq('id', formData.id)
            .eq('organization_id', orgId)
        if (error) throw new Error(error.message)
    } else {
        const { error } = await admin
            .from('tailors')
            .insert({ organization_id: orgId, name: formData.name, band: formData.band })
        if (error) throw new Error(error.message)
    }

    revalidatePath('/tailors')
    return { success: true }
}

export async function upsertProductTypeAction(name: string, id?: string) {
    const supabase = await createClient()
    await requirePermission(supabase, 'admin')
    const orgId = await getOrgId(supabase)
    const admin = createAdminClient()

    if (id) {
        const { error } = await admin
            .from('product_types')
            .update({ name })
            .eq('id', id)
            .eq('organization_id', orgId)
        if (error) throw new Error(error.message)
    } else {
        const { error } = await admin
            .from('product_types')
            .insert({ organization_id: orgId, name })
        if (error) throw new Error(error.message)
    }

    revalidatePath('/products')
    return { success: true }
}

export async function upsertTaskTypeAction(name: string, id?: string) {
    const supabase = await createClient()
    await requirePermission(supabase, 'admin')
    const orgId = await getOrgId(supabase)
    const admin = createAdminClient()

    if (id) {
        const { error } = await admin
            .from('task_types')
            .update({ name })
            .eq('id', id)
            .eq('organization_id', orgId)
        if (error) throw new Error(error.message)
    } else {
        const { error } = await admin
            .from('task_types')
            .insert({ organization_id: orgId, name })
        if (error) throw new Error(error.message)
    }

    revalidatePath('/categories')
    return { success: true }
}

export async function upsertRateCardAction(data: {
    taskTypeId: string
    productTypeId: string
    bandAFee: number
    bandBFee: number
    id?: string
}) {
    const supabase = await createClient()
    await requirePermission(supabase, 'admin')
    const orgId = await getOrgId(supabase)
    const admin = createAdminClient()

    if (data.id) {
        const { error } = await admin
            .from('rate_cards')
            .update({ band_a_fee: data.bandAFee, band_b_fee: data.bandBFee })
            .eq('id', data.id)
            .eq('organization_id', orgId)
        if (error) throw new Error(error.message)
    } else {
        const { error } = await admin.from('rate_cards').insert({
            organization_id: orgId,
            task_type_id: data.taskTypeId,
            product_type_id: data.productTypeId,
            band_a_fee: data.bandAFee,
            band_b_fee: data.bandBFee,
        })
        if (error) throw new Error(error.message)
    }

    revalidatePath('/rates')
    return { success: true }
}
