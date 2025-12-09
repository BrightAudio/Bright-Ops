import React from 'react';

interface ControlPanelProps {
  isOperating: boolean;
  researching: boolean;
  generating: boolean;
  selectedDriversCount: number;
  savedDesignsCount: number;
  hasCurrentDesign: boolean;
  appliedTemplate: any;
  onShowTemplates: () => void;
  onShowSavedDesigns: () => void;
  onResearch: () => void;
  onShowDriverSelector: () => void;
  onAnalyze: () => void;
  onGenerate: () => void;
  onClearAll: () => void;
}

export default function ControlPanel({
  isOperating,
  researching,
  generating,
  selectedDriversCount,
  savedDesignsCount,
  hasCurrentDesign,
  appliedTemplate,
  onShowTemplates,
  onShowSavedDesigns,
  onResearch,
  onShowDriverSelector,
  onAnalyze,
  onGenerate,
  onClearAll
}: ControlPanelProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {/* Templates Button */}
        <button
          onClick={onShowTemplates}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span>📋</span>
          Templates
        </button>

        {/* Saved Designs Button */}
        <button
          onClick={onShowSavedDesigns}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span>💾</span>
          Saved ({savedDesignsCount})
        </button>

        {/* Research Button */}
        <button
          onClick={onResearch}
          disabled={isOperating || researching || selectedDriversCount === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>🔬</span>
          {researching ? 'Researching...' : 'Research'}
        </button>

        {/* Add Driver Button */}
        <button
          onClick={onShowDriverSelector}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span>➕</span>
          Drivers ({selectedDriversCount})
        </button>

        {/* Analyze Button */}
        <button
          onClick={onAnalyze}
          disabled={isOperating || researching || selectedDriversCount === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>🔍</span>
          {researching ? 'Analyzing...' : 'Analyze'}
        </button>

        {/* Generate Design Button */}
        <button
          onClick={onGenerate}
          disabled={isOperating || generating || (!appliedTemplate && selectedDriversCount === 0)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>✨</span>
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Clear All Button */}
      {(selectedDriversCount > 0 || hasCurrentDesign) && (
        <div className="mb-6">
          <button
            onClick={onClearAll}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            🗑️ Clear All
          </button>
        </div>
      )}
    </>
  );
}
