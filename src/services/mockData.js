export const SEED_DATA = {
    PRODUCT_TYPES: [
        { id: 'pt1', name: 'Suit', active: true },
        { id: 'pt2', name: 'Cape', active: true },
        { id: 'pt3', name: 'Waistcoat', active: true },
        { id: 'pt4', name: 'Kimono', active: true },
        { id: 'pt5', name: 'Trouser', active: true },
    ],
    CATEGORIES: [
        { id: 'cat1', name: 'Sewing', active: true },
        { id: 'cat2', name: 'Amendment', active: true },
        { id: 'cat3', name: 'Pattern', active: true },
        { id: 'cat4', name: 'Cutting', active: true },
        { id: 'cat5', name: 'Finishing', active: true },
    ],
    TASK_TYPES: [
        { id: 'tt1', product_type_id: 'pt1', category_id: 'cat1', name: 'Full Suit Construction', active: true },
        { id: 'tt2', product_type_id: 'pt1', category_id: 'cat2', name: 'Sleeve Amendment', active: true },
        { id: 'tt3', product_type_id: 'pt2', category_id: 'cat1', name: 'Cape Stitching', active: true },
        { id: 'tt4', product_type_id: 'pt5', category_id: 'cat1', name: 'Trouser Stitching', active: true },
        { id: 'tt5', product_type_id: 'pt1', category_id: 'cat5', name: 'Button Attachment', active: true },
    ],
    RATE_CARD: [
        { id: 'rc1', product_type_id: 'pt1', category_id: 'cat1', task_type_id: 'tt1', base_fee: 500.00 },
        { id: 'rc2', product_type_id: 'pt1', category_id: 'cat2', task_type_id: 'tt2', base_fee: 50.00 },
        { id: 'rc3', product_type_id: 'pt2', category_id: 'cat1', task_type_id: 'tt3', base_fee: 300.00 },
        { id: 'rc4', product_type_id: 'pt5', category_id: 'cat1', task_type_id: 'tt4', base_fee: 150.00 },
        { id: 'rc5', product_type_id: 'pt1', category_id: 'cat5', task_type_id: 'tt5', base_fee: 20.00 },
    ],
    TAILORS: [
        { id: 't1', name: 'Elena Rossi', department: 'SUIT', base_fee_pct: 0.30, weekly_bonus_pct: 0.05, active: true, percentage: 0.30 }, // keeping percentage for backwards compat testing
        { id: 't2', name: 'Marco Vitti', department: 'CUTTER', base_fee_pct: 0.35, weekly_bonus_pct: 0.10, active: true }, // Senior
        { id: 't3', name: 'Sarah Jin', department: 'PANT', base_fee_pct: 0.30, weekly_bonus_pct: 0.05, active: true },
        { id: 't4', name: 'Ahmed K.', department: 'SHIRT', base_fee_pct: 0.25, weekly_bonus_pct: 0.02, active: true }, // Junior
    ],
    TAILOR_SPECIAL_PAY: [
        // Example: Marco gets a special 50% uplift (0.50) on Full Suit Construction instead of his base 35%
        { id: 'tsp1', tailor_id: 't2', task_type_id: 'tt1', uplift_pct: 0.50 },
        // Example: Sarah has a pending special pay rule (needs uplift rate) for Trouser Stitching
        { id: 'tsp2', tailor_id: 't3', task_type_id: 'tt4', uplift_pct: null }
    ],
    items: [
        {
            id: 'i1',
            ticket_id: 'TCK-1001',
            customer_name: 'John Doe',
            product_type_id: 'pt1',
            assigned_date: '2026-02-17T10:00:00.000Z',
            item_no: 1,
            item_key: 'TCK-1001-Suit-1',
            status: 'New',
            received_date: null,
            needs_qc_attention: false,
            notes: 'Urgent delivery requested',
            created_by_role: 'production',
            created_at: '2026-02-17T09:00:00.000Z',
        },
        {
            id: 'i2',
            ticket_id: 'TCK-1002',
            customer_name: 'Jane Smith',
            product_type_id: 'pt2',
            assigned_date: '2026-02-18T14:30:00.000Z',
            item_no: 1,
            item_key: 'TCK-1002-Cape-1',
            status: 'Received',
            received_date: '2026-02-18T15:00:00.000Z',
            needs_qc_attention: true, // Received but no tasks!
            notes: null,
            created_by_role: 'production',
            created_at: '2026-02-18T14:00:00.000Z',
        }
    ],
    tasks: []
};
