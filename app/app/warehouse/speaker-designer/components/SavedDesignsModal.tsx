import type { SavedDesign } from '@/lib/types/speaker-designer';

interface SavedDesignsModalProps {
  designs: SavedDesign[];
  onLoadDesign: (design: SavedDesign) => void;
  onClose: () => void;
}

export default function SavedDesignsModal({ designs, onLoadDesign, onClose }: SavedDesignsModalProps) {
  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-600',
      approved: 'bg-green-600',
      built: 'bg-blue-600',
      archived: 'bg-zinc-600'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-600';
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
        <p className="text-zinc-400 text-center py-8">No saved designs yet. Generate and save a design to see it here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {designs.map(design => (
            <div key={design.id} className="bg-zinc-900 border border-emerald-600/30 rounded-lg p-4 hover:border-emerald-500 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-semibold text-white">{design.name}</h4>
                <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(design.status)}`}>
                  {design.status}
                </span>
              </div>
              <div className="text-xs text-zinc-500 space-y-1 mb-4">
                <div><span className="text-zinc-400">Type:</span> {design.speaker_type.replace(/_/g, ' ')}</div>
                <div><span className="text-zinc-400">Drivers:</span> {design.drivers.length}</div>
                <div><span className="text-zinc-400">Created:</span> {new Date(design.created_at).toLocaleDateString()}</div>
                {design.notes && <div className="text-zinc-400 italic">"{design.notes}"</div>}
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
