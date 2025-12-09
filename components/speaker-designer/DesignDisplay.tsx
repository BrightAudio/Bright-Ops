import React from 'react';
import type { Design } from '@/lib/types/speaker-designer';

interface DesignDisplayProps {
  design: Partial<Design>;
  onSave: () => void;
  onExportJSON: () => void;
}

export default function DesignDisplay({ design, onSave, onExportJSON }: DesignDisplayProps) {
  if (!design) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-bold text-white">{design.name || 'Speaker Design'}</h3>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            💾 Save
          </button>
          <button
            onClick={onExportJSON}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            📄 Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cabinet Dimensions */}
        {design.cabinetDimensions && (
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-cyan-300 mb-3">📏 Cabinet Dimensions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Width:</span>
                <span className="text-white font-medium">{design.cabinetDimensions.width}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Height:</span>
                <span className="text-white font-medium">{design.cabinetDimensions.height}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Depth:</span>
                <span className="text-white font-medium">{design.cabinetDimensions.depth}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Volume:</span>
                <span className="text-white font-medium">{design.cabinetDimensions.volume}L</span>
              </div>
            </div>
          </div>
        )}

        {/* Port Specs */}
        {design.portSpecs && (
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-cyan-300 mb-3">🔊 Port Specifications</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Diameter:</span>
                <span className="text-white font-medium">{design.portSpecs.diameter}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Length:</span>
                <span className="text-white font-medium">{design.portSpecs.length}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Tuning:</span>
                <span className="text-white font-medium">{design.portSpecs.tuning}Hz</span>
              </div>
            </div>
          </div>
        )}

        {/* Drivers */}
        {design.drivers && design.drivers.length > 0 && (
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-cyan-300 mb-3">🎵 Drivers ({design.drivers.length})</h4>
            <div className="space-y-2">
              {design.drivers.map((driver, idx) => (
                <div key={idx} className="text-sm">
                  <div className="text-white font-medium">{driver.name}</div>
                  <div className="text-zinc-400 text-xs">{driver.subcategory || driver.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {design.aiAnalysis && (
          <div className="bg-zinc-800 rounded-lg p-4 md:col-span-2">
            <h4 className="text-lg font-semibold text-cyan-300 mb-3">🤖 AI Analysis</h4>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap">{design.aiAnalysis}</div>
          </div>
        )}
      </div>
    </div>
  );
}
