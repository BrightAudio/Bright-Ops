import type { Design } from '@/lib/types/speaker-designer';

interface DesignDisplayProps {
  design: Design | null;
  onSave: () => void;
  onExportJSON: () => void;
  onGenerateBlueprint: () => void;
  loading: boolean;
}

export default function DesignDisplay({ 
  design, 
  onSave, 
  onExportJSON, 
  onGenerateBlueprint,
  loading 
}: DesignDisplayProps) {
  if (!design) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-cyan-400 mb-2">✨ Generated Design</h3>
          <p className="text-zinc-400">{design.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            title="Save to database"
          >
            💾 Save
          </button>
          <button
            onClick={onExportJSON}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
            title="Export as JSON"
          >
            📄 Export JSON
          </button>
        </div>
      </div>

      {/* Cabinet Dimensions */}
      {design.cabinetDimensions && (
        <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h4 className="text-xl font-semibold text-amber-400 mb-4">📏 Cabinet Dimensions</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-zinc-300">
            <div>
              <div className="text-zinc-500 text-sm">Width</div>
              <div className="text-xl font-bold">{design.cabinetDimensions.width}mm</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Height</div>
              <div className="text-xl font-bold">{design.cabinetDimensions.height}mm</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Depth</div>
              <div className="text-xl font-bold">{design.cabinetDimensions.depth}mm</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Volume</div>
              <div className="text-xl font-bold">{design.cabinetDimensions.volume}L</div>
            </div>
          </div>
        </div>
      )}

      {/* Port Specifications */}
      {design.portSpecs && (
        <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h4 className="text-xl font-semibold text-green-400 mb-4">🌀 Port Specifications</h4>
          <div className="grid grid-cols-3 gap-4 text-zinc-300">
            <div>
              <div className="text-zinc-500 text-sm">Diameter</div>
              <div className="text-xl font-bold">{design.portSpecs.diameter}mm</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Length</div>
              <div className="text-xl font-bold">{design.portSpecs.length}mm</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Tuning</div>
              <div className="text-xl font-bold">{design.portSpecs.tuning}Hz</div>
            </div>
          </div>
        </div>
      )}

      {/* Materials */}
      {design.materials && (
        <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h4 className="text-xl font-semibold text-purple-400 mb-4">🔧 Materials</h4>
          <div className="space-y-4">
            {design.materials.woodCutList && design.materials.woodCutList.length > 0 && (
              <div>
                <h5 className="text-lg font-medium text-white mb-2">Wood Cut List</h5>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  {design.materials.woodCutList.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {design.materials.steelBracing && design.materials.steelBracing.length > 0 && (
              <div>
                <h5 className="text-lg font-medium text-white mb-2">Steel Bracing</h5>
                <ul className="list-disc list-inside text-zinc-400 space-y-1">
                  {design.materials.steelBracing.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {design.materials.dampening && (
              <div>
                <h5 className="text-lg font-medium text-white mb-2">Dampening</h5>
                <p className="text-zinc-400">{design.materials.dampening}</p>
              </div>
            )}
            {design.materials.crossover && (
              <div>
                <h5 className="text-lg font-medium text-white mb-2">Crossover</h5>
                <p className="text-zinc-400">{design.materials.crossover}</p>
              </div>
            )}
            {design.materials.ampPlate && (
              <div>
                <h5 className="text-lg font-medium text-white mb-2">Amp Plate</h5>
                <p className="text-zinc-400">{design.materials.ampPlate}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {design.aiAnalysis && (
        <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h4 className="text-xl font-semibold text-blue-400 mb-4">🤖 AI Analysis</h4>
          <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono">
            {design.aiAnalysis}
          </pre>
        </div>
      )}

      {/* Generate Blueprint Button */}
      <div className="flex justify-center">
        <button
          onClick={onGenerateBlueprint}
          disabled={loading}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Generating...' : '📐 Generate Manufacturing Blueprint'}
        </button>
      </div>
    </div>
  );
}
