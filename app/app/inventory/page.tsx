"use client";

import Link from "next/link";
import { useState } from "react";
import {
	useInventory,
	deleteInventoryItem,
	InventoryItem,
} from "@/lib/hooks/useInventory";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Inventory listing page
//
// This page displays all inventory items in a simple table and allows
// searching as well as deleting individual rows. It also exposes a
// button linking to the new item form. The goal of this page is to
// provide a quick overview of your equipment and let you manage it
// without diving into the database. It relies on the `useInventory`
// hook to fetch data from Supabase in real time.

export default function InventoryPage() {
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [maintenanceFilter, setMaintenanceFilter] = useState("");
	const [sortBy, setSortBy] = useState("name");
	const { data: items, loading, error, refetch } = useInventory({ search });

	// Handler for removing an item. Because Supabase row level
	// permissions should protect critical data, deleting an item
	// completely removes it from the `inventory_items` table.
	async function handleDelete(id: string) {
		if (!confirm("Delete this item? This action cannot be undone.")) {
			return;
		}
		try {
			await deleteInventoryItem(id);
			// Refresh the inventory list to reflect the deletion
			refetch();
		} catch (err) {
			alert(err instanceof Error ? err.message : String(err));
		}
	}

	// Calculate total value of all inventory
	const totalValue = items?.reduce((sum, item) => {
		const qty = item.quantity_on_hand ?? 0;
		const value = item.unit_value ?? 0;
		return sum + (qty * value);
	}, 0) ?? 0;

	// Apply filters and sorting
	const filteredItems = items
		?.filter(item => {
			if (categoryFilter && item.category !== categoryFilter) return false;
			if (maintenanceFilter && item.maintenance_status !== maintenanceFilter) return false;
			return true;
		})
		.sort((a, b) => {
			switch (sortBy) {
				case "name":
					return (a.name || "").localeCompare(b.name || "");
				case "barcode":
					return (a.barcode || "").localeCompare(b.barcode || "");
				case "value":
					const aValue = (a.quantity_on_hand ?? 0) * (a.unit_value ?? 0);
					const bValue = (b.quantity_on_hand ?? 0) * (b.unit_value ?? 0);
					return bValue - aValue;
				case "maintenance":
					return (a.maintenance_status || "").localeCompare(b.maintenance_status || "");
				default:
					return 0;
			}
		}) || [];

	return (
		<DashboardLayout>
		<main className="p-6">
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-3xl font-bold text-white">Inventory</h1>
				<Link
					href="/app/inventory/new"
					className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
				>
					Add Item
				</Link>
			</div>
			<div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or barcode..."
					className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
				/>
				<select
					value={categoryFilter}
					onChange={(e) => setCategoryFilter(e.target.value)}
					className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
				>
					<option value="">All Categories</option>
					<option value="monitor_wedges">Monitor Wedges</option>
					<option value="tops">Tops</option>
					<option value="subs">Subs</option>
					<option value="amps">Amps</option>
					<option value="amprack">Amp Rack</option>
					<option value="road_cases">Road Cases</option>
					<option value="lights">Lights</option>
					<option value="uplights">Uplights</option>
					<option value="field_audio">Field Audio</option>
					<option value="column_speakers">Column Speakers</option>
					<option value="other">Other</option>
				</select>
				<select
					value={maintenanceFilter}
					onChange={(e) => setMaintenanceFilter(e.target.value)}
					className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
				>
					<option value="">All Maintenance Status</option>
					<option value="operational">Operational</option>
					<option value="needs_repair">Needs Repair</option>
					<option value="in_repair">In Repair</option>
					<option value="retired">Retired</option>
				</select>
				<select
					value={sortBy}
					onChange={(e) => setSortBy(e.target.value)}
					className="px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
				>
					<option value="name">Sort by Name</option>
					<option value="barcode">Sort by Barcode</option>
					<option value="value">Sort by Value</option>
					<option value="maintenance">Sort by Status</option>
				</select>
			</div>
			{loading ? (
				<p className="text-zinc-400">Loading inventory...</p>
			) : error ? (
				<p className="text-red-500">{error}</p>
			) : (
				<>
					<div className="space-y-2">
						{/* Header */}
						<div className="grid grid-cols-7 gap-0 px-4 py-2 text-sm font-semibold text-zinc-400 border-b border-zinc-700">
							<div className="px-2 border-r border-zinc-700">Barcode</div>
							<div className="px-2 border-r border-zinc-700">Name</div>
							<div className="px-2 border-r border-zinc-700">Qty in Warehouse</div>
							<div className="px-2 border-r border-zinc-700">Qty on Hand</div>
							<div className="px-2 border-r border-zinc-700 text-right">Unit Value</div>
							<div className="px-2 border-r border-zinc-700 text-right">Total Value</div>
							<div className="px-2">Actions</div>
						</div>
						
						{/* Item rows as cards */}
						{filteredItems && filteredItems.length > 0 ? (
							filteredItems.map((item: InventoryItem) => {
								const qty = item.quantity_on_hand ?? 0;
								const unitValue = item.unit_value ?? 0;
								const itemTotal = qty * unitValue;
								return (
									<div 
										key={item.id} 
										className="grid grid-cols-7 gap-0 px-4 py-3 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-lg border border-zinc-700/50 hover:border-zinc-600 cursor-pointer transition-all shadow-sm hover:shadow-md"
										onClick={() => window.location.href = `/app/inventory/${item.id}`}
									>
										<div className="text-sm text-zinc-300 px-2 border-r border-zinc-700/50">{item.barcode}</div>
										<div className="text-sm font-medium text-white px-2 border-r border-zinc-700/50">{item.name}</div>
										<div className="text-sm text-zinc-300 px-2 border-r border-zinc-700/50">{item.qty_in_warehouse ?? 0}</div>
										<div className="text-sm text-zinc-300 px-2 border-r border-zinc-700/50">{qty}</div>
										<div className="text-sm text-zinc-300 text-right px-2 border-r border-zinc-700/50">
											{unitValue > 0 ? `$${unitValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
										</div>
										<div className="text-sm font-semibold text-green-400 text-right px-2 border-r border-zinc-700/50">
											{itemTotal > 0 ? `$${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
										</div>
										<div className="text-sm flex gap-2 px-2" onClick={(e) => e.stopPropagation()}>
											<Link
												href={`/app/inventory/${item.id}`}
												className="text-blue-400 hover:text-blue-300 hover:underline"
											>
												Edit
											</Link>
											<button
												onClick={() => handleDelete(item.id)}
												className="text-red-400 hover:text-red-300 hover:underline"
											>
												Delete
											</button>
										</div>
									</div>
								);
							})
						) : (
							<div className="py-8 text-center text-zinc-500">
								No items found.
							</div>
						)}
					</div>
					<div className="mt-4 pt-4 border-t border-zinc-700 flex justify-end">
						<div className="text-lg font-bold">
							Total Inventory Value: <span className="text-green-400">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
						</div>
					</div>
				</>
			)}
		</main>
		</DashboardLayout>
	);
}
