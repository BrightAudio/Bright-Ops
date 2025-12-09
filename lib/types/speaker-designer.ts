// Type definitions for Speaker Designer

export type SpeakerType = 'line_array' | 'shaded_line_array' | 'half_line_array' | 'sub' | 'active' | 'passive' | 'home_system';

export interface DriverSpecs {
  impedance?: string | number;
  power_rating?: string | number;
  frequency_response_low?: string | number;
  frequency_response_high?: string | number;
  sensitivity?: string | number;
  diameter?: string | number;
  fs?: string | number; // Resonant frequency
  qts?: string | number; // Total Q
  vas?: string | number; // Equivalent compliance volume
  xmax_excursion?: string | number; // Maximum linear excursion
  re?: string | number; // DC resistance
  le?: string | number; // Voice coil inductance
  bl?: string | number; // Force factor
  mms?: string | number; // Moving mass
  cms?: string | number; // Mechanical compliance
  rms?: string | number; // Mechanical resistance
  sd?: string | number; // Effective piston area
}

export interface Driver {
  id: string;
  name: string;
  type: string; // woofer, mid, tweeter, compression_driver, etc.
  specs?: DriverSpecs;
}

export interface CabinetDimensions {
  width: number;
  height: number;
  depth: number;
  volume: number; // liters
}

export interface PortSpecs {
  diameter: number;
  length: number;
  tuning: number; // Hz
}

export interface Materials {
  woodCutList: string[];
  steelBracing: string[];
  dampening: string;
  crossover?: string;
  ampPlate?: string;
}

export interface WoodCut {
  name: string;
  width: number;
  height: number;
  thickness: number;
  material: string;
  quantity: number;
  cutouts?: Array<{
    type: string;
    diameter?: number;
    width?: number;
    height?: number;
    position: string;
  } | string>;
}

export interface SteelCut {
  name: string;
  length: number;
  width?: number;
  type: string; // angle, flat_bar, tube, etc.
  quantity: number;
  thickness?: number;
  material?: string;
}

export interface BracingDesign {
  pattern?: string;
  positions?: Array<{
    location: string;
    type: string;
    dimensions?: string;
  }>;
  instructions?: string | string[];
}

export interface Blueprint {
  woodCuts?: WoodCut[];
  steelCuts?: SteelCut[];
  bracingDesign?: BracingDesign;
  assemblyNotes?: string | string[] | any;
}

export interface DriverAnalysis {
  driverName: string;
  analysis: string;
}

export interface DisplayedDriverAnalysis extends DriverAnalysis {
  used: boolean;
}

export interface Design {
  id: string;
  name: string;
  speakerType: SpeakerType;
  drivers: Driver[];
  cabinetDimensions?: CabinetDimensions;
  portSpecs?: PortSpecs;
  materials?: Materials;
  blueprint?: Blueprint;
  availableParts?: any[];
  aiAnalysis?: string;
  createdAt: string;
}

export interface SavedDesign {
  id: string;
  name: string;
  speaker_type: string;
  additional_types: string[];
  cabinet_dimensions: CabinetDimensions | null;
  port_specs: PortSpecs | null;
  materials: Materials | null;
  blueprint: Blueprint | null;
  drivers: Driver[];
  blueprint_research: string | null;
  driver_analysis: DriverAnalysis[] | null;
  ai_analysis: string | null;
  status: 'draft' | 'approved' | 'built' | 'archived';
  notes: string | null;
  built_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AvailableDriver {
  id: string;
  name: string;
  source: 'part' | 'inventory' | 'inventory_driver';
  driver_type?: string;
  subcategory?: string;
  category?: string;
  maintenance_status?: string;
  source_item_name?: string;
  source_item_id?: string;
  speaker_test_data?: DriverSpecs;
  impedance?: string | number;
  diameter?: string | number;
}

export interface NewDriverForm {
  name: string;
  driver_type: string;
  impedance: string;
  power_rating: string;
  frequency_response_low: string;
  frequency_response_high: string;
  sensitivity: string;
  diameter: string;
  fs: string;
  qts: string;
  vas: string;
  xmax_excursion: string;
}

export interface BlueprintResults {
  analysis: string;
  sources?: any[];
}

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  speakerType: SpeakerType;
  additionalTypes: SpeakerType[];
  recommendedDrivers: {
    type: string;
    count: number;
    specs: string;
  }[];
  estimatedDimensions: CabinetDimensions;
}

export interface MaterialCost {
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface CostEstimate {
  wood: MaterialCost[];
  steel: MaterialCost[];
  hardware: MaterialCost[];
  electronics?: MaterialCost[];
  total: number;
}
