"use client";

import Link from "next/link";
import { useState } from "react";
import {
	useInventory,
	deleteInventoryItem,
	InventoryItem,
} from "@/lib/hooks/useInventory";

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

	return (
		<main className="p-6">
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-3xl font-bold text-white">Inventory</h1>
				<Link
					href="/inventory/new"
					className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
				>
					Add Item
				</Link>
			</div>
			<div className="mb-4">
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or barcode..."
					className="w-full md:w-1/3 px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
				/>
			</div>
			{loading ? (
				<p className="text-zinc-400">Loading inventory...</p>
			) : error ? (
				<p className="text-red-500">{error}</p>
			) : (
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b border-zinc-700">
							<th className="py-2 px-1">Barcode</th>
							<th className="py-2 px-1">Name</th>
							<th className="py-2 px-1">Qty in Warehouse</th>
							<th className="py-2 px-1">Qty on Hand</th>
							<th className="py-2 px-1">Actions</th>
						</tr>
					</thead>
					<tbody>
						{items && items.length > 0 ? (
							items.map((item: InventoryItem) => (
								<tr key={item.id} className="border-b border-zinc-800">
									<td className="py-2 px-1">{item.barcode}</td>
									<td className="py-2 px-1">{item.name}</td>
									<td className="py-2 px-1">{item.qty_in_warehouse ?? 0}</td>
									<td className="py-2 px-1">{item.quantity_on_hand ?? 0}</td>
									<td className="py-2 px-1">
										<Link
											href={`/inventory/${item.id}`}
											className="text-blue-400 hover:underline mr-2"
										>
											Edit
										</Link>
										<button
											onClick={() => handleDelete(item.id)}
											className="text-red-400 hover:underline"
										>
											Delete
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={5} className="py-4 text-center text-zinc-500">
									No items found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			)}
		</main>
	);
}
