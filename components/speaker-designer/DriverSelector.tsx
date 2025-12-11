import React from 'react';
import type { Driver, AvailableDriver } from '@/lib/types/speaker-designer';

interface DriverSelectorProps {
  availableDrivers: AvailableDriver[];
  selectedDrivers: Driver[];
  onAddDriver: (driver: any) => void;
  onRemoveDriver: (driver: Driver) => void;
  onShowNewDriverModal: () => void;
  onClose: () => void;
}

export default function DriverSelector({
  availableDrivers,
  selectedDrivers,
  onAddDriver,
  onRemoveDriver,
  onShowNewDriverModal,
  onClose
}: DriverSelectorProps) {
  const isSelected = (driver: any) => {
    return selectedDrivers.some(d => d.id === driver.id || d.name === driver.name);
  };

  return (
    <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-purple-300">Available Drivers</h3>
        <div className="flex gap-2">
          <button
            onClick={onShowNewDriverModal}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + Create New
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Selected Drivers */}
      {selectedDrivers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-purple-200 mb-2">Selected Drivers ({selectedDrivers.length})</h4>
          <div className="space-y-2">
            {selectedDrivers.map((driver, idx) => (
              <div key={idx} className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-white">{driver.name}</div>
                  <div className="text-xs text-purple-200">
                    {driver.subcategory || driver.type || 'Unknown type'}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveDriver(driver)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Drivers List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {availableDrivers.length === 0 ? (
          <p className="text-zinc-400 text-center py-8">No drivers available. Create a new driver to get started.</p>
        ) : (
          availableDrivers.map((driver, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-3 transition-colors ${
                isSelected(driver)
                  ? 'bg-purple-600/30 border-purple-500'
                  : 'bg-zinc-900 border-zinc-700 hover:border-purple-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-medium text-white">{driver.name}</div>
                  <div className="text-xs text-zinc-400">
                    {driver.subcategory || 'Unknown'} 
                    {driver.source === 'part' && ' • Salvaged Part'}
                    {driver.source === 'inventory' && ' • Inventory'}
                    {driver.source === 'inventory_driver' && ` • From ${driver.source_item_name}`}
                  </div>
                  {driver.speaker_test_data && (
                    <div className="text-xs text-zinc-500 mt-1">
                      {driver.speaker_test_data.impedance && `${driver.speaker_test_data.impedance}, `}
                      {driver.speaker_test_data.power_rating && `${driver.speaker_test_data.power_rating}`}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (isSelected(driver)) {
                      const driverToRemove = selectedDrivers.find(d => d.id === driver.id || d.name === driver.name);
                      if (driverToRemove) onRemoveDriver(driverToRemove);
                    } else {
                      onAddDriver(driver);
                    }
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    isSelected(driver)
                      ? 'bg-zinc-600 hover:bg-zinc-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isSelected(driver) ? '✓ Selected' : 'Add'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
