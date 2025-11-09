"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCostEstimate } from "@/lib/hooks/useCostEstimate";

interface CostEstimatePageProps {
  params: {
    id: string;
  };
}

export default function CostEstimatePage({ params }: CostEstimatePageProps) {
  const router = useRouter();
  const { loading, estimate, updateLineItem, addLineItem, deleteLineItem, saveLineItems } = useCostEstimate(params.id);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [finalInvoiceAmount, setFinalInvoiceAmount] = useState<number>(0);
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [newLaborRole, setNewLaborRole] = useState("");

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Update final invoice amount when estimate changes
  useState(() => {
    if (estimate.suggestedInvoiceAmount > 0 && finalInvoiceAmount === 0) {
      setFinalInvoiceAmount(estimate.suggestedInvoiceAmount);
    }
  });

  async function handleUpdateLineItem(itemId: string, field: string, value: number) {
    await updateLineItem(itemId, { [field]: value });
  }

  async function handleAddLaborItem() {
    if (!newLaborRole.trim()) return;
    
    await addLineItem("labor", newLaborRole);
    setNewLaborRole("");
    setShowAddLabor(false);
  }

  async function handleGenerateInvoice() {
    // TODO: Implement PDF generation
    alert("PDF invoice generation coming soon!");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading cost estimate...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Cost Estimate & Invoice</h1>
            <button
              onClick={() => router.push(`/app/jobs/${params.id}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <p className="text-gray-600">
            Itemized cost breakdown with equipment rental and labor charges
          </p>
        </div>

        {/* Equipment Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-boxes text-blue-600 mr-2"></i>
            Equipment Rental
          </h2>
          
          {estimate.lineItems.filter(item => item.item_type === "equipment").length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-inbox text-4xl mb-2"></i>
              <p>No equipment items found. Create a prep sheet first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Item</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Qty</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Rate/Day</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lineItems
                    .filter(item => item.item_type === "equipment")
                    .map(item => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{item.item_name}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {formatter.format(item.unit_cost || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatter.format(item.total_cost || 0)}
                        </td>
                      </tr>
                    ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-3 px-4 text-right font-semibold text-gray-900">
                      Equipment Subtotal:
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                      {formatter.format(estimate.equipmentTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Labor Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <i className="fas fa-users text-green-600 mr-2"></i>
              Labor Charges
            </h2>
            <button
              onClick={() => setShowAddLabor(true)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              <i className="fas fa-plus mr-1"></i>
              Add Labor Item
            </button>
          </div>

          {showAddLabor && (
            <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
              <input
                type="text"
                value={newLaborRole}
                onChange={(e) => setNewLaborRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLaborItem();
                  if (e.key === "Escape") {
                    setShowAddLabor(false);
                    setNewLaborRole("");
                  }
                }}
                placeholder="Role (e.g., Audio Tech, Stage Manager)"
                className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddLaborItem}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddLabor(false);
                    setNewLaborRole("");
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Role</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Hours</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Rate/Hour</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Total</th>
                  <th className="text-center py-2 px-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {estimate.lineItems
                  .filter(item => item.item_type === "labor")
                  .map(item => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{item.item_name}</td>
                      <td className="py-3 px-4 text-right">
                        {editingItem === `${item.id}-qty` ? (
                          <input
                            type="number"
                            defaultValue={item.quantity || 0}
                            onBlur={(e) => {
                              handleUpdateLineItem(item.id, "quantity", parseFloat(e.target.value));
                              setEditingItem(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateLineItem(item.id, "quantity", parseFloat(e.currentTarget.value));
                                setEditingItem(null);
                              }
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                            autoFocus
                          />
                        ) : (
                          <span
                            onClick={() => setEditingItem(`${item.id}-qty`)}
                            className="cursor-pointer hover:bg-gray-200 px-2 py-1 rounded"
                          >
                            {item.quantity}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingItem === `${item.id}-rate` ? (
                          <input
                            type="number"
                            defaultValue={item.unit_cost || 0}
                            onBlur={(e) => {
                              handleUpdateLineItem(item.id, "unit_cost", parseFloat(e.target.value));
                              setEditingItem(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateLineItem(item.id, "unit_cost", parseFloat(e.currentTarget.value));
                                setEditingItem(null);
                              }
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                            autoFocus
                          />
                        ) : (
                          <span
                            onClick={() => setEditingItem(`${item.id}-rate`)}
                            className="cursor-pointer hover:bg-gray-200 px-2 py-1 rounded"
                          >
                            {formatter.format(item.unit_cost || 0)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatter.format(item.total_cost || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deleteLineItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete labor item"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                {estimate.lineItems.filter(item => item.item_type === "labor").length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      <i className="fas fa-user-slash text-3xl mb-2"></i>
                      <p>No labor items yet. Click "Add Labor Item" to get started.</p>
                    </td>
                  </tr>
                )}
                {estimate.lineItems.filter(item => item.item_type === "labor").length > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-3 px-4 text-right font-semibold text-gray-900">
                      Labor Subtotal:
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">
                      {formatter.format(estimate.laborTotal)}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary & Invoice Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <i className="fas fa-file-invoice-dollar text-purple-600 mr-2"></i>
            Cost Summary & Invoice
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">Equipment Total:</span>
              <span className="font-medium text-gray-900">{formatter.format(estimate.equipmentTotal)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">Labor Total:</span>
              <span className="font-medium text-gray-900">{formatter.format(estimate.laborTotal)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b-2 border-gray-300">
              <span className="text-lg font-semibold text-gray-900">Cost Estimate (Base):</span>
              <span className="text-lg font-bold text-blue-600">{formatter.format(estimate.subtotal)}</span>
            </div>

            {/* 40% Markup Suggestion */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
              <div className="flex items-start">
                <i className="fas fa-lightbulb text-amber-500 mr-3 mt-1"></i>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Suggested Pricing (40% Markup)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Base Cost:</span>
                      <span className="font-medium">{formatter.format(estimate.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Markup (40%):</span>
                      <span className="font-medium text-amber-600">{formatter.format(estimate.suggestedMarkup)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-amber-200">
                      <span className="font-semibold text-gray-900">Suggested Invoice:</span>
                      <span className="font-bold text-amber-600">{formatter.format(estimate.suggestedInvoiceAmount)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    This markup ensures profitable pricing. You can adjust the final amount below.
                  </p>
                </div>
              </div>
            </div>

            {/* Editable Final Invoice Amount */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Invoice Amount (Editable)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-400">$</span>
                <input
                  type="number"
                  value={finalInvoiceAmount}
                  onChange={(e) => setFinalInvoiceAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                This is the amount that will appear on the invoice sent to the client.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                onClick={handleGenerateInvoice}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                Generate PDF Invoice
              </button>
              <button
                onClick={() => router.push(`/app/jobs/${params.id}`)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back to Job
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
