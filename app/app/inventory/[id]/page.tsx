"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
	useInventoryItem,
	updateInventoryItem,
	deleteInventoryItem,
} from "@/lib/hooks/useInventory";
import { generateBarcode } from "@/lib/utils/barcodeGenerator";
import { PrintBarcodeButton } from "@/components/PrintBarcodeButton";
import { BarcodePreview } from "@/components/BarcodePreview";
import DashboardLayout from "@/components/layout/DashboardLayout";

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
	
	console.log('[DEBUG] EditInventoryItemPage - params:', params);
	console.log('[DEBUG] EditInventoryItemPage - idParam:', idParam);
	console.log('[DEBUG] EditInventoryItemPage - resolved id:', id);
	
	const { item, loading, error } = useInventoryItem(id);
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
		category: "",
		subcategory: "",
		location: "NEW SOUND Warehouse",
		tags: [] as string[],
		image_url: "",
		repair_cost: 0,
		maintenance_status: "operational",
		speaker_test_data: {
			impedance: "",
			frequency_response_low: "",
			frequency_response_high: "",
			sensitivity: "",
			max_spl: "",
			power_rating: "",
			last_tested: "",
			test_notes: "",
		},
	});
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);
	const [generatingBarcode, setGeneratingBarcode] = useState(false);
	const [savingBarcode, setSavingBarcode] = useState(false);
	const [originalBarcode, setOriginalBarcode] = useState("");
	const [uploadingImage, setUploadingImage] = useState(false);
	const [searchingImages, setSearchingImages] = useState(false);
	const [imageSearchResults, setImageSearchResults] = useState<Array<{
		url: string;
		downloadUrl: string;
		photographer: string;
		photographerUrl: string;
		unsplashUrl: string;
	}>>([]);

	// Populate form when item loads
	useEffect(() => {
		console.log('[DEBUG] EditInventoryItemPage - useEffect triggered');
		console.log('[DEBUG] EditInventoryItemPage - item:', item);
		console.log('[DEBUG] EditInventoryItemPage - loading:', loading);
		console.log('[DEBUG] EditInventoryItemPage - error:', error);
		
		if (item) {
			const speakerData = item.speaker_test_data as any || {};
			setForm({
				name: item.name ?? "",
				barcode: item.barcode ?? "",
				qty_in_warehouse: item.qty_in_warehouse ?? 0,
				quantity_on_hand: item.quantity_on_hand ?? 0,
				unit_value: item.unit_value ?? 0,
				purchase_cost: item.purchase_cost ?? 0,
				purchase_date: item.purchase_date ?? "",
				useful_life_years: item.useful_life_years ?? 5.0,
				estimated_jobs_per_year: item.estimated_jobs_per_year ?? 50,
				residual_value: item.residual_value ?? 0,
				category: item.category ?? "",
				subcategory: item.gear_type ?? "",
				location: item.location ?? "NEW SOUND Warehouse",
				tags: (Array.isArray(item.tags) ? item.tags : []) as string[],
				image_url: item.image_url ?? "",
				repair_cost: item.repair_cost ?? 0,
				maintenance_status: item.maintenance_status ?? "operational",
				speaker_test_data: {
					impedance: speakerData.impedance ?? "",
					frequency_response_low: speakerData.frequency_response_low ?? "",
					frequency_response_high: speakerData.frequency_response_high ?? "",
					sensitivity: speakerData.sensitivity ?? "",
					max_spl: speakerData.max_spl ?? "",
					power_rating: speakerData.power_rating ?? "",
					last_tested: speakerData.last_tested ?? "",
					test_notes: speakerData.test_notes ?? "",
				},
			});
			setOriginalBarcode(item.barcode ?? "");
		}
	}, [item, loading, error]);

	const handleChange = (field: keyof typeof form, value: string | number) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	async function handleGenerateBarcode() {
		if (!form.name.trim()) {
			setLocalError("Please enter an item name first");
			return;
		}
		
		setGeneratingBarcode(true);
		setLocalError(null);
		
		try {
			const barcode = await generateBarcode(form.name);
			setForm((prev) => ({ ...prev, barcode }));
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Failed to generate barcode");
		} finally {
			setGeneratingBarcode(false);
		}
	}

	async function handleSaveBarcode() {
		if (!id || !form.barcode.trim()) {
			setLocalError("No barcode to save");
			return;
		}

		setSavingBarcode(true);
		setLocalError(null);

		try {
			await updateInventoryItem(id, {
				barcode: form.barcode.trim(),
			});
			setOriginalBarcode(form.barcode.trim());
			// Show success message briefly
			setLocalError("Barcode saved successfully!");
			setTimeout(() => setLocalError(null), 3000);
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Failed to save barcode");
		} finally {
			setSavingBarcode(false);
		}
	}

	async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file || !id) return;

		setUploadingImage(true);
		setLocalError(null);

		try {
			const { supabase } = await import("@/lib/supabaseClient");
			const fileExt = file.name.split(".").pop();
			const fileName = `${id}-${Date.now()}.${fileExt}`;
			const filePath = `inventory/${fileName}`;

			const { error: uploadError } = await supabase.storage
				.from("inventory-images")
				.upload(filePath, file);

			if (uploadError) throw uploadError;

			const { data: { publicUrl } } = supabase.storage
				.from("inventory-images")
				.getPublicUrl(filePath);

			setForm((prev) => ({ ...prev, image_url: publicUrl }));
			setLocalError("Image uploaded successfully!");
			setTimeout(() => setLocalError(null), 3000);
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Failed to upload image");
		} finally {
			setUploadingImage(false);
		}
	}

	async function handleImageSearch() {
		if (!form.name.trim()) {
			setLocalError("Please enter an item name first");
			return;
		}

		setSearchingImages(true);
		setLocalError(null);

		try {
			const response = await fetch('/api/inventory/search-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemName: form.name }),
			});

			if (!response.ok) {
				throw new Error('Image search failed');
			}

			const data = await response.json();
			if (data.images && data.images.length > 0) {
				setImageSearchResults(data.images);
			} else {
				setLocalError('No images found for this item');
			}
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : 'Failed to search images');
		} finally {
			setSearchingImages(false);
		}
	}

	async function handleSelectSearchedImage(image: { url: string; downloadUrl: string; photographer: string }) {
		// Track download with Unsplash (required by their guidelines)
		try {
			await fetch('/api/inventory/search-images', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ downloadUrl: image.downloadUrl }),
			});
		} catch (err) {
			console.error('Failed to track download:', err);
		}

		setForm((prev) => ({ ...prev, image_url: image.url }));
		setImageSearchResults([]);
		setLocalError(`Image by ${image.photographer} selected! Click Save to update.`);
		setTimeout(() => setLocalError(null), 3000);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!id) return;
		setSaving(true);
		setLocalError(null);
		try {
			// Check for duplicate barcode if barcode has changed
			if (form.barcode.trim() && form.barcode.trim() !== originalBarcode) {
				const { supabase } = await import("@/lib/supabaseClient");
				const { data: existingItems, error: checkError } = await supabase
					.from("inventory_items")
					.select("id")
					.eq("barcode", form.barcode.trim())
					.neq("id", id);
				
				if (checkError) throw checkError;
				
				if (existingItems && existingItems.length > 0) {
					throw new Error("Barcode already exists. Please use a unique barcode.");
				}
			}

			await updateInventoryItem(id, {
				name: form.name.trim(),
				barcode: form.barcode.trim(),
				qty_in_warehouse: form.qty_in_warehouse,
				quantity_on_hand: form.quantity_on_hand,
				unit_value: form.unit_value,
				purchase_cost: form.purchase_cost,
				purchase_date: form.purchase_date?.trim() || null,
				useful_life_years: form.useful_life_years,
			estimated_jobs_per_year: form.estimated_jobs_per_year,
			residual_value: form.residual_value,
			category: form.category || null,
			subcategory: form.subcategory || null,
			location: form.location,
				tags: form.tags,
				image_url: form.image_url || null,
				repair_cost: form.repair_cost,
				maintenance_status: form.maintenance_status,
				speaker_test_data: form.speaker_test_data,
			});
			router.push("/app/inventory");
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
			router.push("/app/inventory");
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : "Failed to delete item");
		} finally {
			setDeleting(false);
		}
	}

	if (loading) {
		return <DashboardLayout><p className="p-6 text-zinc-400">Loading...</p></DashboardLayout>;
	}
	if (error || !item) {
		return <DashboardLayout><p className="p-6 text-red-500">{error ?? "Item not found"}</p></DashboardLayout>;
	}

	return (
		<DashboardLayout>
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
						{form.barcode && form.barcode !== originalBarcode && (
							<button
								type="button"
								onClick={handleSaveBarcode}
								disabled={savingBarcode}
								className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
							>
								{savingBarcode ? "Saving..." : "Save Barcode"}
							</button>
						)}
						<PrintBarcodeButton
							barcode={form.barcode}
							itemName={form.name}
						/>
					</div>
					<p className="text-xs text-zinc-500 mt-1">
						Auto-generates unique barcode like PREFIX-001 based on item name
					</p>
				</div>

				{/* Barcode Preview and Item Image */}
				<div className="grid grid-cols-2 gap-4">
					{/* Left Column - Barcode */}
					{form.barcode && (
						<div>
							<label className="block text-sm font-medium text-zinc-200 mb-2">
								Barcode Preview
							</label>
							<div className="bg-white p-3 rounded-md border border-zinc-700">
								<BarcodePreview barcode={form.barcode} itemName={form.name} />
							</div>
						</div>
					)}
					
					{/* Right Column - Item Image and Upload */}
					<div>
						<label className="block text-sm font-medium text-zinc-200 mb-2">
							Item Image
						</label>
						{form.image_url ? (
							<div className="bg-zinc-800 p-3 rounded-md border border-zinc-700 mb-3">
								<img 
									src={form.image_url} 
									alt={form.name}
									className="w-full h-32 object-contain rounded"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = 'none';
									}}
								/>
							</div>
						) : (
							<div className="bg-zinc-800 p-3 rounded-md border border-zinc-700 mb-3 h-32 flex items-center justify-center">
								<p className="text-zinc-500 text-sm">No image uploaded</p>
							</div>
						)}
						<div className="flex items-center gap-2 flex-wrap">
							<input
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								disabled={uploadingImage}
								className="hidden"
								id="image-upload"
							/>
							<label
								htmlFor="image-upload"
								className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer text-sm ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
							>
								{uploadingImage ? "Uploading..." : "Upload"}
							</label>
							<button
								type="button"
								onClick={handleImageSearch}
								disabled={searchingImages || !form.name.trim()}
								className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
							>
								{searchingImages ? "Searching..." : "Search"}
							</button>
							{form.image_url && (
								<button
									type="button"
									onClick={() => setForm(prev => ({ ...prev, image_url: "" }))}
									className="px-3 py-2 text-sm text-red-400 hover:text-red-300"
								>
									Remove
								</button>
							)}
						</div>
						
						{/* Image Search Results */}
						{imageSearchResults.length > 0 && (
							<div className="mt-3 space-y-2">
								<p className="text-xs font-medium text-zinc-400">Select an image (from Unsplash):</p>
								<div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
									{imageSearchResults.map((image, index) => (
										<div
											key={index}
											onClick={() => handleSelectSearchedImage(image)}
											className="cursor-pointer bg-zinc-800 p-2 rounded border border-zinc-700 hover:border-blue-500 transition group"
										>
											<img
												src={image.url}
												alt={`Result ${index + 1}`}
												className="w-full h-20 object-contain rounded mb-1"
												onError={(e) => {
													(e.target as HTMLImageElement).style.display = 'none';
												}}
											/>
											<p className="text-xs text-zinc-500 truncate">by {image.photographer}</p>
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={() => setImageSearchResults([])}
									className="text-xs text-zinc-500 hover:text-zinc-400"
								>
									Clear results
								</button>
							</div>
						)}
					</div>
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

				{/* Category and Tags Section */}
				<div className="border-t border-zinc-700 pt-4 mt-4">
					<h3 className="text-lg font-semibold text-white mb-3">Categorization</h3>
					
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Category
							</label>
							<select
								value={form.category}
								onChange={(e) => handleChange("category", e.target.value)}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
							>
								<option value="">Select category...</option>
								<option value="Audio">Audio</option>
								<option value="Lights">Lights</option>
								<option value="Video">Video</option>
								<option value="Stage">Stage</option>
								<option value="Field Audio">Field Audio</option>
								<option value="Misc">Misc</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Subcategory
							</label>
							<select
								value={form.subcategory}
								onChange={(e) => handleChange("subcategory", e.target.value)}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
							>
								<option value="">Select subcategory...</option>
								<option value="monitor_wedges">Monitor Wedges</option>
								<option value="tops">Tops</option>
								<option value="subs">Subs</option>
								<option value="amps">Amps</option>
								<option value="amprack">Amp Rack</option>
								<option value="mixers">Mixers</option>
								<option value="active_speakers">Active Speakers</option>
								<option value="microphones">Microphones</option>
								<option value="RF">RF</option>
								<option value="compressors">Compressors</option>
								<option value="EQ">EQ</option>
								<option value="interfaces">Interfaces</option>
								<option value="column_speakers">Column Speakers</option>
								<option value="road_cases">Road Cases</option>
								<option value="lights">Lights</option>
								<option value="uplights">Uplights</option>
								<option value="field_audio">Field Audio</option>
								<option value="other">Other</option>
							</select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 mt-4">
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Stock Location
							</label>
							<select
								value={form.location}
								onChange={(e) => handleChange("location", e.target.value)}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
							>
								<option value="NEW SOUND Warehouse">NEW SOUND Warehouse</option>
								<option value="Bright Audio Warehouse">Bright Audio Warehouse</option>
							</select>
						</div>
					</div>

					<div className="mt-4">
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Tags (comma-separated)
							</label>
							<input
								type="text"
								value={form.tags.join(", ")}
								onChange={(e) => {
									const tags = e.target.value.split(",").map(t => t.trim()).filter(t => t);
									setForm(prev => ({ ...prev, tags }));
								}}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
								placeholder="mon, fill, sub"
							/>
							<p className="text-xs text-zinc-500 mt-1">
								e.g., mon, fill, sub, powered, passive
							</p>
						</div>
					</div>
				</div>

				{/* Image and Maintenance Section */}
				<div className="border-t border-zinc-700 pt-4 mt-4">
					<h3 className="text-lg font-semibold text-white mb-3">Equipment Details</h3>
					
				<div>
					<label className="block text-sm font-medium text-zinc-200 mb-2">
						Equipment Image
					</label>
					<div className="flex items-center gap-4">
						<input
							type="file"
							accept="image/*"
							onChange={handleImageUpload}
							disabled={uploadingImage}
							className="hidden"
							id="image-upload"
						/>
						<label
							htmlFor="image-upload"
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50"
						>
							{uploadingImage ? "Uploading..." : "Upload Image"}
						</label>
						{form.image_url && (
							<button
								type="button"
								onClick={() => setForm(prev => ({ ...prev, image_url: "" }))}
								className="px-3 py-2 text-sm text-red-400 hover:text-red-300"
							>
								Remove Image
							</button>
						)}
					</div>
					{form.image_url && (
						<div className="mt-3">
							<img 
								src={form.image_url} 
								alt={form.name}
								className="max-w-xs max-h-48 rounded-md border border-zinc-700 object-cover"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = 'none';
								}}
							/>
						</div>
					)}
				</div>					<div className="grid grid-cols-2 gap-4 mt-4">
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Repair Cost ($)
							</label>
							<input
								type="number"
								min={0}
								step="0.01"
								value={form.repair_cost}
								onChange={(e) =>
									handleChange("repair_cost", Number(e.target.value))
								}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
								placeholder="0.00"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-zinc-200">
								Maintenance Status
							</label>
							<select
								value={form.maintenance_status}
								onChange={(e) => handleChange("maintenance_status", e.target.value)}
								className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
							>
								<option value="operational">Operational</option>
								<option value="needs_repair">Needs Repair</option>
								<option value="in_repair">In Repair</option>
								<option value="retired">Retired</option>
							</select>
						</div>
					</div>
				</div>

				{/* Speaker Test Data Section */}
				{(form.subcategory === "monitor_wedges" || form.subcategory === "tops" || form.subcategory === "subs" || form.subcategory === "column_speakers") && (
					<div className="border-t border-zinc-700 pt-4 mt-4">
						<h3 className="text-lg font-semibold text-white mb-3">Speaker Test Data</h3>
						<p className="text-sm text-zinc-400 mb-4">
							Technical specifications and test results for speaker equipment
						</p>

						<div className="grid grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Impedance (Ω)
								</label>
								<select
									value={form.speaker_test_data.impedance}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, impedance: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
								>
									<option value="">Select...</option>
									<option value="2">2Ω</option>
									<option value="4">4Ω</option>
									<option value="8">8Ω</option>
									<option value="16">16Ω</option>
									<option value="other">Other</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Frequency Low (Hz)
								</label>
								<input
									type="number"
									min="20"
									max="500"
									value={form.speaker_test_data.frequency_response_low}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, frequency_response_low: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
									placeholder="50"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Frequency High (Hz)
								</label>
								<input
									type="number"
									min="1000"
									max="30000"
									value={form.speaker_test_data.frequency_response_high}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, frequency_response_high: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
									placeholder="20000"
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-4 mt-4">
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Sensitivity (dB)
								</label>
								<input
									type="number"
									min="80"
									max="120"
									step="0.1"
									value={form.speaker_test_data.sensitivity}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, sensitivity: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
									placeholder="95"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Max SPL (dB)
								</label>
								<input
									type="number"
									min="100"
									max="150"
									step="0.1"
									value={form.speaker_test_data.max_spl}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, max_spl: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
									placeholder="130"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Power Rating (W)
								</label>
								<input
									type="number"
									min="0"
									step="1"
									value={form.speaker_test_data.power_rating}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, power_rating: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
									placeholder="500"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 mt-4">
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Last Tested
								</label>
								<input
									type="date"
									value={form.speaker_test_data.last_tested}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, last_tested: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-zinc-200">
									Test Notes
								</label>
								<input
									type="text"
									value={form.speaker_test_data.test_notes}
									onChange={(e) => setForm(prev => ({ 
										...prev, 
										speaker_test_data: { ...prev.speaker_test_data, test_notes: e.target.value }
									}))}
									className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
									placeholder="All drivers functional, slight cabinet wear"
								/>
							</div>
						</div>
					</div>
				)}

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

				{localError && <p className="text-red-500">{localError}</p>}
				<div className="flex justify-between space-x-2">
					<button
						type="button"
						onClick={() => router.push("/app/inventory")}
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
		</DashboardLayout>
	);
}