"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
	useInventoryItem,
	updateInventoryItem,
	deleteInventoryItem,
} from "@/lib/hooks/useInventory";

// Edit inventory item page
//
// This page loads the item specified by the route parameter and
// populates a form for editing. Users can update the item's name,
// barcode and quantity fields or permanently delete the item. After
// saving or deleting, the user is redirected back to the inventory
// list.

export default function EditInventoryItemPage() {
	const router = useRouter();
	const params = useParams();
	const idParam = params?.id;
	const id = typeof idParam === "string" ? idParam : Array.isArray(idParam) ? idParam[0] : undefined;
	const { item, loading, error } = useInventoryItem(id);
	const [form, setForm] = useState({
		name: "",
		barcode: "",
		qty_in_warehouse: 0,
		quantity_on_hand: 0,
	});
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);

	// Populate form when item loads
	useEffect(() => {
		if (item) {
			setForm({
				name: item.name ?? "",
				barcode: item.barcode ?? "",
				qty_in_warehouse: item.qty_in_warehouse ?? 0,
				quantity_on_hand: item.quantity_on_hand ?? 0,
			});
		}
	}, [item]);

	const handleChange = (field: keyof typeof form, value: string | number) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!id) return;
		setSaving(true);
		setLocalError(null);
		try {
			await updateInventoryItem(id, {
				name: form.name.trim(),
				barcode: form.barcode.trim(),
				qty_in_warehouse: form.qty_in_warehouse,
				quantity_on_hand: form.quantity_on_hand,
			});
			router.push("/inventory");
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Failed to update item");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!id) return;
		if (!confirm("Delete this item? This cannot be undone.")) return;
		setDeleting(true);
		setLocalError(null);
		try {
			await deleteInventoryItem(id);
			router.push("/inventory");
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Failed to delete item");
		} finally {
			setDeleting(false);
		}
	}

	if (loading) {
		return <p className="p-6 text-zinc-400">Loading...</p>;
	}
	if (error || !item) {
		return <p className="p-6 text-red-500">{error ?? "Item not found"}</p>;
	}

	return (
		<main className="p-6 max-w-lg mx-auto">
			<h1 className="text-3xl font-bold mb-4 text-white">Edit Item</h1>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-zinc-200">Name</label>
					<input
						type="text"
						value={form.name}
						onChange={(e) => handleChange("name", e.target.value)}
						className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-zinc-200">Barcode</label>
					<input
						type="text"
						value={form.barcode}
						onChange={(e) => handleChange("barcode", e.target.value)}
						className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
						required
					/>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-zinc-200">
							Qty in Warehouse
						</label>
						<input
							type="number"
							min={0}
							value={form.qty_in_warehouse}
							onChange={(e) =>
								handleChange("qty_in_warehouse", Number(e.target.value))
							}
							className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-zinc-200">
							Qty on Hand
						</label>
						<input
							type="number"
							min={0}
							value={form.quantity_on_hand}
							onChange={(e) =>
								handleChange("quantity_on_hand", Number(e.target.value))
							}
							className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
						/>
					</div>
				</div>
				{localError && <p className="text-red-500">{localError}</p>}
				<div className="flex justify-between space-x-2">
					<button
						type="button"
						onClick={() => router.push("/inventory")}
						className="px-4 py-2 rounded-md border border-zinc-600 text-zinc-200 hover:bg-zinc-700"
					>
						Cancel
					</button>
					<div className="flex space-x-2">
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleting}
							className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
						>
							{deleting ? "Deleting..." : "Delete"}
						</button>
						<button
							type="submit"
							disabled={saving}
							className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
						>
							{saving ? "Saving..." : "Save"}
						</button>
					</div>
				</div>
			</form>
		</main>
	);
}
// PATCHED: Replacing with new file
