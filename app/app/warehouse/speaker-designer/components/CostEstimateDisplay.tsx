import type { CostEstimate } from '@/lib/types/speaker-designer';

interface CostEstimateDisplayProps {
  costEstimate: CostEstimate | null;
  onClose: () => void;
}

export default function CostEstimateDisplay({ costEstimate, onClose }: CostEstimateDisplayProps) {
  if (!costEstimate) {
    return null;
  }

  return (
    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-green-300">💰 Cost Estimate</h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
        >
          ✕
        </button>
      </div>

      {/* Wood Costs */}
      {costEstimate.wood.length > 0 && (
        <div className="mb-4">
          <h4 className="text-lg font-medium text-green-400 mb-2">🪵 Wood Materials</h4>
          <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
            {costEstimate.wood.map((item, idx) => (
              <div key={idx} className="flex justify-between text-zinc-300">
                <span>{item.item} (x{item.quantity})</span>
                <span className="font-bold">${item.totalPrice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steel Costs */}
      {costEstimate.steel.length > 0 && (
        <div className="mb-4">
          <h4 className="text-lg font-medium text-blue-400 mb-2">🔩 Steel Materials</h4>
          <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
            {costEstimate.steel.map((item, idx) => (
              <div key={idx} className="flex justify-between text-zinc-300">
                <span>{item.item} (x{item.quantity})</span>
                <span className="font-bold">${item.totalPrice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hardware Costs */}
      {costEstimate.hardware.length > 0 && (
        <div className="mb-4">
          <h4 className="text-lg font-medium text-amber-400 mb-2">🔧 Hardware & Supplies</h4>
          <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
            {costEstimate.hardware.map((item, idx) => (
              <div key={idx} className="flex justify-between text-zinc-300">
                <span>{item.item}</span>
                <span className="font-bold">${item.totalPrice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-green-500/50 pt-4 mt-4">
        <div className="flex justify-between items-center text-xl font-bold">
          <span className="text-white">Total Estimated Cost</span>
          <span className="text-green-400">${costEstimate.total}</span>
        </div>
      </div>
    </div>
  );
}
