import React from 'react';
import type { SavedDesign } from '@/lib/types/speaker-designer';

interface SavedDesignsModalProps {
  designs: SavedDesign[];
  onLoadDesign: (design: SavedDesign) => void;
  onClose: () => void;
}

export default function SavedDesignsModal({ designs, onLoadDesign, onClose }: SavedDesignsModalProps) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/50',
      approved: 'bg-green-600/20 text-green-300 border-green-500/50',
      built: 'bg-blue-600/20 text-blue-300 border-blue-500/50',
      archived: 'bg-zinc-600/20 text-zinc-400 border-zinc-500/50'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-emerald-300">💾 Saved Designs ({designs.length})</h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
        >
          ✕
        </button>
      </div>
      
      {designs.length === 0 ? (
        <p className="text-zinc-400 text-center py-8">No saved designs yet. Save a design to see it here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {designs.map(design => (
            <div key={design.id} className="bg-zinc-900 border border-emerald-600/30 rounded-lg p-4 hover:border-emerald-500 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-semibold text-white">{design.name}</h4>
                <span className={`text-xs px-2 py-1 rounded border ${getStatusBadge(design.status)}`}>
                  {design.status}
                </span>
              </div>
              <div className="text-sm text-zinc-400 space-y-1 mb-4">
                <div><span className="text-zinc-500">Type:</span> {design.speaker_type.replace(/_/g, ' ')}</div>
                <div><span className="text-zinc-500">Drivers:</span> {Array.isArray(design.drivers) ? design.drivers.length : 0}</div>
                <div><span className="text-zinc-500">Created:</span> {new Date(design.created_at).toLocaleDateString()}</div>
                {design.notes && (
                  <div className="text-xs text-zinc-500 mt-2 italic">{design.notes}</div>
                )}
              </div>
              <button
                onClick={() => onLoadDesign(design)}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Load Design
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
