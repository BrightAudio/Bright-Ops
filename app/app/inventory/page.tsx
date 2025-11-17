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
import { supabase } from "@/lib/supabaseClient";
import { InventoryValuation } from "@/components/InventoryValuation";

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
	const [showValuation, setShowValuation] = useState(false);
	const [searchingItemId, setSearchingItemId] = useState<string | null>(null);
	const [itemPrices, setItemPrices] = useState<Map<string, any>>(new Map());
	const { data: items, loading, error, refetch } = useInventory({ search });
	const { currentLocation } = useLocation();

	// Handler for putting item under maintenance
	async function handleMaintenance(e: React.MouseEvent, id: string) {
		e.stopPropagation();
		try {
			const supabaseAny = supabase as any;
			const { error } = await supabaseAny
				.from('inventory_items')
				.update({
					maintenance_status: 'maintenance'
				})
				.eq('id', id);

			if (error) throw error;
			refetch();
			alert('Item sent to maintenance queue');
		} catch (err) {
			alert(err instanceof Error ? err.message : String(err));
		}
	}

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

	// Handler for searching individual item price
	async function handleSearchItemPrice(e: React.MouseEvent, id: string, name: string) {
		e.stopPropagation();
		setSearchingItemId(id);

		try {
			const response = await fetch('/api/inventory/price-search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemIds: [id],
					itemNames: [name],
				}),
			});

			if (!response.ok) {
				throw new Error('Search failed');
			}

			const data = await response.json();
			
			if (data.results && data.results.length > 0) {
				const result = data.results[0];
				const newPrices = new Map(itemPrices);
				newPrices.set(id, result);
				setItemPrices(newPrices);
				alert(`Found price: $${result.price} (${result.source})`);
			} else {
				alert('No price found for this item');
			}
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Search failed');
		} finally {
			setSearchingItemId(null);
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
			{/* Header Section */}
			<div className="mb-8">
				<div className="flex justify-between items-center mb-6">
					<div>
						<h1 className="text-4xl font-bold text-white mb-1">Inventory Management</h1>
						<p className="text-zinc-400">Track and manage all equipment</p>
					</div>
					<div className="flex gap-2 flex-wrap">
						<button
							onClick={() => setShowValuation(!showValuation)}
							className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
						>
							💰 {showValuation ? 'Hide' : 'Value'}
						</button>
						<Link
							href="/app/inventory/speaker-rates"
							className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
						>
							🎵 Speaker Rates
						</Link>
						<Link
							href="/app/inventory/archived"
							className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition"
						>
							🔧 Maintenance
						</Link>
						<button
							onClick={() => setCsvModalOpen(true)}
							className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
						>
							📁 Import CSV
						</button>
						<Link
							href="/app/inventory/new"
							className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
						>
							+ Add Item
						</Link>
					</div>
				</div>

				{/* Filters Section */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
					<div>
						<label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Search</label>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Item name or barcode..."
							className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Category</label>
						<select
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:outline-none"
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
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Status</label>
						<select
							value={maintenanceFilter}
							onChange={(e) => setMaintenanceFilter(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:outline-none"
						>
							<option value="">All Status</option>
							<option value="operational">✓ Operational</option>
							<option value="needs_repair">⚠ Needs Repair</option>
							<option value="in_repair">🔧 In Repair</option>
							<option value="retired">✕ Retired</option>
						</select>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Sort</label>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white focus:border-blue-500 focus:outline-none"
						>
							<option value="name">Name</option>
							<option value="barcode">Barcode</option>
							<option value="value">Total Value</option>
							<option value="maintenance">Status</option>
						</select>
					</div>
				</div>
			</div>

			{/* Valuation Section */}
			{showValuation && filteredItems && filteredItems.length > 0 && (
				<div className="mb-8 rounded-xl border border-purple-900/30 bg-gradient-to-br from-purple-950/50 to-purple-900/20 p-6">
					<InventoryValuation 
						items={filteredItems.map(item => ({
							id: item.id,
							name: item.name,
							unit_value: item.unit_value || 0,
							barcode: item.barcode,
							category: item.category,
						}))}
						onUpdate={() => refetch()}
					/>
				</div>
			)}
			{loading ? (
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
						<p className="text-zinc-400">Loading inventory...</p>
					</div>
				</div>
			) : error ? (
				<div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
					<p className="text-red-400 font-semibold">Error loading inventory</p>
					<p className="text-red-300 text-sm mt-1">{error}</p>
				</div>
			) : (
				<>
					{/* Stats Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
						<div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-lg p-4">
							<p className="text-zinc-400 text-sm mb-1">Total Items</p>
							<p className="text-2xl font-bold text-white">{filteredItems.length}</p>
						</div>
						<div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-lg p-4">
							<p className="text-zinc-400 text-sm mb-1">Inventory Value</p>
							<p className="text-2xl font-bold text-green-400">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
						</div>
						<div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-lg p-4">
							<p className="text-zinc-400 text-sm mb-1">In Warehouse</p>
							<p className="text-2xl font-bold text-purple-400">{filteredItems.filter(i => (i.qty_in_warehouse ?? 0) > 0).length}</p>
						</div>
					</div>

					{/* Inventory Grid */}
					{filteredItems && filteredItems.length > 0 ? (
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
							{filteredItems.map((item: InventoryItemWithJob) => {
								const qty = item.quantity_on_hand ?? 0;
								const unitValue = item.unit_value ?? 0;
								const itemTotal = qty * unitValue;
								const qtyInWarehouse = item.qty_in_warehouse ?? 0;
								
								// Determine status badge
								const getStatusBadge = () => {
									switch (item.maintenance_status) {
										case 'needs_repair':
											return { icon: '⚠', label: 'Needs Repair', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' };
										case 'in_repair':
											return { icon: '🔧', label: 'In Repair', color: 'text-orange-400 bg-orange-900/30 border-orange-700/30' };
										case 'retired':
											return { icon: '✕', label: 'Retired', color: 'text-red-400 bg-red-900/30 border-red-700/30' };
										default:
											return { icon: '✓', label: 'Operational', color: 'text-green-400 bg-green-900/30 border-green-700/30' };
									}
								};

								const status = getStatusBadge();

								// Format date
								const formatDate = (isoDate: string | null) => {
									if (!isoDate) return "";
									const date = new Date(isoDate);
									return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
								};
								
								// Determine job status
								let jobInfo = { display: null as React.ReactNode, isOnJob: false };
								if (qtyInWarehouse > 0) {
									jobInfo = { display: <span className="text-zinc-400">In Warehouse</span>, isOnJob: false };
								} else if (item.currentJob) {
									jobInfo = { 
										display: (
											<div>
												<p className="text-red-400 font-semibold">{item.currentJob.name}</p>
												<p className="text-red-300 text-xs mt-0.5">Out: {formatDate(item.currentJob.scheduled_out_at)}</p>
											</div>
										), 
										isOnJob: true 
									};
								}

								return (
									<div 
										key={item.id}
										onClick={() => window.location.href = `/app/inventory/${item.id}`}
										className="group bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700/50 hover:border-zinc-600 rounded-lg p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-zinc-900/50 hover:-translate-y-1"
									>
										{/* Top Section: Status Badge & Category */}
										<div className="flex justify-between items-start mb-3">
											<span className={`text-xs font-semibold px-2.5 py-1 rounded border ${status.color}`}>
												{status.icon} {status.label}
											</span>
											{item.category && (
												<span className="text-xs text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded">
													{item.category.replace('_', ' ').toUpperCase()}
												</span>
											)}
										</div>

										{/* Item Name & Barcode */}
										<div className="mb-4">
											<h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
												{item.name}
											</h3>
											{item.barcode && (
												<p className="text-xs text-zinc-500 mt-1">📦 {item.barcode}</p>
											)}
										</div>

										{/* Location */}
										{item.location && (
											<div className="mb-3 pb-3 border-b border-zinc-700/30">
												<p className="text-xs text-zinc-500 mb-1">Location</p>
												<p className="text-sm text-zinc-300">{item.location}</p>
											</div>
										)}

										{/* Job Status */}
										<div className={`mb-4 pb-4 border-b border-zinc-700/30 ${jobInfo.isOnJob ? 'bg-red-950/40 -mx-5 px-5 py-3 rounded' : ''}`}>
											<p className="text-xs text-zinc-500 mb-1.5">Job Assignment</p>
											{jobInfo.display}
										</div>

										{/* Quantities */}
										<div className="grid grid-cols-2 gap-3 mb-4">
											<div className="bg-zinc-900/50 rounded p-3">
												<p className="text-xs text-zinc-500 mb-1">On Hand</p>
												<p className="text-xl font-bold text-white">{qty}</p>
											</div>
											<div className="bg-zinc-900/50 rounded p-3">
												<p className="text-xs text-zinc-500 mb-1">Unit Value</p>
												<p className="text-xl font-bold text-green-400">${unitValue.toFixed(2)}</p>
											</div>
										</div>

										{/* Total Value */}
										<div className="bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-700/30 rounded p-3 mb-4">
											<p className="text-xs text-zinc-500 mb-1">Total Value</p>
											<p className="text-2xl font-bold text-green-400">
												${itemTotal.toFixed(2)}
											</p>
										</div>

										{/* Rental Rates (if available) */}
										{(item.rental_cost_daily || item.rental_cost_weekly) && (
											<div className="bg-orange-950/40 border border-orange-700/30 rounded p-3 mb-4">
												<p className="text-xs text-zinc-500 mb-2">Rental Rates</p>
												<div className="grid grid-cols-2 gap-2">
													{item.rental_cost_daily ? (
														<div>
															<p className="text-xs text-zinc-400">Daily</p>
															<p className="text-lg font-bold text-orange-400">${item.rental_cost_daily.toFixed(2)}</p>
														</div>
													) : null}
													{item.rental_cost_weekly ? (
														<div>
															<p className="text-xs text-zinc-400">Weekly</p>
															<p className="text-lg font-bold text-orange-300">${item.rental_cost_weekly.toFixed(2)}</p>
														</div>
													) : null}
												</div>
											</div>
										)}

										{/* Price Search Result (if available) */}
										{itemPrices.has(item.id) && (
											<div className="bg-blue-950/40 border border-blue-700/30 rounded p-3 mb-4">
												<p className="text-xs text-zinc-500 mb-1">Market Price</p>
												<p className="text-lg font-bold text-blue-400">
													${itemPrices.get(item.id).price.toFixed(2)}
												</p>
												<p className="text-xs text-zinc-400 mt-1">{itemPrices.get(item.id).source}</p>
											</div>
										)}

										{/* Action Buttons */}
										<div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
											<Link
												href={`/app/inventory/${item.id}`}
												className="flex-1 min-w-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition text-center"
											>
												Edit
											</Link>
											<button
												onClick={(e) => handleSearchItemPrice(e, item.id, item.name)}
												disabled={searchingItemId === item.id}
												className="flex-1 min-w-0 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition disabled:opacity-50"
											>
												{searchingItemId === item.id ? '⏳' : '🔍'}
											</button>
											<button
												onClick={(e) => handleMaintenance(e, item.id)}
												className="flex-1 min-w-0 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition"
											>
												Maint
											</button>
											<button
												onClick={() => handleDelete(item.id)}
												className="flex-1 min-w-0 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition"
											>
												Del
											</button>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="py-12 text-center">
							<div className="text-5xl mb-3">📦</div>
							<p className="text-xl font-semibold text-zinc-400">No items found</p>
							<p className="text-sm text-zinc-500 mt-2">Try adjusting your filters or add a new item</p>
						</div>
					)}
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
