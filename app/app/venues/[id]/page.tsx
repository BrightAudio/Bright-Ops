"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useVenue, updateVenue, deleteVenue, VenueFile } from "@/lib/hooks/useVenues";
import Link from "next/link";

export default function VenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : undefined;
  
  const { data: venue, loading, error } = useVenue(id);
  const [editing, setEditing] = useState(false);
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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (venue) {
      setForm({
        name: venue.name || "",
        business_name: venue.business_name || "",
        address: venue.address || "",
        city: venue.city || "",
        state: venue.state || "",
        zip_code: venue.zip_code || "",
        country: venue.country || "USA",
        contact_name: venue.contact_name || "",
        contact_phone: venue.contact_phone || "",
        contact_email: venue.contact_email || "",
        notes: venue.notes || "",
      });
      setShowFiles(venue.show_files || []);
      setRoomTuningFiles(venue.room_tuning_files || []);
    }
  }, [venue]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (file: File, type: 'show' | 'tuning') => {
    const fileObj: VenueFile = {
      name: file.name,
      url: '',
      uploaded_at: new Date().toISOString(),
      size: file.size,
      type: file.type,
    };

    if (type === 'show') {
      setShowFiles((prev) => [...prev, fileObj]);
    } else {
      setRoomTuningFiles((prev) => [...prev, fileObj]);
    }
  };

  const removeFile = (index: number, type: 'show' | 'tuning') => {
    if (type === 'show') {
      setShowFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setRoomTuningFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    setLocalError(null);
    
    try {
      await updateVenue(id, {
        ...form,
        show_files: showFiles,
        room_tuning_files: roomTuningFiles,
      });
      setEditing(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to update venue");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this venue? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    try {
      await deleteVenue(id);
      router.push("/app/venues");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to delete venue");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-zinc-400 mb-2"></i>
          <p className="text-zinc-400">Loading venue...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !venue) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error || "Venue not found"}
          </div>
          <Link
            href="/app/venues"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mt-4"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Venues
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/app/venues"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Venues
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{venue.name}</h1>
              {venue.business_name && (
                <p className="text-xl text-zinc-400">{venue.business_name}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              {!editing ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white rounded-md transition-colors"
                  >
                    {deleting ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-trash"></i>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 text-white rounded-md transition-colors"
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {localError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 text-red-400 rounded-lg">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {localError}
          </div>
        )}

        {/* Location Information */}
        <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-map-marker-alt text-blue-400 mr-2"></i>
            Location
          </h3>
          
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">Venue Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">Business Name</label>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => handleChange("business_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={form.zip_code}
                    onChange={(e) => handleChange("zip_code", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-zinc-300">
              {venue.address && <p>{venue.address}</p>}
              {venue.city && venue.state && (
                <p>{venue.city}, {venue.state} {venue.zip_code}</p>
              )}
              {venue.country && <p>{venue.country}</p>}
              {!venue.address && !venue.city && (
                <p className="text-zinc-500 italic">No location details</p>
              )}
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-address-book text-green-400 mr-2"></i>
            Contact Information
          </h3>
          
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => handleChange("contact_phone", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-zinc-300">
              {venue.contact_name && (
                <p><i className="fas fa-user w-6 text-zinc-500"></i>{venue.contact_name}</p>
              )}
              {venue.contact_phone && (
                <p><i className="fas fa-phone w-6 text-zinc-500"></i>{venue.contact_phone}</p>
              )}
              {venue.contact_email && (
                <p><i className="fas fa-envelope w-6 text-zinc-500"></i>{venue.contact_email}</p>
              )}
              {!venue.contact_name && !venue.contact_phone && !venue.contact_email && (
                <p className="text-zinc-500 italic">No contact information</p>
              )}
            </div>
          )}
        </div>

        {/* Show Files */}
        <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-file text-blue-400 mr-2"></i>
            Show Files
          </h3>
          
          {editing && (
            <input
              type="file"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'show')}
              className="mb-4 block w-full text-sm text-zinc-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                file:cursor-pointer"
            />
          )}
          
          <div className="space-y-2">
            {showFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                <div className="flex items-center gap-3">
                  <i className="fas fa-file text-blue-400"></i>
                  <div>
                    <p className="text-sm text-white">{file.name}</p>
                    {file.size && (
                      <p className="text-xs text-zinc-500">
                        {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {editing && (
                  <button
                    onClick={() => removeFile(index, 'show')}
                    className="text-red-400 hover:text-red-300"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ))}
            {showFiles.length === 0 && (
              <p className="text-zinc-500 italic">No show files uploaded</p>
            )}
          </div>
        </div>

        {/* Room Tuning Files */}
        <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-sliders text-green-400 mr-2"></i>
            Room Tuning Files
          </h3>
          
          {editing && (
            <input
              type="file"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'tuning')}
              className="mb-4 block w-full text-sm text-zinc-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-green-600 file:text-white
                hover:file:bg-green-700
                file:cursor-pointer"
            />
          )}
          
          <div className="space-y-2">
            {roomTuningFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                <div className="flex items-center gap-3">
                  <i className="fas fa-sliders text-green-400"></i>
                  <div>
                    <p className="text-sm text-white">{file.name}</p>
                    {file.size && (
                      <p className="text-xs text-zinc-500">
                        {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {editing && (
                  <button
                    onClick={() => removeFile(index, 'tuning')}
                    className="text-red-400 hover:text-red-300"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ))}
            {roomTuningFiles.length === 0 && (
              <p className="text-zinc-500 italic">No room tuning files uploaded</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            <i className="fas fa-note-sticky text-yellow-400 mr-2"></i>
            Notes
          </h3>
          
          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
              placeholder="Add notes about this venue..."
            />
          ) : (
            <p className="text-zinc-300 whitespace-pre-wrap">
              {venue.notes || <span className="text-zinc-500 italic">No notes</span>}
            </p>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
