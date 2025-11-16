"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

type Employee = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  hourly_rate: number | null;
  created_at: string | null;
};

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    hourly_rate: "",
  });

  useEffect(() => {
    loadEmployee();
  }, [unwrappedParams.id]);

  async function loadEmployee() {
    try {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("*")
        .eq("id", unwrappedParams.id)
        .single();

      if (error) throw error;
      
      setEmployee(data);
      setFormData({
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        role: data.role || "",
        hourly_rate: data.hourly_rate ? data.hourly_rate.toString() : "",
      });
    } catch (err) {
      console.error("Error loading employee:", err);
      alert("Failed to load employee");
      router.push("/app/crew");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from("employees")
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        })
        .eq("id", unwrappedParams.id);

      if (error) throw error;

      alert("Employee updated successfully!");
      router.push("/app/crew");
    } catch (err) {
      console.error("Error updating employee:", err);
      alert("Failed to update employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete ${employee?.name}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);

    try {
      const { error } = await (supabase as any)
        .from("employees")
        .delete()
        .eq("id", unwrappedParams.id);

      if (error) throw error;

      alert("Employee deleted successfully");
      router.push("/app/crew");
    } catch (err) {
      console.error("Error deleting employee:", err);
      alert("Failed to delete employee");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">Employee not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/app/crew")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#fff",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500
              }}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Employees
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Edit Employee</h1>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-trash"></i>
            {deleting ? "Deleting..." : "Delete Employee"}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g. Audio Tech, Lighting Tech"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  placeholder="25.00"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-gray-500">/hr</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/app/crew")}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>

          {employee.created_at && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Created: {new Date(employee.created_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
