import { SEED_DATA } from './mockData';

const DB_KEY = 'maison_db_v1';

// Helpers to simulate delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class MaisonDB {
    constructor() {
        this.data = this._loadData();
    }

    _loadData() {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        // Initialize with seed data if empty
        this._saveData(SEED_DATA);
        return SEED_DATA;
    }

    _saveData(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        this.data = data;
    }

    // --- Master Data Getters ---

    async getProductTypes() {
        await delay(200);
        return this.data.PRODUCT_TYPES;
    }

    async getCategories() {
        await delay(200);
        return this.data.CATEGORIES;
    }

    async getTaskTypes() {
        await delay(200);
        return this.data.TASK_TYPES;
    }

    async getRateCard() {
        await delay(200);
        return this.data.RATE_CARD;
    }

    async getTailors() {
        await delay(200);
        return this.data.TAILORS;
    }

    async getTailorSpecialPay(tailorId) {
        await delay(200);
        return (this.data.TAILOR_SPECIAL_PAY || []).filter(tsp => tsp.tailor_id === tailorId);
    }

    // --- Master Data Setters (for CSV Import / Master Data Management) ---

    async createProductType(name) {
        await delay(200);
        const exists = this.data.PRODUCT_TYPES.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (exists) return exists;

        const newPT = { id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, active: true };
        const updatedData = { ...this.data, PRODUCT_TYPES: [...this.data.PRODUCT_TYPES, newPT] };
        this._saveData(updatedData);
        return newPT;
    }

    async createCategory(name) {
        await delay(200);
        const exists = this.data.CATEGORIES.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (exists) return exists;

        const newCat = { id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, active: true };
        const updatedData = { ...this.data, CATEGORIES: [...this.data.CATEGORIES, newCat] };
        this._saveData(updatedData);
        return newCat;
    }

    async createTailor(tailorData) {
        await delay(200);

        let base_fee_pct = tailorData.base_fee_pct !== undefined ? parseFloat(tailorData.base_fee_pct) : parseFloat(tailorData.percentage || 0);
        if (base_fee_pct > 1) base_fee_pct = base_fee_pct / 100;

        let weekly_bonus_pct = parseFloat(tailorData.weekly_bonus_pct || 0);
        if (weekly_bonus_pct > 1) weekly_bonus_pct = weekly_bonus_pct / 100;

        const newTailor = {
            id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: tailorData.name,
            department: tailorData.department || 'OTHER',
            base_fee_pct,
            weekly_bonus_pct,
            active: tailorData.active !== undefined ? tailorData.active : true,
            percentage: base_fee_pct // fallback for very old code
        };
        const updatedData = { ...this.data, TAILORS: [...this.data.TAILORS, newTailor] };
        this._saveData(updatedData);
        return newTailor;
    }

    async updateTailor(id, updates) {
        await delay(200);

        // Clean percentages if they are being updated
        let cleanUpdates = { ...updates };
        if (cleanUpdates.base_fee_pct !== undefined) {
            let pct = parseFloat(cleanUpdates.base_fee_pct);
            if (pct > 1) pct = pct / 100;
            cleanUpdates.base_fee_pct = pct;
            cleanUpdates.percentage = pct; // sync legacy field
        }
        if (cleanUpdates.weekly_bonus_pct !== undefined) {
            let pct = parseFloat(cleanUpdates.weekly_bonus_pct);
            if (pct > 1) pct = pct / 100;
            cleanUpdates.weekly_bonus_pct = pct;
        }

        const updatedTailors = this.data.TAILORS.map(t =>
            t.id === id ? { ...t, ...cleanUpdates } : t
        );
        this._saveData({ ...this.data, TAILORS: updatedTailors });
        return updatedTailors.find(t => t.id === id);
    }

    async saveTailorSpecialPay(tailor_id, task_type_id, uplift_pct) {
        await delay(100);
        let specialPays = this.data.TAILOR_SPECIAL_PAY || [];

        let cleanUplift = uplift_pct !== null && uplift_pct !== '' ? parseFloat(uplift_pct) : null;
        if (cleanUplift !== null && cleanUplift > 1) cleanUplift = cleanUplift / 100;

        const existingIndex = specialPays.findIndex(sp => sp.tailor_id === tailor_id && sp.task_type_id === task_type_id);

        const newRecord = {
            id: existingIndex >= 0 ? specialPays[existingIndex].id : `tsp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            tailor_id,
            task_type_id,
            uplift_pct: cleanUplift
        };

        if (existingIndex >= 0) {
            specialPays[existingIndex] = newRecord;
        } else {
            specialPays.push(newRecord);
        }

        this._saveData({ ...this.data, TAILOR_SPECIAL_PAY: specialPays });
        return newRecord;
    }

    async removeTailorSpecialPay(id) {
        await delay(100);
        const specialPays = (this.data.TAILOR_SPECIAL_PAY || []).filter(sp => sp.id !== id);
        this._saveData({ ...this.data, TAILOR_SPECIAL_PAY: specialPays });
    }

    async createTaskAndRate(productName, categoryName, taskName, baseFee) {
        await delay(200);

        let pt = this.data.PRODUCT_TYPES.find(p => p.name.toLowerCase() === productName.toLowerCase());
        if (!pt) pt = await this.createProductType(productName); // Lazy create dependencies? Or fail. Let's lazy create for smoother UX.

        let cat = this.data.CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!cat) cat = await this.createCategory(categoryName);

        // Check if task type exists
        let tt = this.data.TASK_TYPES.find(t =>
            t.product_type_id === pt.id &&
            t.category_id === cat.id &&
            t.name.toLowerCase() === taskName.toLowerCase()
        );

        if (!tt) {
            tt = {
                id: `tt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                product_type_id: pt.id,
                category_id: cat.id,
                name: taskName,
                active: true
            };
            this.data.TASK_TYPES.push(tt); // Modifying in place for this complex op, saved at end
        }

        // Add/Update Rate
        const existingRateIndex = this.data.RATE_CARD.findIndex(r =>
            r.product_type_id === pt.id &&
            r.category_id === cat.id &&
            r.task_type_id === tt.id
        );

        const newRate = {
            id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            product_type_id: pt.id,
            category_id: cat.id,
            task_type_id: tt.id,
            base_fee: parseFloat(baseFee)
        };

        if (existingRateIndex >= 0) {
            this.data.RATE_CARD[existingRateIndex] = newRate;
        } else {
            this.data.RATE_CARD.push(newRate);
        }

        const updatedData = { ...this.data }; // TASK_TYPES and RATE_CARD were mutated in place on this.data refs
        this._saveData(updatedData);
        return newRate;
    }

    // --- Operational Data ---

    // ITEMS
    async getItems() {
        await delay(300);
        // Enrich items with product type name for display convenience
        return this.data.items.map(item => {
            const pt = this.data.PRODUCT_TYPES.find(p => p.id === item.product_type_id);
            return { ...item, product_type_name: pt ? pt.name : 'Unknown' };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    async createItem(itemData) {
        await delay(300);
        const newItems = [];
        const now = new Date().toISOString();

        // Auto-generate logic per quantity
        const qty = itemData.quantity || 1;

        for (let i = 0; i < qty; i++) {
            // Find max item_no for this ticket + product
            const existingItems = this.data.items.filter(
                it => it.ticket_id === itemData.ticket_id && it.product_type_id === itemData.product_type_id
            );
            const maxNo = existingItems.reduce((max, it) => Math.max(max, it.item_no), 0);
            const nextNo = maxNo + 1 + i; // +i because we are creating multiple in this loop

            const pt = this.data.PRODUCT_TYPES.find(p => p.id === itemData.product_type_id);
            const ptName = pt ? pt.name : 'Item';
            const itemKey = `${itemData.ticket_id}-${ptName}-${nextNo}`;

            const newItem = {
                id: crypto.randomUUID(),
                ...itemData,
                item_no: nextNo,
                item_key: itemKey,
                status: 'New',
                received_date: null,
                needs_qc_attention: false,
                created_at: now,
                // remove auxiliary fields not for DB
                quantity: undefined
            };
            newItems.push(newItem);
        }

        const updatedData = {
            ...this.data,
            items: [...this.data.items, ...newItems]
        };
        this._saveData(updatedData);
        return newItems;
    }

    async updateItemStatus(itemId, status) {
        await delay(200);
        const updatedItems = this.data.items.map(item => {
            if (item.id === itemId) {
                const updates = { status };
                if (status === 'Received') {
                    updates.received_date = new Date().toISOString();
                    // Check if tasks exist
                    const hasTasks = this.data.tasks.some(t => t.item_id === itemId);
                    if (!hasTasks) {
                        updates.needs_qc_attention = true;
                    }
                }
                return { ...item, ...updates };
            }
            return item;
        });
        this._saveData({ ...this.data, items: updatedItems });
        return updatedItems.find(i => i.id === itemId);
    }

    async deleteItem(itemId) {
        await delay(200);
        const filteredItems = this.data.items.filter(i => i.id !== itemId);
        const filteredTasks = this.data.tasks.filter(t => t.item_id !== itemId);

        this._saveData({
            ...this.data,
            items: filteredItems,
            tasks: filteredTasks
        });
        return true;
    }

    // TASKS
    async getTasksByItemId(itemId) {
        await delay(200);
        return this.data.tasks.filter(t => t.item_id === itemId);
    }

    async getTasks(filters = {}) {
        await delay(300);
        let tasks = this.data.tasks;

        // Basic filtering
        if (filters.verification_status) {
            tasks = tasks.filter(t => t.verification_status === filters.verification_status);
        }

        // Enrich with related data for display
        return tasks.map(task => {
            const item = this.data.items.find(i => i.id === task.item_id);
            const tailor = this.data.TAILORS.find(t => t.id === task.tailor_id);
            const cat = this.data.CATEGORIES.find(c => c.id === task.category_id);
            const tt = this.data.TASK_TYPES.find(t => t.id === task.task_type_id);
            const pt = this.data.PRODUCT_TYPES.find(p => p.id === item?.product_type_id);

            // Backward compatibility for task_pay calculation if missing
            let task_pay = task.task_pay;
            if (task_pay === undefined) {
                const base_fee = task.base_fee_snapshot !== undefined ? task.base_fee_snapshot : (this.data.RATE_CARD.find(r => r.product_type_id === item?.product_type_id && r.category_id === task.category_id && r.task_type_id === task.task_type_id)?.base_fee || 0);
                const uplift = task.uplift_pct_snapshot !== undefined ? task.uplift_pct_snapshot : (tailor?.base_fee_pct ?? tailor?.percentage ?? 0);
                task_pay = base_fee * (1 + uplift);
            }

            return {
                ...task,
                item_key: item?.item_key,
                customer_name: item?.customer_name,
                tailor_name: tailor?.name,
                category_name: cat?.name,
                task_type_name: tt?.name,
                product_type_name: pt?.name,
                task_pay // Computed or actual snapshot
            };
        });
    }

    async createTask(taskData) {
        await delay(300);

        // Look up rates for snapshot
        const rateCard = this.data.RATE_CARD.find(rc =>
            rc.product_type_id === taskData.product_type_id && // Passed from context or looked up
            rc.category_id === taskData.category_id &&
            rc.task_type_id === taskData.task_type_id
        );

        if (!rateCard) {
            throw new Error("No rate card found for this combination.");
        }

        const tailor = this.data.TAILORS.find(t => t.id === taskData.tailor_id);
        const specialPays = this.data.TAILOR_SPECIAL_PAY || [];

        // Check for special pay override
        const specialPay = specialPays.find(sp => sp.tailor_id === taskData.tailor_id && sp.task_type_id === taskData.task_type_id);

        let uplift_used = tailor.base_fee_pct !== undefined ? tailor.base_fee_pct : tailor.percentage;
        if (specialPay && specialPay.uplift_pct !== null) {
            uplift_used = specialPay.uplift_pct;
        }

        const base_fee_snapshot = rateCard.base_fee;
        const uplift_pct_snapshot = uplift_used;
        const task_pay = base_fee_snapshot * (1 + uplift_used);

        const newTask = {
            id: crypto.randomUUID(),
            ...taskData,
            base_fee_snapshot,
            uplift_pct_snapshot,
            tailor_percentage_snapshot: uplift_pct_snapshot, // legacy fallback safety
            task_pay,
            tailor_pay: task_pay, // legacy fallback safety
            verification_status: 'Pending',
            verified_by_role: null,
            verified_at: null,
            created_at: new Date().toISOString()
        };

        const updatedData = {
            ...this.data,
            tasks: [...this.data.tasks, newTask]
        };
        this._saveData(updatedData);

        // Update Item status to "Assigned by QC" and clear needs_qc_attention
        if (taskData.item_id) {
            const updatedItems = this.data.items.map(i => {
                if (i.id === taskData.item_id) {
                    return {
                        ...i,
                        status: 'Assigned by QC',
                        needs_qc_attention: false
                    };
                }
                return i;
            });
            this._saveData({ ...updatedData, items: updatedItems });
        }

        return newTask;
    }

    async verifyTask(taskId, status, reason = null) {
        await delay(200);
        const updatedTasks = this.data.tasks.map(t => {
            if (t.id === taskId) {
                return {
                    ...t,
                    verification_status: status,
                    verified_at: new Date().toISOString(),
                    reject_reason: reason
                };
            }
            return t;
        });
        this._saveData({ ...this.data, tasks: updatedTasks });
        return updatedTasks.find(t => t.id === taskId);
    }

    // WEEKLY PAYROLL REPORTING (MVP)
    async getWeeklyPayroll() {
        await delay(200);

        // In a real app we'd filter by a date range. For MVP, we'll just sum all Approved tasks.
        const verifiedTasks = this.data.tasks.filter(t => t.verification_status === 'Approved' || t.verification_status === 'Verified');
        const tailorsCount = this.data.TAILORS;

        const payrollSummary = tailorsCount.map(tailor => {
            const tailorTasks = verifiedTasks.filter(t => t.tailor_id === tailor.id);
            const weekly_verified_total = tailorTasks.reduce((sum, t) => {
                let pay = t.task_pay;
                // backward compat for old tasks
                if (pay === undefined && t.tailor_pay !== undefined) pay = t.tailor_pay;
                if (pay === undefined) pay = 0;
                return sum + pay;
            }, 0);

            const bonusPct = tailor.weekly_bonus_pct || 0;
            const weekly_bonus_amount = weekly_verified_total * bonusPct;
            const weekly_total_pay = weekly_verified_total + weekly_bonus_amount;

            return {
                tailor_id: tailor.id,
                tailor_name: tailor.name,
                department: tailor.department,
                weekly_verified_total,
                weekly_bonus_pct: bonusPct,
                weekly_bonus_amount,
                weekly_total_pay,
                task_count: tailorTasks.length
            };
        });

        return payrollSummary;
    }

    // Reset DB (dev tool)
    async reset() {
        this._saveData(SEED_DATA);
        return SEED_DATA;
    }
}

export const db = new MaisonDB();
