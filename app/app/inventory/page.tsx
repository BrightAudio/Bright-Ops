"use client";

import Link from "next/link";
import { useState } from "react";
import {
	useInventory,
	deleteInventoryItem,
	InventoryItem,
	InventoryItemWithJob,
} from "@/lib/hooks/useInventory";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLocation } from "@/lib/contexts/LocationContext";

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
	const [csvModalOpen, setCsvModalOpen] = useState(false);
	const { data: items, loading, error, refetch } = useInventory({ search });
	const { currentLocation } = useLocation();

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
			// Filter by location if not "All Locations"
			if (currentLocation !== "All Locations" && item.location !== currentLocation) return false;
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
				<div className="flex gap-2">
					<button
						onClick={() => setCsvModalOpen(true)}
						className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
					>
						📁 Import CSV
					</button>
					<Link
						href="/app/inventory/new"
						className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
					>
						Add Item
					</Link>
				</div>
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
						<div className="grid grid-cols-8 gap-0 px-4 py-2 text-sm font-semibold text-zinc-400 border-b border-zinc-700">
							<div className="px-2 border-r border-zinc-700">Barcode</div>
							<div className="px-2 border-r border-zinc-700">Name</div>
							<div className="px-2 border-r border-zinc-700">Location</div>
							<div className="px-2 border-r border-zinc-700">Qty in Warehouse</div>
							<div className="px-2 border-r border-zinc-700">Qty on Hand</div>
							<div className="px-2 border-r border-zinc-700 text-right">Unit Value</div>
							<div className="px-2 border-r border-zinc-700 text-right">Total Value</div>
							<div className="px-2">Actions</div>
						</div>
						
						{/* Item rows as cards */}
						{filteredItems && filteredItems.length > 0 ? (
							filteredItems.map((item: InventoryItemWithJob) => {
								const qty = item.quantity_on_hand ?? 0;
								const unitValue = item.unit_value ?? 0;
								const itemTotal = qty * unitValue;
								const qtyInWarehouse = item.qty_in_warehouse ?? 0;
								
								// Determine location display
								let locationDisplay: React.ReactNode;
								if (qtyInWarehouse > 0) {
									locationDisplay = <span className="text-green-400">Warehouse</span>;
								} else if (item.currentJob) {
									locationDisplay = <span className="text-yellow-400">{item.currentJob.name}</span>;
								} else {
									locationDisplay = <span className="text-yellow-400">On Job</span>;
								}
								
								return (
									<div 
										key={item.id} 
										className="grid grid-cols-8 gap-0 px-4 py-3 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-lg border border-zinc-700/50 hover:border-zinc-600 cursor-pointer transition-all shadow-sm hover:shadow-md"
										onClick={() => window.location.href = `/app/inventory/${item.id}`}
									>
										<div className="text-sm text-zinc-300 px-2 border-r border-zinc-700/50">{item.barcode}</div>
										<div className="text-sm font-medium text-white px-2 border-r border-zinc-700/50">{item.name}</div>
										<div className="text-sm text-zinc-300 px-2 border-r border-zinc-700/50">
											{locationDisplay}
										</div>
										<div className="text-sm text-zinc-300 px-2 border-r border-zinc-700/50">{qtyInWarehouse}</div>
										<div className="text-sm text-zinc-300 px-2 border-r border-zinc-700/50">{qty}</div>
										<div className="text-sm text-zinc-300 text-right px-2 border-r border-zinc-700/50">
											{unitValue > 0 ? `$${unitValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
										</div>
										<div className="text-sm font-semibold text-green-400 text-right px-2 border-r border-zinc-700/50">
											{itemTotal > 0 ? `$${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
										</div>
										<div className="text-sm flex justify-between items-center px-2" onClick={(e) => e.stopPropagation()}>
											<Link
												href={`/app/inventory/${item.id}`}
												className="text-blue-400 hover:text-blue-300 hover:underline flex-1 text-center"
											>
												Edit
											</Link>
											<button
												onClick={() => handleDelete(item.id)}
												className="text-red-400 hover:text-red-300 hover:underline flex-1 text-center"
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
			
			{/* CSV Upload Modal */}
			{csvModalOpen && (
				<CSVUploadModal
					onClose={() => setCsvModalOpen(false)}
					onSuccess={() => {
						setCsvModalOpen(false);
						refetch();
					}}
				/>
			)}
		</main>
		</DashboardLayout>
	);
}

// CSV Upload Modal Component
function CSVUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [results, setResults] = useState<{success: number; failed: number; errors: string[]} | null>(null);

	async function handleUpload() {
		if (!file) {
			alert("Please select a CSV file");
			return;
		}

		setUploading(true);
		setResults(null);

		try {
			const text = await file.text();
			const lines = text.split('\n').filter(l => l.trim());
			if (lines.length < 2) {
				alert("CSV file is empty or invalid");
				setUploading(false);
				return;
			}

			// Parse CSV header
			const header = lines[0].split(',').map(h => h.trim().toLowerCase());
			const nameIndex = header.findIndex(h => h === 'name' || h === 'item name');
			const barcodeIndex = header.findIndex(h => h === 'barcode' || h === 'serial');
			const categoryIndex = header.findIndex(h => h === 'category' || h === 'type');
			const quantityIndex = header.findIndex(h => h === 'quantity' || h === 'qty');
			const valueIndex = header.findIndex(h => h === 'value' || h === 'price' || h === 'unit_value');
			const locationIndex = header.findIndex(h => h === 'location');

			if (nameIndex === -1) {
				alert("CSV must have a 'name' or 'item name' column");
				setUploading(false);
				return;
			}

			let success = 0;
			let failed = 0;
			const errors: string[] = [];

			// Import each row
			for (let i = 1; i < lines.length; i++) {
				const values = lines[i].split(',').map(v => v.trim());
				const name = values[nameIndex];

				if (!name) {
					errors.push(`Row ${i + 1}: Missing name`);
					failed++;
					continue;
				}

				const itemData: any = {
					name,
					barcode: barcodeIndex >= 0 ? values[barcodeIndex] : null,
					category: categoryIndex >= 0 ? values[categoryIndex] : null,
					quantity_on_hand: quantityIndex >= 0 ? parseInt(values[quantityIndex]) || 0 : 0,
					unit_value: valueIndex >= 0 ? parseFloat(values[valueIndex]) || 0 : 0,
					location: locationIndex >= 0 ? values[locationIndex] : null,
				};

				const { error } = await (await import('@/lib/supabaseClient')).supabase
					.from('inventory_items')
					.insert(itemData);

				if (error) {
					errors.push(`Row ${i + 1} (${name}): ${error.message}`);
					failed++;
				} else {
					success++;
				}
			}

			setResults({ success, failed, errors });

			if (failed === 0) {
				setTimeout(() => onSuccess(), 2000);
			}

		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to process CSV");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
			<div className="bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-bold text-white">Import Inventory from CSV</h2>
					<button
						onClick={onClose}
						className="text-zinc-400 hover:text-white text-2xl"
					>
						×
					</button>
				</div>

				<div className="mb-4 p-4 bg-zinc-700 rounded">
					<h3 className="font-semibold text-white mb-2">CSV Format:</h3>
					<p className="text-sm text-zinc-300 mb-2">Your CSV file should have these columns (headers are case-insensitive):</p>
					<ul className="text-sm text-zinc-300 list-disc list-inside space-y-1">
						<li><strong>name</strong> or <strong>item name</strong> (required)</li>
						<li><strong>barcode</strong> or <strong>serial</strong> (optional)</li>
						<li><strong>category</strong> or <strong>type</strong> (optional)</li>
						<li><strong>quantity</strong> or <strong>qty</strong> (optional, default: 0)</li>
						<li><strong>value</strong> or <strong>price</strong> or <strong>unit_value</strong> (optional, default: 0)</li>
						<li><strong>location</strong> (optional)</li>
					</ul>
					<p className="text-xs text-zinc-400 mt-2">Example: name,barcode,category,quantity,value,location</p>
				</div>

				<div className="mb-4">
					<label className="block text-white mb-2">Select CSV File:</label>
					<input
						type="file"
						accept=".csv"
						onChange={e => setFile(e.target.files?.[0] || null)}
						className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white"
					/>
				</div>

				{results && (
					<div className={`mb-4 p-4 rounded ${results.failed === 0 ? 'bg-green-900/50' : 'bg-yellow-900/50'}`}>
						<p className="text-white font-semibold">Import Results:</p>
						<p className="text-green-400">✓ Successfully imported: {results.success}</p>
						{results.failed > 0 && (
							<>
								<p className="text-red-400">✗ Failed: {results.failed}</p>
								<details className="mt-2">
									<summary className="text-zinc-300 cursor-pointer">Show errors</summary>
									<ul className="mt-2 text-sm text-zinc-300 max-h-40 overflow-y-auto">
										{results.errors.map((err, idx) => (
											<li key={idx} className="text-red-300">{err}</li>
										))}
									</ul>
								</details>
							</>
						)}
					</div>
				)}

				<div className="flex gap-2 justify-end">
					<button
						onClick={onClose}
						className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
					>
						Cancel
					</button>
					<button
						onClick={handleUpload}
						disabled={!file || uploading}
						className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{uploading ? "Importing..." : "Import"}
					</button>
				</div>
			</div>
		</div>
	);
}
