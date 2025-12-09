import React from 'react';
import type { CostEstimate } from '@/lib/types/speaker-designer';

interface CostEstimateDisplayProps {
  costEstimate: CostEstimate;
  onClose: () => void;
}

export default function CostEstimateDisplay({ costEstimate, onClose }: CostEstimateDisplayProps) {
  return (
    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-green-300">💰 Material Cost Estimate</h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Wood Costs */}
        {costEstimate.wood.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-200 mb-2">Wood Materials</h4>
            <div className="space-y-1">
              {costEstimate.wood.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.item} x{item.quantity}</span>
                  <span className="text-green-300 font-medium">${item.totalPrice}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steel Costs */}
        {costEstimate.steel.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-200 mb-2">Steel Bracing</h4>
            <div className="space-y-1">
              {costEstimate.steel.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.item} x{item.quantity}</span>
                  <span className="text-green-300 font-medium">${item.totalPrice}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hardware Costs */}
        {costEstimate.hardware.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-200 mb-2">Hardware & Materials</h4>
            <div className="space-y-1">
              {costEstimate.hardware.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.item}</span>
                  <span className="text-green-300 font-medium">${item.totalPrice}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="border-t border-green-500/30 pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span className="text-green-200">Estimated Total</span>
            <span className="text-green-300">${costEstimate.total}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            * Prices are estimates and may vary based on supplier and location
          </p>
        </div>
      </div>
    </div>
  );
}
