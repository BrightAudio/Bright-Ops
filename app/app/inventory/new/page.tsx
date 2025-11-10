"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInventoryItem } from "@/lib/hooks/useInventory";
import { generateBarcode } from "@/lib/utils/barcodeGenerator";
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
		purchase_cost: 0,
		purchase_date: "",
		useful_life_years: 5.0,
		estimated_jobs_per_year: 50,
		residual_value: 0,
	});
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [generatingBarcode, setGeneratingBarcode] = useState(false);

	const handleChange = (field: keyof typeof form, value: string | number) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	async function handleGenerateBarcode() {
		if (!form.name.trim()) {
			setError("Please enter an item name first");
			return;
		}
		
		setGeneratingBarcode(true);
		setError(null);
		
		try {
			const barcode = await generateBarcode(form.name);
			setForm((prev) => ({ ...prev, barcode }));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate barcode");
		} finally {
			setGeneratingBarcode(false);
		}
	}

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
				purchase_cost: form.purchase_cost,
				purchase_date: form.purchase_date || null,
				useful_life_years: form.useful_life_years,
				estimated_jobs_per_year: form.estimated_jobs_per_year,
				residual_value: form.residual_value,
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
					<div className="flex gap-2">
						<input
							type="text"
							value={form.barcode}
							onChange={(e) => handleChange("barcode", e.target.value)}
							className="flex-1 px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
							placeholder="e.g., X32-001"
							required
						/>
						<button
							type="button"
							onClick={handleGenerateBarcode}
							disabled={generatingBarcode || !form.name.trim()}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
						>
							{generatingBarcode ? "Generating..." : "Generate"}
						</button>
					</div>
					<p className="text-xs text-zinc-500 mt-1">
						Auto-generates unique barcode like PREFIX-001 based on item name
					</p>
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

				{/* Amortization Section */}
				<div className="border-t border-zinc-700 pt-4 mt-4">
					<h3 className="text-lg font-semibold text-white mb-3">Amortization Tracking</h3>
					<p className="text-sm text-zinc-400 mb-4">
						Track equipment depreciation and cost recovery per job
					</p>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Purchase Cost ($)
							</label>
							<input
								type="number"
								min={0}
								step="0.01"
								value={form.purchase_cost}
								onChange={(e) =>
									handleChange("purchase_cost", Number(e.target.value))
								}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
								placeholder="0.00"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Purchase Date
							</label>
							<input
								type="date"
								value={form.purchase_date}
								onChange={(e) =>
									handleChange("purchase_date", e.target.value)
								}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 mt-4">
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Useful Life (years)
							</label>
							<input
								type="number"
								min={0.1}
								step="0.1"
								value={form.useful_life_years}
								onChange={(e) =>
									handleChange("useful_life_years", Number(e.target.value))
								}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
								placeholder="5.0"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Jobs/Year
							</label>
							<input
								type="number"
								min={1}
								value={form.estimated_jobs_per_year}
								onChange={(e) =>
									handleChange("estimated_jobs_per_year", Number(e.target.value))
								}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
								placeholder="50"
							/>
						</div>
					</div>

					<div className="mt-4">
						<label className="block text-sm font-medium text-zinc-200">
							Residual Value ($)
						</label>
						<input
							type="number"
							min={0}
							step="0.01"
							value={form.residual_value}
							onChange={(e) =>
								handleChange("residual_value", Number(e.target.value))
							}
							className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
							placeholder="0.00"
						/>
						<p className="text-xs text-zinc-500 mt-1">
							Expected value at end of useful life
						</p>
					</div>

					{form.purchase_cost > 0 && form.useful_life_years > 0 && form.estimated_jobs_per_year > 0 && (
						<div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-md">
							<p className="text-sm text-blue-300">
								<strong>Amortization per job:</strong> $
								{((form.purchase_cost - form.residual_value) / (form.useful_life_years * form.estimated_jobs_per_year)).toFixed(4)}
							</p>
							<p className="text-xs text-blue-400 mt-1">
								Depreciation cost recovered per job
							</p>
						</div>
					)}
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