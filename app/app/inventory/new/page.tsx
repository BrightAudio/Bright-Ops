"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInventoryItem } from "@/lib/hooks/useInventory";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Form for creating a new inventory item
//
// This page provides a simple controlled form that collects the item
// name, barcode and optional quantity fields. Upon submission it
// calls the `createInventoryItem` helper defined in the inventory
// hook and redirects the user back to the inventory list on success.

export default function NewInventoryItemPage() {
	const router = useRouter();
	const [form, setForm] = useState({
		name: "",
		barcode: "",
		qty_in_warehouse: 0,
		quantity_on_hand: 0,
		unit_value: 0,
	});
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleChange = (field: keyof typeof form, value: string | number) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await createInventoryItem({
				name: form.name.trim(),
				barcode: form.barcode.trim(),
				qty_in_warehouse: form.qty_in_warehouse,
				quantity_on_hand: form.quantity_on_hand,
				unit_value: form.unit_value,
			});
			router.push("/app/inventory");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create item");
		} finally {
			setSaving(false);
		}
	}

	return (
		<DashboardLayout>
		<main className="p-6 max-w-lg mx-auto">
			<h1 className="text-3xl font-bold mb-4 text-white">Add Inventory Item</h1>
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
					<label className="block text-sm font-medium text-zinc-200">
						Barcode
					</label>
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
				<div>
					<label className="block text-sm font-medium text-zinc-200">
						Unit Value ($)
					</label>
					<input
						type="number"
						min={0}
						step="0.01"
						value={form.unit_value}
						onChange={(e) =>
							handleChange("unit_value", Number(e.target.value))
						}
						className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
						placeholder="0.00"
					/>
				</div>
				{error && <p className="text-red-500">{error}</p>}
				<div className="flex justify-end space-x-2">
					<button
						type="button"
						onClick={() => router.push("/app/inventory")}
						className="px-4 py-2 rounded-md border border-zinc-600 text-zinc-200 hover:bg-zinc-700"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
					>
						{saving ? "Saving..." : "Create"}
					</button>
				</div>
			</form>
		</main>
		</DashboardLayout>
	);
}