'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/layout/DashboardLayout';

type SpeakerType = 'line_array' | 'shaded_line_array' | 'half_line_array' | 'sub' | 'active' | 'passive' | 'home_system';
type Driver = {
  id: string;
  name: string;
  type: string; // woofer, mid, tweeter, compression driver
  specs?: any;
};

type Design = {
  id: string;
  name: string;
  speakerType: SpeakerType;
  drivers: Driver[];
  cabinetDimensions?: {
    width: number;
    height: number;
    depth: number;
    volume: number; // liters
  };
  portSpecs?: {
    diameter: number;
    length: number;
    tuning: number; // Hz
  };
  materials?: {
    woodCutList: string[];
    steelBracing: string[];
    dampening: string;
    crossover?: string;
    ampPlate?: string;
  };
  availableParts?: any[];
  aiAnalysis?: string;
  createdAt: string;
};

export default function SpeakerDesignerPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [currentDesign, setCurrentDesign] = useState<Partial<Design> | null>(null);
  const [speakerType, setSpeakerType] = useState<SpeakerType>('line_array');
  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [researchComplete, setResearchComplete] = useState(false);
  const [showDriverSelector, setShowDriverSelector] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    loadAvailableDrivers();
  }, []);

  async function loadAvailableDrivers() {
    try {
      // Load speakers from inventory that could be used as drivers
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .in('subcategory', ['tops', 'subs', 'monitor_wedges', 'active_speakers'])
        .or('maintenance_status.eq.needs_repair,maintenance_status.eq.retired')
        .order('name');

      if (error) throw error;
      setAvailableDrivers(data || []);
    } catch (err) {
      console.error('Error loading drivers:', err);
    }
  }

  async function handleResearchDesigns() {
    setResearching(true);
    setAiResponse('Researching popular speaker designs...');

    try {
      const response = await fetch('/api/ai/research-speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakerType,
          task: 'research'
        })
      });

      if (!response.ok) throw new Error('Research failed');

      const data = await response.json();
      setAiResponse(data.analysis || 'Research complete');
      setResearchComplete(true);
    } catch (err) {
      console.error('Error researching:', err);
      setAiResponse('Research failed. Please try again.');
    } finally {
      setResearching(false);
    }
  }

  async function handleAddDriver(driver: any) {
    const newDriver: Driver = {
      id: driver.id,
      name: driver.name,
      type: detectDriverType(driver),
      specs: driver.speaker_test_data
    };

    setSelectedDrivers([...selectedDrivers, newDriver]);
    setShowDriverSelector(false);

    // Research this specific driver
    setAiResponse(`Analyzing ${driver.name}...`);
    try {
      const response = await fetch('/api/ai/research-speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'analyze_driver',
          driver: newDriver
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(prev => prev + '\n\n' + data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing driver:', err);
    }
  }

  function detectDriverType(item: any): string {
    const name = item.name?.toLowerCase() || '';
    if (name.includes('sub') || name.includes('woofer')) return 'woofer';
    if (name.includes('mid')) return 'mid';
    if (name.includes('tweet') || name.includes('compression')) return 'tweeter';
    return 'driver';
  }

  async function handleGenerateDesign() {
    if (selectedDrivers.length === 0) {
      alert('Please add at least one driver first');
      return;
    }

    setGenerating(true);
    setAiResponse('Generating speaker cabinet design...');

    try {
      const response = await fetch('/api/ai/research-speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'generate_design',
          speakerType,
          drivers: selectedDrivers,
          availableParts: availableDrivers
        })
      });

      if (!response.ok) throw new Error('Design generation failed');

      const data = await response.json();
      
      const newDesign: Design = {
        id: `design-${Date.now()}`,
        name: `${speakerType.replace(/_/g, ' ').toUpperCase()} - ${new Date().toLocaleDateString()}`,
        speakerType,
        drivers: selectedDrivers,
        cabinetDimensions: data.cabinetDimensions,
        portSpecs: data.portSpecs,
        materials: data.materials,
        availableParts: data.availableParts,
        aiAnalysis: data.analysis,
        createdAt: new Date().toISOString()
      };

      setDesigns([newDesign, ...designs]);
      setCurrentDesign(newDesign);
      setAiResponse(data.analysis || 'Design generated successfully');
    } catch (err) {
      console.error('Error generating design:', err);
      setAiResponse('Design generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">AI Speaker Cabinet Designer</h1>
          <p className="text-zinc-400">Design professional speaker cabinets using AI analysis and driver specifications</p>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Research Button */}
          <button
            onClick={handleResearchDesigns}
            disabled={researching}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>🔬</span>
            {researching ? 'Researching...' : 'Research Speaker Designs'}
          </button>

          {/* Add Driver Button */}
          <button
            onClick={() => setShowDriverSelector(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>🔊</span>
            Add Driver ({selectedDrivers.length})
          </button>

          {/* Generate Design Button */}
          <button
            onClick={handleGenerateDesign}
            disabled={generating || selectedDrivers.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>✨</span>
            {generating ? 'Generating...' : 'Generate Design'}
          </button>
        </div>

        {/* Speaker Type Selector */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Speaker Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'line_array', label: 'Line Array' },
              { value: 'shaded_line_array', label: 'Shaded Line Array' },
              { value: 'half_line_array', label: 'Half Line Array' },
              { value: 'sub', label: 'Subwoofer' },
              { value: 'active', label: 'Active Speaker' },
              { value: 'passive', label: 'Passive Speaker' },
              { value: 'home_system', label: 'Home Sound System' }
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setSpeakerType(type.value as SpeakerType)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  speakerType === type.value
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Drivers */}
        {selectedDrivers.length > 0 && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Selected Drivers</h2>
            <div className="space-y-2">
              {selectedDrivers.map((driver, idx) => (
                <div key={idx} className="flex items-center justify-between bg-zinc-900 p-3 rounded">
                  <div>
                    <div className="text-white font-medium">{driver.name}</div>
                    <div className="text-zinc-400 text-sm">Type: {driver.type}</div>
                  </div>
                  <button
                    onClick={() => setSelectedDrivers(selectedDrivers.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-300 px-3 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">AI Analysis</h2>
            <div className="text-zinc-300 whitespace-pre-wrap font-mono text-sm bg-zinc-900 p-4 rounded">
              {aiResponse}
            </div>
          </div>
        )}

        {/* Current Design */}
        {currentDesign && (
          <div className="bg-zinc-800 border border-amber-500 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Current Design: {currentDesign.name}</h2>
            
            {currentDesign.cabinetDimensions && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-amber-400 mb-2">Cabinet Dimensions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-zinc-400">Width:</span> <span className="text-white">{currentDesign.cabinetDimensions.width}mm</span></div>
                  <div><span className="text-zinc-400">Height:</span> <span className="text-white">{currentDesign.cabinetDimensions.height}mm</span></div>
                  <div><span className="text-zinc-400">Depth:</span> <span className="text-white">{currentDesign.cabinetDimensions.depth}mm</span></div>
                  <div><span className="text-zinc-400">Volume:</span> <span className="text-white">{currentDesign.cabinetDimensions.volume}L</span></div>
                </div>
              </div>
            )}

            {currentDesign.portSpecs && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-amber-400 mb-2">Port Specifications</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-zinc-400">Diameter:</span> <span className="text-white">{currentDesign.portSpecs.diameter}mm</span></div>
                  <div><span className="text-zinc-400">Length:</span> <span className="text-white">{currentDesign.portSpecs.length}mm</span></div>
                  <div><span className="text-zinc-400">Tuning:</span> <span className="text-white">{currentDesign.portSpecs.tuning}Hz</span></div>
                </div>
              </div>
            )}

            {currentDesign.materials && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-amber-400 mb-2">Materials & Cut List</h3>
                <div className="space-y-3">
                  {currentDesign.materials.woodCutList && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Wood Cuts:</h4>
                      <ul className="list-disc list-inside text-zinc-300 text-sm space-y-1">
                        {currentDesign.materials.woodCutList.map((cut, idx) => (
                          <li key={idx}>{cut}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentDesign.materials.steelBracing && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Steel Bracing:</h4>
                      <ul className="list-disc list-inside text-zinc-300 text-sm space-y-1">
                        {currentDesign.materials.steelBracing.map((brace, idx) => (
                          <li key={idx}>{brace}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentDesign.materials.dampening && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Dampening:</h4>
                      <p className="text-zinc-300 text-sm">{currentDesign.materials.dampening}</p>
                    </div>
                  )}
                  {currentDesign.materials.crossover && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Crossover:</h4>
                      <p className="text-zinc-300 text-sm">{currentDesign.materials.crossover}</p>
                    </div>
                  )}
                  {currentDesign.materials.ampPlate && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Amp Plate:</h4>
                      <p className="text-zinc-300 text-sm">{currentDesign.materials.ampPlate}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Driver Selector Modal */}
        {showDriverSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Select Driver from Available Parts</h2>
                <button
                  onClick={() => setShowDriverSelector(false)}
                  className="text-zinc-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                {availableDrivers.map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => handleAddDriver(driver)}
                    className="w-full text-left bg-zinc-900 hover:bg-zinc-700 p-4 rounded border border-zinc-700 hover:border-amber-500 transition-colors"
                  >
                    <div className="font-medium text-white">{driver.name}</div>
                    <div className="text-sm text-zinc-400 mt-1">
                      {driver.category} - {driver.subcategory} - {driver.maintenance_status}
                    </div>
                  </button>
                ))}
                {availableDrivers.length === 0 && (
                  <div className="text-center text-zinc-500 py-8">
                    No broken/retired speakers available to use as drivers
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saved Designs */}
        {designs.length > 0 && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Saved Designs ({designs.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {designs.map(design => (
                <button
                  key={design.id}
                  onClick={() => setCurrentDesign(design)}
                  className="text-left bg-zinc-900 hover:bg-zinc-700 p-4 rounded border border-zinc-700 hover:border-amber-500 transition-colors"
                >
                  <div className="font-medium text-white">{design.name}</div>
                  <div className="text-sm text-zinc-400 mt-1">
                    {design.drivers.length} drivers - {new Date(design.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
