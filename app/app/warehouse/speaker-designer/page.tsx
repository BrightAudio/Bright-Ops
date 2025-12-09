'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type {
  SpeakerType,
  Driver,
  Design,
  SavedDesign,
  AvailableDriver,
  NewDriverForm,
  BlueprintResults,
  DisplayedDriverAnalysis,
  DriverAnalysis,
  DesignTemplate,
  CostEstimate,
  MaterialCost
} from '@/lib/types/speaker-designer';

export default function SpeakerDesignerPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [currentDesign, setCurrentDesign] = useState<Partial<Design> | null>(null);
  const [speakerType, setSpeakerType] = useState<SpeakerType>('line_array');
  const [selectedTypes, setSelectedTypes] = useState<SpeakerType[]>(['passive']);
  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>([]);
  
  // Global loading state to prevent conflicting operations
  const [isOperating, setIsOperating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [researchComplete, setResearchComplete] = useState(false);
  const [showDriverSelector, setShowDriverSelector] = useState(false);
  const [showNewDriverModal, setShowNewDriverModal] = useState(false);
  
  // Store research data to pass to design generation
  const [blueprintResearch, setBlueprintResearch] = useState<string>('');
  const [driverAnalysis, setDriverAnalysis] = useState<DriverAnalysis[]>([]);
  const [showBlueprintResults, setShowBlueprintResults] = useState(false);
  const [blueprintResults, setBlueprintResults] = useState<BlueprintResults | null>(null);
  const [displayedDriverAnalyses, setDisplayedDriverAnalyses] = useState<DisplayedDriverAnalysis[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [newDriver, setNewDriver] = useState<NewDriverForm>({
    name: "",
    driver_type: "",
    impedance: "",
    power_rating: "",
    frequency_response_low: "",
    frequency_response_high: "",
    sensitivity: "",
    diameter: "",
    fs: "",
    qts: "",
    vas: "",
    xmax_excursion: "",
  });
  
  // Saved designs management
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [showSavedDesigns, setShowSavedDesigns] = useState(false);
  const [selectedSavedDesign, setSelectedSavedDesign] = useState<SavedDesign | null>(null);
  
  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const [designTemplates] = useState<DesignTemplate[]>([
    {
      id: '1',
      name: 'Passive Line Array',
      description: '2-way line array element with passive crossover',
      speakerType: 'line_array',
      additionalTypes: ['passive'],
      recommendedDrivers: [
        { type: 'mid', count: 2, specs: '6.5" mid-range, 8Ω, 200W' },
        { type: 'tweeter', count: 1, specs: '1" compression driver, 8Ω, 50W' }
      ],
      estimatedDimensions: { width: 300, height: 600, depth: 400, volume: 72 }
    },
    {
      id: '2',
      name: 'Active Subwoofer',
      description: 'Powered subwoofer with DSP and amplifier',
      speakerType: 'sub',
      additionalTypes: ['active'],
      recommendedDrivers: [
        { type: 'woofer', count: 1, specs: '18" woofer, 4Ω, 1000W' }
      ],
      estimatedDimensions: { width: 600, height: 700, depth: 700, volume: 294 }
    },
    {
      id: '3',
      name: 'Home Studio Monitor',
      description: '2-way active monitor for home studio use',
      speakerType: 'home_system',
      additionalTypes: ['active'],
      recommendedDrivers: [
        { type: 'woofer', count: 1, specs: '8" woofer, 4Ω, 100W' },
        { type: 'tweeter', count: 1, specs: '1" dome tweeter, 4Ω, 30W' }
      ],
      estimatedDimensions: { width: 250, height: 350, depth: 300, volume: 26.25 }
    }
  ]);
  
  // Cost estimate
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [showCostEstimate, setShowCostEstimate] = useState(false);

  useEffect(() => {
    loadAvailableDrivers();
    loadSavedDesigns();
  }, []);

  // Helper: Fetch with timeout
  async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  // Load saved designs
  async function loadSavedDesigns() {
    try {
      const { data, error } = await supabase
        .from('speaker_designs')
        .select('*')
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;
      setSavedDesigns((data || []) as SavedDesign[]);
    } catch (err) {
      console.error('Error loading saved designs:', err);
    }
  }

  // Clear all and start fresh
  function handleClearAll() {
    if (selectedDrivers.length === 0 && !currentDesign) {
      return; // Nothing to clear
    }

    const confirmed = confirm('Are you sure you want to clear all drivers, research data, and the current design? This cannot be undone.');
    if (!confirmed) return;

    setSelectedDrivers([]);
    setCurrentDesign(null);
    setBlueprintResearch('');
    setDriverAnalysis([]);
    setDisplayedDriverAnalyses([]);
    setBlueprintResults(null);
    setShowBlueprintResults(false);
    setCostEstimate(null);
    setShowCostEstimate(false);
    setAiResponse('');
    setResearchComplete(false);
    alert('Workspace cleared successfully');
  }

  // Validate inputs before generation
  function validateInputs(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (selectedDrivers.length === 0) {
      errors.push('At least one driver must be selected');
    }

    // Validate driver specs
    selectedDrivers.forEach((driver, idx) => {
      if (!driver.name || driver.name.trim() === '') {
        errors.push(`Driver ${idx + 1} has no name`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Calculate cost estimate from blueprint
  function calculateCostEstimate(blueprint: any) {
    if (!blueprint) return null;

    const woodCosts: MaterialCost[] = [];
    const steelCosts: MaterialCost[] = [];
    const hardwareCosts: MaterialCost[] = [];

    // Wood costs
    if (blueprint.woodCuts && Array.isArray(blueprint.woodCuts)) {
      const plywoodSheets = Math.ceil(blueprint.woodCuts.length / 4); // Assume 4 panels per sheet
      woodCosts.push({
        item: '18mm Baltic Birch Plywood (4x8 sheet)',
        quantity: plywoodSheets,
        unit: 'sheet',
        unitPrice: 85,
        totalPrice: plywoodSheets * 85
      });
    }

    // Steel costs
    if (blueprint.steelCuts && Array.isArray(blueprint.steelCuts)) {
      const totalSteel = blueprint.steelCuts.reduce((sum: number, cut: any) => {
        const length = cut.length || 0;
        const qty = cut.quantity || 1;
        return sum + (length * qty / 1000); // Convert to meters
      }, 0);
      
      steelCosts.push({
        item: 'Steel angle iron (per meter)',
        quantity: Math.ceil(totalSteel),
        unit: 'meter',
        unitPrice: 12,
        totalPrice: Math.ceil(totalSteel) * 12
      });
    }

    // Hardware
    hardwareCosts.push(
      { item: 'Wood screws', quantity: 1, unit: 'box', unitPrice: 15, totalPrice: 15 },
      { item: 'Wood glue', quantity: 1, unit: 'bottle', unitPrice: 12, totalPrice: 12 },
      { item: 'Acoustic dampening material', quantity: 1, unit: 'sheet', unitPrice: 25, totalPrice: 25 }
    );

    const total = 
      woodCosts.reduce((sum, item) => sum + item.totalPrice, 0) +
      steelCosts.reduce((sum, item) => sum + item.totalPrice, 0) +
      hardwareCosts.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      wood: woodCosts,
      steel: steelCosts,
      hardware: hardwareCosts,
      total
    };
  }

  // Apply template
  function applyTemplate(template: DesignTemplate) {
    const confirmed = confirm(`Apply template "${template.name}"? This will reset your current selection.`);
    if (!confirmed) return;

    setSpeakerType(template.speakerType);
    setSelectedTypes(template.additionalTypes);
    setShowTemplates(false);
    setAiResponse(`Template "${template.name}" applied. Recommended drivers: ${template.recommendedDrivers.map(d => `${d.count}x ${d.type} (${d.specs})`).join(', ')}`);
  }

  // Load saved design
  function loadSavedDesign(design: SavedDesign) {
    const confirmed = confirm(`Load design "${design.name}"? This will replace your current work.`);
    if (!confirmed) return;

    setSpeakerType(design.speaker_type as SpeakerType);
    setSelectedTypes(design.additional_types as SpeakerType[]);
    setSelectedDrivers(design.drivers);
    setBlueprintResearch(design.blueprint_research || '');
    setDriverAnalysis(design.driver_analysis || []);
    
    setCurrentDesign({
      id: design.id,
      name: design.name,
      speakerType: design.speaker_type as SpeakerType,
      drivers: design.drivers,
      cabinetDimensions: design.cabinet_dimensions || undefined,
      portSpecs: design.port_specs || undefined,
      materials: design.materials || undefined,
      blueprint: design.blueprint || undefined,
      aiAnalysis: design.ai_analysis || undefined,
      createdAt: design.created_at
    });

    setShowSavedDesigns(false);
    setSelectedSavedDesign(design);
    setAiResponse(`Loaded design: ${design.name}`);
  }

  async function loadAvailableDrivers() {
    try {
      // Load salvaged parts, speakers from inventory, AND individual drivers from speakers
      const [partsResult, inventoryResult] = await Promise.all([
        (supabase as any)
          .from('speaker_parts')
          .select('*')
          .eq('is_available', true)
          .order('name'),
        supabase
          .from('inventory_items')
          .select('*')
          .in('subcategory', ['tops', 'subs', 'monitor_wedges', 'active_speakers', 'column_speakers'])
          .order('name')
      ]);

      const parts = partsResult.data || [];
      const inventory = inventoryResult.data || [];

      // Extract individual drivers from inventory speaker_test_data
      const driversFromInventory: any[] = [];
      inventory.forEach((item: any) => {
        if (item.speaker_test_data?.drivers && Array.isArray(item.speaker_test_data.drivers)) {
          item.speaker_test_data.drivers.forEach((driver: any) => {
            driversFromInventory.push({
              ...driver,
              source: 'inventory_driver',
              source_item_name: item.name,
              source_item_id: item.id,
            });
          });
        }
      });

      // Combine all sources: salvaged parts + whole speakers + individual drivers
      const combined = [
        // Salvaged parts (individual drivers)
        ...parts.map((p: any) => ({
          ...p,
          source: 'part',
          subcategory: p.driver_type,
          speaker_test_data: {
            impedance: p.impedance,
            frequency_response_low: p.frequency_response_low,
            frequency_response_high: p.frequency_response_high,
            sensitivity: p.sensitivity,
            power_rating: p.power_rating,
          }
        })),
        // Individual drivers from speakers
        ...driversFromInventory.map((d: any) => ({
          ...d,
          name: d.name,
          subcategory: d.driver_type,
          speaker_test_data: {
            impedance: d.impedance,
            frequency_response_low: d.frequency_response_low,
            frequency_response_high: d.frequency_response_high,
            sensitivity: d.sensitivity,
            power_rating: d.power_rating,
          }
        })),
        // Whole speaker systems (broken/retired only for salvage)
        ...inventory
          .filter((i: any) => i.maintenance_status === 'needs_repair' || i.maintenance_status === 'retired')
          .map(i => ({ ...i, source: 'inventory' }))
      ];

      setAvailableDrivers(combined);
    } catch (err) {
      console.error('Error loading drivers:', err);
    }
  }

  async function handleAnalyzeDrivers() {
    if (selectedDrivers.length === 0) {
      alert('Please add at least one driver first');
      return;
    }

    if (isOperating) {
      alert('Another operation is in progress. Please wait.');
      return;
    }

    setIsOperating(true);
    setResearching(true);
    setAiResponse('Analyzing selected drivers...');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (authErr) {
        console.warn('Auth session unavailable, continuing without auth:', authErr);
      }

      let analysisResults = '';
      const driverAnalysisData: DriverAnalysis[] = [];
      
      for (const driver of selectedDrivers) {
        try {
          const response = await fetchWithTimeout('/api/ai/research-speakers', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              task: 'analyze_driver',
              driver: driver
            })
          }, 30000);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          analysisResults += `\n\n=== ${driver.name} ===\n${data.analysis}`;
          setAiResponse(analysisResults);
          
          // Store each driver's analysis for data
          driverAnalysisData.push({
            driverName: driver.name,
            analysis: data.analysis || ''
          });
          
          // Store for display with Use Research button
          setDisplayedDriverAnalyses(prev => [...prev, {
            driverName: driver.name,
            analysis: data.analysis || '',
            used: false
          }]);
        } catch (driverErr) {
          console.error(`Error analyzing ${driver.name}:`, driverErr);
          setAiResponse(prev => prev + `\n\n⚠️ Failed to analyze ${driver.name}: ${driverErr instanceof Error ? driverErr.message : 'Unknown error'}`);
        }
      }
      
      // Store all driver analyses for design generation
      if (driverAnalysisData.length > 0) {
        setDriverAnalysis(driverAnalysisData);
      }
      
    } catch (err) {
      console.error('Error analyzing drivers:', err);
      setAiResponse(`Driver analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
    } finally {
      setResearching(false);
      setIsOperating(false);
    }
  }

  async function handleResearchDesigns() {
    if (selectedDrivers.length === 0) {
      alert('Please add at least one driver first to research blueprints');
      return;
    }

    if (isOperating) {
      alert('Another operation is in progress. Please wait.');
      return;
    }

    setIsOperating(true);
    setResearching(true);
    const driverNames = selectedDrivers.map(d => d.name).join(', ');
    const types = [speakerType, ...selectedTypes].join(' + ');
    setAiResponse(`Researching ${types} blueprints using: ${driverNames}...`);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (authErr) {
        console.warn('Auth session unavailable, continuing without auth:', authErr);
      }

      const response = await fetchWithTimeout('/api/ai/research-speakers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          speakerType,
          selectedTypes,
          drivers: selectedDrivers,
          task: 'research'
        })
      }, 45000); // Longer timeout for research

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Research failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      setAiResponse(data.analysis || 'Research complete');
      
      // Store and display blueprint research
      if (data.analysis) {
        setBlueprintResults(data);
        setShowBlueprintResults(true);
      }
      setResearchComplete(true);
    } catch (err) {
      console.error('Error researching:', err);
      setAiResponse(`Research failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
    } finally {
      setResearching(false);
      setIsOperating(false);
    }
  }

  function handleUseResearch() {
    if (blueprintResults?.analysis) {
      setBlueprintResearch(blueprintResults.analysis);
      setAiResponse('✓ Blueprint research data added - ready for design generation');
    }
  }

  function handleUseDriverAnalysis(driverName: string) {
    // Find and mark this driver analysis as used
    setDisplayedDriverAnalyses(prev => 
      prev.map(d => d.driverName === driverName ? { ...d, used: true } : d)
    );
    
    // Add to driver analysis if not already there
    const existingAnalysis = driverAnalysis.find(d => d.driverName === driverName);
    if (!existingAnalysis) {
      const driverData = displayedDriverAnalyses.find(d => d.driverName === driverName);
      if (driverData) {
        setDriverAnalysis(prev => [...prev, {
          driverName: driverData.driverName,
          analysis: driverData.analysis
        }]);
      }
    }
    
    setAiResponse(`✓ ${driverName} analysis added - ready for design generation`);
  }

  async function handleSaveDriverAnalysis(driverName: string, analysis: string) {
    try {
      // Parse the analysis to extract Thiele-Small parameters and specs
      const analysisText = analysis.toLowerCase();
      
      // Find the driver in selected drivers to get its ID if it's from speaker_parts
      const driver = selectedDrivers.find(d => d.name === driverName);
      
      if (driver && driver.id && analysisText) {
        // Try to find this driver in speaker_parts
        const { data: existingPart } = await (supabase as any)
          .from('speaker_parts')
          .select('*')
          .eq('id', driver.id)
          .single();

        if (existingPart) {
          // Update the notes field with the full analysis
          const { error } = await (supabase as any)
            .from('speaker_parts')
            .update({
              notes: analysis,
              updated_at: new Date().toISOString()
            })
            .eq('id', driver.id);

          if (error) throw error;
          
          alert(`Driver analysis saved to ${driverName}`);
          setAiResponse(`✓ Analysis saved to driver: ${driverName}`);
        } else {
          alert('Driver not found in speaker_parts table. Create it first.');
        }
      } else {
        alert('Please create this driver in the Parts database first.');
      }
    } catch (error) {
      console.error('Error saving driver analysis:', error);
      alert('Failed to save analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async function handleSaveDesign() {
    if (!currentDesign) {
      alert('No design to save');
      return;
    }

    try {
      const designName = prompt('Enter a name for this design:', currentDesign.name || '');
      if (!designName) return;

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from('speaker_designs')
        .insert({
          name: designName,
          speaker_type: speakerType,
          additional_types: selectedTypes,
          cabinet_dimensions: currentDesign.cabinetDimensions,
          port_specs: currentDesign.portSpecs,
          materials: currentDesign.materials,
          blueprint: currentDesign.blueprint,
          drivers: selectedDrivers,
          blueprint_research: blueprintResearch || null,
          driver_analysis: driverAnalysis.length > 0 ? driverAnalysis : null,
          ai_analysis: currentDesign.aiAnalysis,
          status: 'draft',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      alert('Design saved successfully!');
      setAiResponse(`✓ Design "${designName}" saved to database`);
      
      // Reload saved designs list
      await loadSavedDesigns();
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Failed to save design: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
  }

  function detectDriverType(item: any): string {
    const name = item.name?.toLowerCase() || '';
    if (name.includes('sub') || name.includes('woofer')) return 'woofer';
    if (name.includes('mid')) return 'mid';
    if (name.includes('tweet') || name.includes('compression')) return 'tweeter';
    return 'driver';
  }

  async function handleCreateNewDriver() {
    if (!newDriver.name.trim()) {
      alert('Driver name is required');
      return;
    }

    try {
      // Save to speaker_parts table first
      const { data: savedPart, error: saveError } = await (supabase as any)
        .from('speaker_parts')
        .insert({
          name: newDriver.name,
          driver_type: newDriver.driver_type || 'driver',
          impedance: newDriver.impedance || null,
          power_rating: newDriver.power_rating || null,
          frequency_response_low: newDriver.frequency_response_low || null,
          frequency_response_high: newDriver.frequency_response_high || null,
          sensitivity: newDriver.sensitivity || null,
          diameter: newDriver.diameter || null,
          fs: newDriver.fs || null,
          qts: newDriver.qts || null,
          vas: newDriver.vas || null,
          xmax_excursion: newDriver.xmax_excursion || null,
          condition: 'working',
          is_available: true,
          source_item_name: 'Manual Entry',
          notes: 'Created from Speaker Designer'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Create driver object for local use
      const driver: Driver = {
        id: savedPart.id,
        name: newDriver.name,
        type: newDriver.driver_type || 'driver',
        specs: {
          impedance: newDriver.impedance,
          power_rating: newDriver.power_rating,
          frequency_response_low: newDriver.frequency_response_low,
          frequency_response_high: newDriver.frequency_response_high,
          sensitivity: newDriver.sensitivity,
          diameter: newDriver.diameter,
          fs: newDriver.fs,
          qts: newDriver.qts,
          vas: newDriver.vas,
          xmax_excursion: newDriver.xmax_excursion,
        }
      };

    // Add to selected drivers
    setSelectedDrivers([...selectedDrivers, driver]);
    
    // Reset form and close both modals
    setNewDriver({
      name: "",
      driver_type: "",
      impedance: "",
      power_rating: "",
      frequency_response_low: "",
      frequency_response_high: "",
      sensitivity: "",
      diameter: "",
      fs: "",
      qts: "",
      vas: "",
      xmax_excursion: "",
    });
    setShowNewDriverModal(false);
    setShowDriverSelector(false);
    
    alert(`Driver "${driver.name}" saved to Parts database!`);
    setAiResponse(`✓ Driver "${driver.name}" created and saved to speaker_parts`);
    
    // Reload available drivers to include the new one
    await loadAvailableDrivers();
  } catch (error) {
    console.error('Error creating driver:', error);
    alert('Failed to create driver: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

  async function handleGenerateDesign() {
    // Validate inputs first
    const validation = validateInputs();
    if (!validation.valid) {
      alert('Cannot generate design:\n' + validation.errors.join('\n'));
      return;
    }

    if (isOperating) {
      alert('Another operation is in progress. Please wait.');
      return;
    }

    // Confirm before generation
    const confirmMsg = `Generate design with ${selectedDrivers.length} driver(s)?\n\nDrivers: ${selectedDrivers.map(d => d.name).join(', ')}`;
    if (!confirm(confirmMsg)) return;

    setIsOperating(true);
    setGenerating(true);
    setAiResponse('Generating speaker cabinet design...');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (authErr) {
        console.warn('Auth session unavailable, continuing without auth:', authErr);
      }

      const response = await fetchWithTimeout('/api/ai/research-speakers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task: 'generate_design',
          speakerType,
          selectedTypes,
          drivers: selectedDrivers,
          availableParts: availableDrivers,
          // Include research data if available
          blueprintResearch: blueprintResearch || undefined,
          driverAnalysis: driverAnalysis.length > 0 ? driverAnalysis : undefined
        })
      }, 60000); // Longer timeout for design generation

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Design generation failed (${response.status}): ${errorText}`);
      }

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
      setAiResponse(`Design generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
    } finally {
      setGenerating(false);
      setIsOperating(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">AI Speaker Cabinet Designer</h1>
          <p className="text-zinc-400">Design professional speaker cabinets using AI analysis and driver specifications</p>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {/* Templates Button */}
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>📋</span>
            Templates
          </button>

          {/* Saved Designs Button */}
          <button
            onClick={() => setShowSavedDesigns(!showSavedDesigns)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>💾</span>
            Saved ({savedDesigns.length})
          </button>

          {/* Research Button */}
          <button
            onClick={handleResearchDesigns}
            disabled={isOperating || researching || selectedDrivers.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>🔬</span>
            {researching ? 'Researching...' : 'Research'}
          </button>

          {/* Add Driver Button */}
          <button
            onClick={() => setShowDriverSelector(!showDriverSelector)}
            className={`${
              showDriverSelector ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'
            } text-white px-4 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2`}
          >
            <span>🔊</span>
            Drivers ({selectedDrivers.length})
          </button>

          {/* Analyze Drivers Button */}
          <button
            onClick={handleAnalyzeDrivers}
            disabled={isOperating || researching || selectedDrivers.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>🔍</span>
            {researching ? 'Analyzing...' : 'Analyze'}
          </button>

          {/* Generate Design Button */}
          <button
            onClick={handleGenerateDesign}
            disabled={isOperating || generating || selectedDrivers.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>✨</span>
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* Clear All Button */}
        {(selectedDrivers.length > 0 || currentDesign) && (
          <div className="mb-6">
            <button
              onClick={handleClearAll}
              className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              🗑️ Clear All
            </button>
          </div>
        )}

        {/* Templates Modal */}
        {showTemplates && (
          <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-cyan-300">📋 Design Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {designTemplates.map(template => (
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
                    onClick={() => applyTemplate(template)}
                    className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Apply Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Designs Modal */}
        {showSavedDesigns && (
          <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-emerald-300">💾 Saved Designs ({savedDesigns.length})</h3>
              <button
                onClick={() => setShowSavedDesigns(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
              >
                ✕
              </button>
            </div>
            {savedDesigns.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                <p>No saved designs yet</p>
                <p className="text-sm mt-2">Generate a design and save it to see it here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedDesigns.map(design => (
                  <div key={design.id} className="bg-zinc-900 border border-emerald-600/30 rounded-lg p-4 hover:border-emerald-500 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{design.name}</h4>
                        <p className="text-sm text-zinc-400">{design.speaker_type.replace(/_/g, ' ')} {design.additional_types.length > 0 && `+ ${design.additional_types.join(', ')}`}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        design.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                        design.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        design.status === 'built' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {design.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 grid grid-cols-2 gap-2 mb-3">
                      <div><span className="text-zinc-400">Drivers:</span> {design.drivers.length}</div>
                      <div><span className="text-zinc-400">Created:</span> {new Date(design.created_at).toLocaleDateString()}</div>
                      {design.cabinet_dimensions && (
                        <div className="col-span-2">
                          <span className="text-zinc-400">Dimensions:</span> {design.cabinet_dimensions.width}×{design.cabinet_dimensions.height}×{design.cabinet_dimensions.depth}mm
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => loadSavedDesign(design)}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Load Design
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Research Data Indicator */}
        {(blueprintResearch || driverAnalysis.length > 0) && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 text-green-300">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold">Research Data Available</p>
                <p className="text-sm text-green-400">
                  {blueprintResearch && '• Blueprint research completed'}
                  {blueprintResearch && driverAnalysis.length > 0 && ' '}
                  {driverAnalysis.length > 0 && `• ${driverAnalysis.length} driver(s) analyzed`}
                </p>
                <p className="text-xs text-zinc-400 mt-1">This data will be used to enhance the design generation</p>
              </div>
            </div>
          </div>
        )}

        {/* Blueprint Research Results */}
        {showBlueprintResults && blueprintResults && (
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-blue-300">📚 Blueprint Research Results</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleUseResearch}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  ✓ Use Research
                </button>
                <button
                  onClick={() => setShowBlueprintResults(false)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono">
                {blueprintResults.analysis}
              </pre>
            </div>
          </div>
        )}

        {/* Driver Analysis Results */}
        {displayedDriverAnalyses.length > 0 && (
          <div className="space-y-4 mb-6">
            {displayedDriverAnalyses.map((driverData, idx) => (
              <div key={idx} className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-purple-300">🔍 {driverData.driverName} Analysis</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveDriverAnalysis(driverData.driverName, driverData.analysis)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      💾 Save to Driver
                    </button>
                    {!driverData.used ? (
                      <button
                        onClick={() => handleUseDriverAnalysis(driverData.driverName)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        ✓ Use Analysis
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-green-700 text-white rounded-md text-sm font-medium">
                        ✓ Added
                      </span>
                    )}
                    <button
                      onClick={() => setDisplayedDriverAnalyses(prev => prev.filter((_, i) => i !== idx))}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono">
                    {driverData.analysis}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Speaker Type Selector */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Speaker Configuration</h2>
          
          {/* Primary Type */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Primary Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'line_array', label: 'Line Array' },
                { value: 'shaded_line_array', label: 'Shaded Line Array' },
                { value: 'half_line_array', label: 'Half Line Array' },
                { value: 'sub', label: 'Subwoofer' },
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setSpeakerType(type.value as SpeakerType)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors border-2 ${
                    speakerType === type.value
                      ? 'bg-zinc-600 text-zinc-400 border-zinc-500 cursor-default'
                      : 'bg-zinc-700 text-white hover:bg-zinc-600 border-transparent'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Attributes */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Additional Attributes (click to toggle)</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'active', label: 'Active' },
                { value: 'passive', label: 'Passive' },
                { value: 'home_system', label: 'Home System' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => {
                    setSelectedTypes(prev => 
                      prev.includes(type.value as SpeakerType)
                        ? prev.filter(t => t !== type.value)
                        : [...prev, type.value as SpeakerType]
                    );
                  }}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors border-2 ${
                    selectedTypes.includes(type.value as SpeakerType)
                      ? 'bg-zinc-600 text-zinc-400 border-zinc-500'
                      : 'bg-zinc-700 text-white hover:bg-zinc-600 border-transparent'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
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
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-white">Current Design: {currentDesign.name}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (currentDesign.blueprint) {
                      const estimate = calculateCostEstimate(currentDesign.blueprint);
                      setCostEstimate(estimate);
                      setShowCostEstimate(true);
                    } else {
                      alert('Generate a blueprint first to see cost estimate');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <span>💰</span>
                  Cost Estimate
                </button>
                <button
                  onClick={async () => {
                    if (!currentDesign.blueprint) {
                      alert('Generate a blueprint first to export');
                      return;
                    }
                    
                    // Create downloadable JSON
                    const exportData = {
                      ...currentDesign,
                      exportedAt: new Date().toISOString(),
                      version: '1.0'
                    };
                    
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(currentDesign.name || 'design').replace(/[^a-z0-9]/gi, '_')}_blueprint.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    setAiResponse('✓ Blueprint exported as JSON');
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <span>📄</span>
                  Export JSON
                </button>
                <button
                  onClick={handleSaveDesign}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <span>💾</span>
                  Save Design
                </button>
              </div>
            </div>

            {/* Cost Estimate Display */}
            {showCostEstimate && costEstimate && (
              <div className="mb-4 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-blue-300">💰 Cost Estimate</h3>
                  <button
                    onClick={() => setShowCostEstimate(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                {costEstimate.wood.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Wood Materials</h4>
                    {costEstimate.wood.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-zinc-400 mb-1">
                        <span>{item.item} (×{item.quantity})</span>
                        <span className="text-white">${item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {costEstimate.steel.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Steel Materials</h4>
                    {costEstimate.steel.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-zinc-400 mb-1">
                        <span>{item.item} (×{item.quantity})</span>
                        <span className="text-white">${item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {costEstimate.hardware.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Hardware & Supplies</h4>
                    {costEstimate.hardware.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-zinc-400 mb-1">
                        <span>{item.item}</span>
                        <span className="text-white">${item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="border-t border-blue-500/30 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-blue-300">Total Estimated Cost:</span>
                    <span className="text-white">${costEstimate.total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">* Prices are estimates and may vary by location and supplier</p>
                </div>
              </div>
            )}
            
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
                  {currentDesign.materials.woodCutList && Array.isArray(currentDesign.materials.woodCutList) && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Wood Cuts:</h4>
                      <ul className="list-disc list-inside text-zinc-300 text-sm space-y-1">
                        {currentDesign.materials.woodCutList.map((cut, idx) => (
                          <li key={idx}>{typeof cut === 'string' ? cut : JSON.stringify(cut)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentDesign.materials.steelBracing && Array.isArray(currentDesign.materials.steelBracing) && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Steel Bracing:</h4>
                      <ul className="list-disc list-inside text-zinc-300 text-sm space-y-1">
                        {currentDesign.materials.steelBracing.map((brace, idx) => (
                          <li key={idx}>{typeof brace === 'string' ? brace : JSON.stringify(brace)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentDesign.materials.dampening && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Dampening:</h4>
                      <p className="text-zinc-300 text-sm">
                        {typeof currentDesign.materials.dampening === 'string' 
                          ? currentDesign.materials.dampening 
                          : JSON.stringify(currentDesign.materials.dampening)}
                      </p>
                    </div>
                  )}
                  {currentDesign.materials.crossover && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Crossover:</h4>
                      <p className="text-zinc-300 text-sm">
                        {typeof currentDesign.materials.crossover === 'string' 
                          ? currentDesign.materials.crossover 
                          : JSON.stringify(currentDesign.materials.crossover)}
                      </p>
                    </div>
                  )}
                  {currentDesign.materials.ampPlate && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Amp Plate:</h4>
                      <p className="text-zinc-300 text-sm">
                        {typeof currentDesign.materials.ampPlate === 'string' 
                          ? currentDesign.materials.ampPlate 
                          : JSON.stringify(currentDesign.materials.ampPlate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generate Manufacturing Blueprint Button */}
            <div className="border-t border-zinc-700 pt-4">
              <button
                onClick={async () => {
                  setLoading(true);
                  setAiResponse('Generating detailed manufacturing blueprints...');
                  
                  try {
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (session?.access_token) {
                        headers['Authorization'] = `Bearer ${session.access_token}`;
                      }
                    } catch (authErr) {
                      console.warn('Auth session unavailable, continuing without auth:', authErr);
                    }

                    const response = await fetch('/api/ai/research-speakers', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({
                        task: 'generate_blueprint',
                        currentDesign,
                        speakerType,
                        selectedTypes,
                        drivers: selectedDrivers
                      })
                    });

                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    setAiResponse(data.response || 'Blueprint generated successfully!');
                    
                    // Update design with blueprint data
                    if (data.blueprint) {
                      setCurrentDesign(prev => ({
                        ...prev,
                        blueprint: data.blueprint
                      }));
                    }
                  } catch (error) {
                    console.error('Blueprint generation failed:', error);
                    setAiResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg font-semibold text-lg transition-colors"
              >
                {loading ? 'Generating...' : '📐 Generate Manufacturing Blueprint'}
              </button>
            </div>

            {/* Manufacturing Blueprint Section */}
            {currentDesign.blueprint && (
              <div className="mt-6 border-t border-amber-500 pt-6">
                <h3 className="text-2xl font-bold text-amber-400 mb-4">📐 Manufacturing Blueprint</h3>
                
                {/* Wood Cutting Diagram */}
                {currentDesign.blueprint?.woodCuts && (
                  <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-green-400 mb-4">🪵 Wood Cutting Schedule</h4>
                    <div className="space-y-4">
                      {Array.isArray(currentDesign.blueprint?.woodCuts) ? (
                        currentDesign.blueprint?.woodCuts.map((panel: any, idx: number) => (
                          <div key={idx} className="bg-zinc-800 border border-green-600/30 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="text-lg font-medium text-white">{panel.name || `Panel ${idx + 1}`}</h5>
                              <span className="text-sm text-zinc-400">Qty: {panel.quantity || 1}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div><span className="text-zinc-400">Width:</span> <span className="text-white font-mono">{panel.width}mm</span></div>
                              <div><span className="text-zinc-400">Height:</span> <span className="text-white font-mono">{panel.height}mm</span></div>
                              <div><span className="text-zinc-400">Thickness:</span> <span className="text-white font-mono">{panel.thickness}mm</span></div>
                              <div><span className="text-zinc-400">Material:</span> <span className="text-white">{panel.material}</span></div>
                            </div>
                            {panel.cutouts && panel.cutouts.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-zinc-700">
                                <p className="text-sm text-zinc-300 font-medium mb-2">Cutouts:</p>
                                <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                                  {panel.cutouts.map((cutout: any, cidx: number) => (
                                    <li key={cidx}>{typeof cutout === 'string' ? cutout : `${cutout.type}: ${cutout.diameter}mm @ position ${cutout.position}`}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <pre className="text-zinc-300 text-sm whitespace-pre-wrap">{JSON.stringify(currentDesign.blueprint?.woodCuts, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Steel Cutting & Bracing Diagram */}
                {currentDesign.blueprint?.steelCuts && (
                  <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-blue-400 mb-4">🔩 Steel Cutting & Bracing Schedule</h4>
                    <div className="space-y-4">
                      {Array.isArray(currentDesign.blueprint?.steelCuts) ? (
                        currentDesign.blueprint?.steelCuts.map((piece: any, idx: number) => (
                          <div key={idx} className="bg-zinc-800 border border-blue-600/30 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="text-lg font-medium text-white">{piece.name || `Steel Piece ${idx + 1}`}</h5>
                              <span className="text-sm text-zinc-400">Qty: {piece.quantity || 1}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div><span className="text-zinc-400">Length:</span> <span className="text-white font-mono">{piece.length}mm</span></div>
                              <div><span className="text-zinc-400">Type:</span> <span className="text-white">{piece.type}</span></div>
                              {piece.width && <div><span className="text-zinc-400">Width:</span> <span className="text-white font-mono">{piece.width}mm</span></div>}
                              {piece.thickness && <div><span className="text-zinc-400">Thickness:</span> <span className="text-white font-mono">{piece.thickness}mm</span></div>}
                            </div>
                            {piece.purpose && (
                              <p className="mt-2 text-sm text-zinc-400 italic">{piece.purpose}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <pre className="text-zinc-300 text-sm whitespace-pre-wrap">{JSON.stringify(currentDesign.blueprint?.steelCuts, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Internal Bracing Design */}
                {currentDesign.blueprint?.bracingDesign && (
                  <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-purple-400 mb-4">🏗️ Internal Bracing Design</h4>
                    <div className="space-y-4">
                      {currentDesign.blueprint?.bracingDesign?.pattern && (
                        <div className="bg-zinc-800 border border-purple-600/30 rounded-lg p-4">
                          <h5 className="text-white font-medium mb-2">Bracing Pattern</h5>
                          <p className="text-zinc-300 text-sm">{currentDesign.blueprint?.bracingDesign?.pattern}</p>
                        </div>
                      )}
                      {currentDesign.blueprint?.bracingDesign?.positions && Array.isArray(currentDesign.blueprint?.bracingDesign?.positions) && (
                        <div className="bg-zinc-800 border border-purple-600/30 rounded-lg p-4">
                          <h5 className="text-white font-medium mb-3">Brace Positions</h5>
                          <div className="space-y-2">
                            {currentDesign.blueprint?.bracingDesign?.positions.map((pos: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-zinc-900 p-3 rounded">
                                <span className="text-zinc-300">{pos.location || `Position ${idx + 1}`}</span>
                                <span className="text-white font-mono">{pos.distance || pos.position}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentDesign.blueprint?.bracingDesign?.instructions && (
                        <div className="bg-zinc-800 border border-purple-600/30 rounded-lg p-4">
                          <h5 className="text-white font-medium mb-2">Assembly Instructions</h5>
                          {Array.isArray(currentDesign.blueprint?.bracingDesign?.instructions) ? (
                            <ol className="list-decimal list-inside text-zinc-300 text-sm space-y-1">
                              {currentDesign.blueprint?.bracingDesign?.instructions.map((instruction: string, idx: number) => (
                                <li key={idx}>{instruction}</li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-zinc-300 text-sm">{currentDesign.blueprint?.bracingDesign?.instructions}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assembly Notes */}
                {currentDesign.blueprint?.assemblyNotes && (
                  <div className="bg-zinc-900 border border-amber-600/30 rounded-lg p-6">
                    <h4 className="text-xl font-semibold text-amber-400 mb-4">📝 Assembly Notes</h4>
                    {Array.isArray(currentDesign.blueprint?.assemblyNotes) ? (
                      <ul className="list-disc list-inside text-zinc-300 text-sm space-y-2">
                        {currentDesign.blueprint?.assemblyNotes.map((note: string, idx: number) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-zinc-300 text-sm whitespace-pre-wrap">{currentDesign.blueprint?.assemblyNotes}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Driver Selector Section */}
        {showDriverSelector && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Select Driver</h2>
              <button
                onClick={() => setShowNewDriverModal(!showNewDriverModal)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
              >
                {showNewDriverModal ? 'Cancel' : '+ Create New Driver'}
              </button>
            </div>

            {!showNewDriverModal && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableDrivers.map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => handleAddDriver(driver)}
                    className="w-full text-left bg-zinc-900 hover:bg-zinc-700 p-4 rounded border border-zinc-700 hover:border-amber-500 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-white">{driver.name}</div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        driver.source === 'part' 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : driver.source === 'inventory_driver'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {driver.source === 'part' 
                          ? '🔧 Salvaged Part' 
                          : driver.source === 'inventory_driver'
                          ? '🎛️ Speaker Driver'
                          : '📦 Inventory'}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      {driver.source === 'part' ? (
                        <>
                          {driver.driver_type?.replace('_', ' ').toUpperCase()} 
                          {driver.source_item_name && ` - From: ${driver.source_item_name}`}
                        </>
                      ) : driver.source === 'inventory_driver' ? (
                        <>
                          {driver.driver_type?.replace('_', ' ').toUpperCase()} - From: {driver.source_item_name}
                          {driver.diameter && ` - ${driver.diameter}`}
                          {driver.impedance && ` - ${driver.impedance}`}
                        </>
                      ) : (
                        <>
                          {driver.category} - {driver.subcategory} - {driver.maintenance_status}
                        </>
                      )}
                    </div>
                    {driver.speaker_test_data && (
                      <div className="text-xs text-zinc-500 mt-2 grid grid-cols-3 gap-2">
                        {driver.speaker_test_data.impedance && (
                          <div>Ω: {driver.speaker_test_data.impedance}</div>
                        )}
                        {driver.speaker_test_data.power_rating && (
                          <div>Power: {driver.speaker_test_data.power_rating}</div>
                        )}
                        {driver.speaker_test_data.sensitivity && (
                          <div>Sens: {driver.speaker_test_data.sensitivity} dB</div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
                {availableDrivers.length === 0 && (
                  <div className="text-center text-zinc-500 py-8">
                    <p>No drivers available</p>
                    <p className="text-sm mt-2">Add drivers in Inventory item details or Archive → Speaker Parts</p>
                  </div>
                )}
              </div>
            )}

            {/* Inline New Driver Form */}
            {showNewDriverModal && (
              <div className="space-y-4 pt-4 border-t border-zinc-700">
                <h3 className="text-lg font-semibold text-white">Create New Driver</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Driver Name *
                      </label>
                      <input
                        type="text"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="JBL 2226H 15-inch Woofer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Driver Type
                      </label>
                      <select
                        value={newDriver.driver_type}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, driver_type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                      >
                        <option value="">Select...</option>
                        <option value="woofer">Woofer</option>
                        <option value="mid">Mid-range</option>
                        <option value="tweeter">Tweeter</option>
                        <option value="compression_driver">Compression Driver</option>
                        <option value="passive_radiator">Passive Radiator</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Diameter
                      </label>
                      <input
                        type="text"
                        value={newDriver.diameter}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, diameter: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="15 inch"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Impedance
                      </label>
                      <input
                        type="text"
                        value={newDriver.impedance}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, impedance: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="8 ohm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Power Rating
                      </label>
                      <input
                        type="text"
                        value={newDriver.power_rating}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, power_rating: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="600W RMS"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Sensitivity (dB)
                      </label>
                      <input
                        type="text"
                        value={newDriver.sensitivity}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, sensitivity: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="96"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Frequency Low (Hz)
                      </label>
                      <input
                        type="text"
                        value={newDriver.frequency_response_low}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, frequency_response_low: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">
                        Frequency High (Hz)
                      </label>
                      <input
                        type="text"
                        value={newDriver.frequency_response_high}
                        onChange={(e) => setNewDriver(prev => ({ ...prev, frequency_response_high: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="2000"
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-700 pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Thiele-Small Parameters (Optional)</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-200 mb-1">
                          Fs (Hz)
                        </label>
                        <input
                          type="text"
                          value={newDriver.fs}
                          onChange={(e) => setNewDriver(prev => ({ ...prev, fs: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                          placeholder="35"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-200 mb-1">
                          Qts
                        </label>
                        <input
                          type="text"
                          value={newDriver.qts}
                          onChange={(e) => setNewDriver(prev => ({ ...prev, qts: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                          placeholder="0.4"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-200 mb-1">
                          Vas (L)
                        </label>
                        <input
                          type="text"
                          value={newDriver.vas}
                          onChange={(e) => setNewDriver(prev => ({ ...prev, vas: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                          placeholder="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-200 mb-1">
                          Xmax (mm)
                        </label>
                        <input
                          type="text"
                          value={newDriver.xmax_excursion}
                          onChange={(e) => setNewDriver(prev => ({ ...prev, xmax_excursion: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                          placeholder="8"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewDriverModal(false);
                        setNewDriver({
                          name: "",
                          driver_type: "",
                          impedance: "",
                          power_rating: "",
                          frequency_response_low: "",
                          frequency_response_high: "",
                          sensitivity: "",
                          diameter: "",
                          fs: "",
                          qts: "",
                          vas: "",
                          xmax_excursion: "",
                        });
                      }}
                      className="px-4 py-2 border border-zinc-600 text-zinc-200 rounded hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewDriver}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
                    >
                      Create & Add Driver
                    </button>
                  </div>
                </div>
              )}
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
