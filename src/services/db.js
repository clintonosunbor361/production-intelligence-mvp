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

            return {
                ...task,
                item_key: item?.item_key,
                tailor_name: tailor?.name,
                category_name: cat?.name,
                task_type_name: tt?.name,
                product_type_name: pt?.name
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

        const base_fee_snapshot = rateCard.base_fee;
        const tailor_percentage_snapshot = tailor.percentage;
        const tailor_pay = base_fee_snapshot * tailor_percentage_snapshot;

        const newTask = {
            id: crypto.randomUUID(),
            ...taskData,
            base_fee_snapshot,
            tailor_percentage_snapshot,
            tailor_pay,
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

        // Clear needs_qc_attention on item if it was set
        // (Though usually task creation happens before receipt, IF item was received empty, adding a task should clear the flag? 
        // Requirement said: "Only if Item has 0 tasks". Now it has 1. So yes.)
        if (taskData.item_id) {
            const item = this.data.items.find(i => i.id === taskData.item_id);
            if (item && item.needs_qc_attention) {
                const updatedItems = this.data.items.map(i => i.id === item.id ? { ...i, needs_qc_attention: false } : i);
                this._saveData({ ...updatedData, items: updatedItems });
            }
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

    // Reset DB (dev tool)
    async reset() {
        this._saveData(SEED_DATA);
        return SEED_DATA;
    }
}

export const db = new MaisonDB();
