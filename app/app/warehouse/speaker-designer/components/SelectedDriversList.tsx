import type { Driver } from '@/lib/types/speaker-designer';

interface SelectedDriversListProps {
  drivers: Driver[];
  onRemove: (driverId: string) => void;
}

export default function SelectedDriversList({ drivers, onRemove }: SelectedDriversListProps) {
  if (drivers.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-white mb-4">Selected Drivers ({drivers.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drivers.map((driver) => (
          <div key={driver.id} className="bg-zinc-900 border border-zinc-600 rounded-lg p-4 flex justify-between items-start">
            <div>
              <h4 className="text-white font-medium">{driver.name}</h4>
              <p className="text-zinc-400 text-sm">{driver.type}</p>
              {driver.specs && (
                <div className="text-xs text-zinc-500 mt-2 space-y-1">
                  {driver.specs.impedance && <div>Impedance: {driver.specs.impedance}</div>}
                  {driver.specs.power_rating && <div>Power: {driver.specs.power_rating}</div>}
                  {driver.specs.sensitivity && <div>Sensitivity: {driver.specs.sensitivity}</div>}
                </div>
              )}
            </div>
            <button
              onClick={() => onRemove(driver.id)}
              className="text-red-400 hover:text-red-300 ml-4"
              title="Remove driver"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
