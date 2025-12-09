import React from 'react';
import type { DesignTemplate } from '@/lib/types/speaker-designer';

interface TemplatesModalProps {
  templates: DesignTemplate[];
  onApplyTemplate: (template: DesignTemplate) => void;
  onClose: () => void;
}

export default function TemplatesModal({ templates, onApplyTemplate, onClose }: TemplatesModalProps) {
  return (
    <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-cyan-300">📋 Design Templates ({templates.length})</h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map(template => (
          <div key={template.id} className="bg-zinc-900 border border-cyan-600/30 rounded-lg p-4 hover:border-cyan-500 transition-colors">
            <h4 className="text-lg font-semibold text-white mb-2">{template.name}</h4>
            <p className="text-sm text-zinc-400 mb-3">{template.description}</p>
            <div className="text-xs text-zinc-500 space-y-1 mb-4">
              <div><span className="text-zinc-400">Type:</span> {template.speakerType.replace(/_/g, ' ')} + {template.additionalTypes.join(', ')}</div>
              <div><span className="text-zinc-400">Drivers:</span></div>
              <ul className="list-disc list-inside ml-2">
                {template.recommendedDrivers.map((d, idx) => (
                  <li key={idx}>{d.count}x {d.type} - {d.specs}</li>
                ))}
              </ul>
              <div><span className="text-zinc-400">Est. Size:</span> {template.estimatedDimensions.width}×{template.estimatedDimensions.height}×{template.estimatedDimensions.depth}mm</div>
            </div>
            <button
              onClick={() => onApplyTemplate(template)}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Apply Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
