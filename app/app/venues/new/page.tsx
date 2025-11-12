"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createVenue, uploadVenueFile, VenueFile } from "@/lib/hooks/useVenues";
import Link from "next/link";

export default function NewVenuePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    business_name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "USA",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    notes: "",
  });
  const [showFiles, setShowFiles] = useState<VenueFile[]>([]);
  const [roomTuningFiles, setRoomTuningFiles] = useState<VenueFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file: File, type: 'show' | 'tuning') => {
    setUploading(true);
    setError(null);
    try {
      // For now, create a temporary file object
      // After venue is created, we'll upload to storage with venueId
      const fileObj: VenueFile = {
        name: file.name,
        url: '', // Will be set after upload
        uploaded_at: new Date().toISOString(),
        size: file.size,
        type: file.type,
      };

      if (type === 'show') {
        setShowFiles((prev) => [...prev, fileObj]);
      } else {
        setRoomTuningFiles((prev) => [...prev, fileObj]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add file");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number, type: 'show' | 'tuning') => {
    if (type === 'show') {
      setShowFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setRoomTuningFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setError("Venue name is required");
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const venue = await createVenue({
        name: form.name.trim(),
        business_name: form.business_name.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        country: form.country.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        notes: form.notes.trim() || null,
        show_files: showFiles,
        room_tuning_files: roomTuningFiles,
      });
      
      router.push(`/app/venues/${venue.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create venue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/app/venues"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Venues
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Add New Venue</h1>
          <p className="text-zinc-400">Add a new venue with location details and file uploads</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 text-red-400 rounded-lg">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Venue Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="e.g., The Grand Ballroom"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => handleChange("business_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="e.g., Grand Hotel & Conference Center"
                />
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Location Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="Springfield"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="IL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={form.zip_code}
                    onChange={(e) => handleChange("zip_code", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="62701"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => handleChange("contact_phone", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="contact@venue.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Files</h3>
            
            {/* Show Files */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-200 mb-2">
                Show Files
              </label>
              <p className="text-xs text-zinc-400 mb-3">Upload console files, patches, or show documentation</p>
              
              <div className="space-y-2">
                {showFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-file text-blue-400"></i>
                      <span className="text-sm text-white">{file.name}</span>
                      {file.size && (
                        <span className="text-xs text-zinc-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index, 'show')}
                      className="text-red-400 hover:text-red-300"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>

              <input
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'show')}
                className="mt-2 block w-full text-sm text-zinc-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700
                  file:cursor-pointer"
              />
            </div>

            {/* Room Tuning Files */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-2">
                Room Tuning Files
              </label>
              <p className="text-xs text-zinc-400 mb-3">Upload SMAART files, measurement data, or tuning notes</p>
              
              <div className="space-y-2">
                {roomTuningFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-sliders text-green-400"></i>
                      <span className="text-sm text-white">{file.name}</span>
                      {file.size && (
                        <span className="text-xs text-zinc-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index, 'tuning')}
                      className="text-red-400 hover:text-red-300"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>

              <input
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'tuning')}
                className="mt-2 block w-full text-sm text-zinc-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-600 file:text-white
                  hover:file:bg-green-700
                  file:cursor-pointer"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
            
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
              placeholder="Add any additional notes about this venue..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Create Venue
                </>
              )}
            </button>
            <Link
              href="/app/venues"
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}
