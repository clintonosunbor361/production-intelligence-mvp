// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/services/db";
import { Modal } from "@/components/UI/Modal";
import { Button } from "@/components/UI/Button";
import { Plus, Trash2 } from "lucide-react";

export function CreateItemModal({ isOpen, onClose, onSuccess }) {
    const [productTypes, setProductTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    // IMPORTANT: ticket_id is a uuid in DB, ticket_number is your human-facing ID
    const [ticketData, setTicketData] = useState({
        ticket_number: "",
        customer_name: "",
        notes: "",
    });

    const [products, setProducts] = useState([{ product_type_id: "", quantity: 1 }]);

    useEffect(() => {
        if (isOpen) {
            loadProductTypes();
        } else {
            // Reset form when closed
            setTicketData({ ticket_number: "", customer_name: "", notes: "" });
            setProducts([{ product_type_id: "", quantity: 1 }]);
            setLoading(false);
        }
    }, [isOpen]);

    const loadProductTypes = async () => {
        const pt = await db.getProductTypes();
        setProductTypes(pt.filter((p) => p.active !== false)); // Default active true if undefined
    };

    const handleAddProduct = () => {
        setProducts([...products, { product_type_id: "", quantity: 1 }]);
    };

    const handleRemoveProduct = (index) => {
        if (products.length > 1) {
            setProducts(products.filter((_, i) => i !== index));
        }
    };

    const handleProductChange = (index, field, value) => {
        const newProducts = [...products];
        newProducts[index][field] = value;
        setProducts(newProducts);
    };

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!ticketData.customer_name) {
            alert("Customer Name is required")
            return
        }

        setLoading(true)

        try {

            const ticketNumber = ticketData.ticket_number.trim()

            let ticket = await db.getTicketByNumber(ticketNumber)

            if (!ticket) {
                ticket = await db.createTicket({
                    ticket_number: ticketNumber,
                    customer_name: ticketData.customer_name.trim(),
                    branch_id: null,
                    internal_notes: ticketData.notes?.trim() || null
                })
            }

            for (const prod of products) {
                const qty = prod.quantity === "" ? 0 : Number(prod.quantity);
                await db.createItemsForTicket({
                    ticket_id: ticket.id,
                    product_type_id: prod.product_type_id,
                    quantity: qty
                })
            }

            onSuccess()
            onClose()

        } catch (err) {
            console.error(err)
            alert("Error creating items: " + err.message)
        } finally {
            setLoading(false)
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Log New Production Items"
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">
                            Ticket ID *
                        </label>
                        <input
                            type="text"
                            required
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 border focus:ring-2 focus:ring-maison-primary/20 focus:outline-none"
                            placeholder="e.g. #20262602"
                            value={ticketData.ticket_number}
                            onChange={(e) =>
                                setTicketData({ ...ticketData, ticket_number: e.target.value })
                            }
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">
                            Customer Name / Reference *
                        </label>
                        <input
                            type="text"
                            required
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 border focus:ring-2 focus:ring-maison-primary/20 focus:outline-none"
                            placeholder="Client name"
                            value={ticketData.customer_name}
                            onChange={(e) =>
                                setTicketData({ ...ticketData, customer_name: e.target.value })
                            }
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-maison-secondary">
                            Products *
                        </label>
                        <Button type="button" variant="ghost" size="sm" onClick={handleAddProduct}>
                            <Plus size={16} className="mr-1" /> Add Product
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {products.map((prod, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100 relative"
                            >
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Product Type
                                    </label>
                                    <select
                                        required
                                        className="block w-full rounded-md border-gray-200 shadow-sm sm:text-sm py-2 px-3 border bg-white focus:ring-2 focus:ring-maison-primary/20 focus:outline-none"
                                        value={prod.product_type_id}
                                        onChange={(e) =>
                                            handleProductChange(index, "product_type_id", e.target.value)
                                        }
                                    >
                                        <option value="">Select Product...</option>
                                        {productTypes.map((pt) => (
                                            <option key={pt.id} value={pt.id}>
                                                {pt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="w-24">
                                    <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        required
                                        className="block w-full rounded-md border-gray-200 shadow-sm sm:text-sm py-2 px-3 border focus:ring-2 focus:ring-maison-primary/20 focus:outline-none"
                                        value={prod.quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            handleProductChange(
                                                index,
                                                "quantity",
                                                val === "" ? "" : parseInt(val, 10)
                                            );
                                        }}
                                    />
                                </div>

                                {products.length > 1 && (
                                    <div className="pt-6">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveProduct(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Remove Product"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-maison-secondary mb-1.5">
                        Internal Notes (Optional)
                    </label>
                    <textarea
                        className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 border focus:ring-2 focus:ring-maison-primary/20 focus:outline-none"
                        rows={2}
                        placeholder="Any special instructions"
                        value={ticketData.notes}
                        onChange={(e) => setTicketData({ ...ticketData, notes: e.target.value })}
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Generate Items"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}