'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import BarcodeScanner from '@/components/BarcodeScanner';
import { generateManifestPDF } from '@/lib/utils/generateManifestPDF';

type Item = {
  id: string;
  inventory_item_id?: string | null;
  item_name?: string;
  qty_requested?: number;
  qty_pulled?: number;
  notes?: string | null;
  inventory_items?: {
    barcode?: string;
    name?: string;
    category?: string;
    gear_type?: string;
    image_url?: string;
  };
};

type PullSheet = {
  id: string;
  name: string;
  status: string;
  scheduled_out_at: string | null;
  expected_return_at: string | null;
  notes: string | null;
  jobs?: {
    code?: string;
    title?: string;
  };
};

type ScanHistoryItem = {
  id: string;
  item_name: string;
  scanned_at: string;
  location: string;
};

const CATEGORIES = ['AUDIO', 'LIGHTING', 'VIDEO', 'STAGE', 'DECKING', 'PIPE AND DRAPE', 'POWER', 'MISC', 'OTHER'];

// Subcategory mappings
const SUBCATEGORIES: Record<string, string[]> = {
  'AUDIO': ['Mixers', 'Speakers', 'Tops', 'Subs', 'Wedges', 'Columns', 'Microphones', 'DI Boxes', 'Processors', 'Amplifiers', 'Other Audio'],
  'LIGHTING': ['Uplights', 'Moving Heads', 'Strobes', 'Party Effects', 'Wash Lights', 'Par Cans', 'LED Panels', 'Hazers', 'Controllers', 'Other Lighting'],
  'VIDEO': ['Projectors', 'Screens', 'LED Walls', 'Cameras', 'Switchers', 'Scalers', 'Other Video'],
  'STAGE': ['Stage Decks', 'Stairs', 'Railings', 'Skirting', 'Other Stage'],
  'DECKING': ['Stage Decks', '4x8 Decks', '4x4 Decks', 'Risers', 'Legs', 'Other Decking'],
  'PIPE AND DRAPE': ['Uprights', 'Bases', 'Crossbars', 'Drape', 'Other Pipe and Drape'],
  'POWER': ['Distro', 'Cable', 'Edison', 'Cam-Lok', 'Generators', 'Other Power'],
  'MISC': ['Cases', 'Stands', 'Cables', 'Adapters', 'Tools', 'Other'],
  'OTHER': ['Uncategorized']
};

// Function to determine subcategory from item name
const getSubcategory = (itemName: string, category: string): string => {
  const name = itemName.toLowerCase();
  const subcats = SUBCATEGORIES[category] || [];
  
  // Audio speaker detection by brand/model
  if (category === 'AUDIO' || category === 'OTHER') {
    // Subs - must check BEFORE tops to avoid misclassification
    if (name.includes('b1-15') || name.includes('b112') || name.includes('b215') || 
        name.includes('sb') || name.includes('bass') ||
        name.includes('cd18') || name.includes('cd-18') || name.includes('cd 18') ||
        name.includes('nexo cd18') || name.includes('nexo cd-18') || name.includes('nexo cd 18') ||
        name.includes('subwoofer') || name.match(/\bsub\b/)) {
      return 'Subs';
    }
    // Tops/Speakers
    if (name.includes('arcs') || name.includes('kara') || name.includes('ks') || 
        name.includes('qsc') || name.includes('k12') || name.includes('k10') ||
        name.includes('srx') || name.includes('vrx') || name.includes('line array') ||
        name.includes('nexo') || name.includes('ps') || name.includes('geo') ||
        name.includes('eaw') || name.includes('kf650') || name.includes('kf-650') || name.includes('kf 650')) {
      return 'Tops';
    }
    // Wedges/Monitors
    if (name.includes('wedge') || name.includes('monitor') || name.includes('12m') || 
        name.includes('115xt')) {
      return 'Wedges';
    }
    // Mixers
    if (name.includes('mixer') || name.includes('m32') || name.includes('x32') || 
        name.includes('sq') || name.includes('console')) {
      return 'Mixers';
    }
    // Microphones
    if (name.includes('mic') || name.includes('sm58') || name.includes('sm57') || 
        name.includes('beta') || name.includes('shure')) {
      return 'Microphones';
    }
    // Amplifiers
    if (name.includes('amp') || name.includes('amplifier') || name.includes('power')) {
      return 'Amplifiers';
    }
  }
  
  // Lighting detection
  if (category === 'LIGHTING' || category === 'OTHER') {
    if (name.includes('uplight') || name.includes('par can') || name.includes('par64')) {
      return 'Uplights';
    }
    if (name.includes('moving head') || name.includes('beam') || name.includes('spot')) {
      return 'Moving Heads';
    }
    if (name.includes('strobe')) {
      return 'Strobes';
    }
    if (name.includes('hazer') || name.includes('haze') || name.includes('fog')) {
      return 'Hazers';
    }
  }
  
  // Generic subcategory matching
  for (const subcat of subcats) {
    const subcatLower = subcat.toLowerCase();
    if (name.includes(subcatLower)) {
      return subcat;
    }
  }
  
  // Default subcategory - use first one for AUDIO/LIGHTING to show items
  if (category === 'AUDIO') return 'Other Audio';
  if (category === 'LIGHTING') return 'Other Lighting';
  if (category === 'OTHER') return 'Other Audio'; // Assume OTHER items are audio for now
  
  return subcats[subcats.length - 1] || 'Other';
};

export default function PullSheetRedesign({ 
  pullSheet, 
  items, 
  onRefresh 
}: { 
  pullSheet: PullSheet;
  items: Item[];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'pullsheet' | 'scanhistory' | 'manifest'>('pullsheet');
  const [pullSheetWidth, setPullSheetWidth] = useState(50); // percentage
  const [lastScan, setLastScan] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [soundTheme, setSoundTheme] = useState<'ding' | 'voice'>('ding');
  const [userName, setUserName] = useState('User');
  const [userFullName, setUserFullName] = useState('User');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'completed' | 'not-scanned'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [substituteMode, setSubstituteMode] = useState(false);
  const [substituteItemId, setSubstituteItemId] = useState<string | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [lastTapItemId, setLastTapItemId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState({
    qty: 80,
    description: 300,
    notes: 200,
    barcode: 150
  });
  const [showScanPromptsConfig, setShowScanPromptsConfig] = useState(false);
  
  // Scan prompt settings
  const [scanPrompts, setScanPrompts] = useState({
    successMessage: 'Scan successful',
    errorMessage: 'Nope, try again',
    volume: 0.8,
    rate: 1.1,
    pitch: 1.2,
    enableSuccess: true,
    enableError: true
  });

  // Load saved scan prompt settings
  useEffect(() => {
    const savedPrompts = localStorage.getItem('scanPromptSettings');
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts);
        setScanPrompts(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load scan prompt settings:', e);
      }
    }
  }, []);

  // Get user info and fetch scan history
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔐 User data:', user);
      if (user?.email) {
        setUserName(user.email.split('@')[0]);
        
        // Try to get name from user metadata first
        let fullName = user.user_metadata?.full_name || 
                       user.user_metadata?.name ||
                       (user.user_metadata?.first_name && user.user_metadata?.last_name 
                         ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
                         : null);
        
        console.log('👤 User metadata fullName:', fullName);
        
        // If not in metadata, try profiles table
        if (!fullName) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, first_name, last_name')
            .eq('id', user.id)
            .maybeSingle();
          
          console.log('📋 Profile data:', profile, 'Error:', error);
          
          const profileData = profile as any;
          if (profileData?.full_name) {
            fullName = profileData.full_name;
          } else if (profileData?.first_name && profileData?.last_name) {
            fullName = `${profileData.first_name} ${profileData.last_name}`;
          }
        }
        
        const finalName = fullName || user.email.split('@')[0];
        console.log('✅ Final user name:', finalName);
        // Fallback to email username
        setUserFullName(finalName);
      }
    }
    
    async function fetchScanHistory() {
      const { data } = await supabase
        .from('pull_sheet_scans')
        .select(`
          *,
          inventory_items (
            name,
            barcode,
            category,
            gear_type,
            image_url
          )
        `)
        .eq('pull_sheet_id', pullSheet.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data && data.length > 0) {
        setScanHistory(data as any);
        // Set the most recent scan as lastScan if we don't have one
        setLastScan(data[0] as any);
      }
    }
    
    getUser();
    fetchScanHistory();
  }, [pullSheet.id]);

  // Calculate progress
  const totalRequested = items.reduce((sum, item) => sum + (item.qty_requested || 0), 0);
  const totalPulled = items.reduce((sum, item) => sum + (item.qty_pulled || 0), 0);
  const progress = totalRequested > 0 ? Math.round((totalPulled / totalRequested) * 100) : 0;

  console.log('🔢 Progress calculated:', { totalRequested, totalPulled, progress, itemsLength: items.length });

  // Check for completion whenever items change
  useEffect(() => {
    console.log('🔄 Completion useEffect triggered');
    
    const sessionKey = `pull-sheet-${pullSheet.id}-prompted`;
    
    // Don't prompt if already finalized
    if (pullSheet.status === 'finalized' || pullSheet.status === 'complete') {
      console.log('⏭️ Skipping finalize check - already', pullSheet.status);
      return;
    }
    
    const allComplete = items.length > 0 && items.every(item => 
      (item.qty_pulled || 0) >= (item.qty_requested || 0)
    );
    
    console.log('📊 Completion check:', {
      allComplete,
      progress,
      itemsLength: items.length,
      totalRequested,
      totalPulled
    });
    
    // Clear the prompted flag if not complete anymore
    if (!allComplete || progress < 100) {
      const wasPrompted = sessionStorage.getItem(sessionKey);
      if (wasPrompted) {
        console.log('🔄 Clearing prompted flag - not complete anymore');
        sessionStorage.removeItem(sessionKey);
      }
      return;
    }
    
    // If complete, check if we should prompt
    if (allComplete && progress === 100) {
      const hasPrompted = sessionStorage.getItem(sessionKey);
      console.log('✅ All complete! Session key:', sessionKey, 'Already prompted?', hasPrompted);
      console.log('👤 Current userFullName:', userFullName);
      
      // Don't prompt if we haven't loaded the user name yet
      if (userFullName === 'User') {
        console.log('⏳ Waiting for user name to load...');
        return;
      }
      
      if (!hasPrompted) {
        sessionStorage.setItem(sessionKey, 'true');
        setTimeout(() => {
          console.log('🔔 Showing finalize prompt for:', userFullName);
          if (confirm(`All items scanned! Ready to finalize pull sheet?\n\nCompleted by: ${userFullName}`)) {
            handleFinalize();
          }
        }, 500);
      }
    }
  }, [items, progress, pullSheet.id, pullSheet.status, userFullName, totalRequested, totalPulled]);

  // Filter items based on search and filter mode
  let filteredItems = items;
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(item => {
      const itemName = (item.inventory_items?.name || item.item_name || '').toLowerCase();
      const barcode = (item.inventory_items?.barcode || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      return itemName.includes(query) || barcode.includes(query) || notes.includes(query);
    });
  }
  
  if (filterMode === 'completed') {
    filteredItems = filteredItems.filter(item => (item.qty_pulled || 0) >= (item.qty_requested || 0));
  } else if (filterMode === 'not-scanned') {
    filteredItems = filteredItems.filter(item => (item.qty_pulled || 0) === 0);
  }

  // Group items by category and subcategory
  const groupedItems: Record<string, Record<string, Item[]>> = {};
  
  filteredItems.forEach(item => {
    // Get category from inventory_items or fallback to AUDIO (most common)
    let category = 'AUDIO';
    if (item.inventory_items?.category) {
      category = item.inventory_items.category.toUpperCase();
    }
    
    // Ensure category is in our CATEGORIES list
    if (!CATEGORIES.includes(category)) {
      category = 'AUDIO'; // Default to AUDIO instead of OTHER
    }
    
    // Use gear_type from database if available, otherwise try to detect from name
    const itemName = item.inventory_items?.name || item.item_name || 'Unknown Item';
    let subcategory = item.inventory_items?.gear_type || '';
    
    // If no gear_type in database, fall back to detection
    if (!subcategory) {
      subcategory = getSubcategory(itemName, category);
    }
    
    // Ensure subcategory exists in our list, or use default
    const categorySubcats = SUBCATEGORIES[category] || [];
    if (!categorySubcats.includes(subcategory)) {
      subcategory = categorySubcats[categorySubcats.length - 1] || 'Other';
    }
    
    if (!groupedItems[category]) {
      groupedItems[category] = {};
    }
    if (!groupedItems[category][subcategory]) {
      groupedItems[category][subcategory] = [];
    }
    groupedItems[category][subcategory].push(item);
  });

  const handleActivate = async () => {
    try {
      const { error } = await supabase
        .from('pull_sheets')
        .update({ status: 'active' } as any)
        .eq('id', pullSheet.id);
      
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to activate:', err);
      alert('Failed to activate pull sheet');
    }
  };

  // Check if pull sheet is complete and prompt to finalize
  const checkCompletion = () => {
    console.log('🔍 checkCompletion called');
    console.log('📋 Current pull sheet status:', pullSheet.status);
    
    // Don't prompt if already finalized
    if (pullSheet.status === 'finalized' || pullSheet.status === 'complete') {
      console.log('⏭️ Already finalized/complete');
      return;
    }
    
    const allComplete = items.length > 0 && items.every(item => {
      const complete = (item.qty_pulled || 0) >= (item.qty_requested || 0);
      console.log(`  Item "${item.item_name}": ${item.qty_pulled}/${item.qty_requested} - ${complete ? '✅' : '❌'}`);
      return complete;
    });
    
    console.log('📊 Completion status:', {
      allComplete,
      itemsLength: items.length,
      progress,
      totalRequested,
      totalPulled
    });
    
    if (allComplete && progress === 100) {
      const sessionKey = `pull-sheet-${pullSheet.id}-prompted`;
      const hasPrompted = sessionStorage.getItem(sessionKey);
      console.log('✅ All complete! Has prompted?', hasPrompted);
      
      if (!hasPrompted) {
        sessionStorage.setItem(sessionKey, 'true');
        setTimeout(() => {
          console.log('🔔 Showing finalize prompt');
          if (confirm(`All items scanned! Ready to finalize pull sheet?\n\nCompleted by: ${userFullName}`)) {
            handleFinalize();
          }
        }, 500);
      }
    }
  };

  const handleFinalize = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('pull_sheets')
        .update({ 
          status: 'finalized',
          finalized_by: userFullName,
          finalized_at: new Date().toISOString()
        } as any)
        .eq('id', pullSheet.id);
      
      if (error) throw error;
      onRefresh();
      alert('Pull sheet finalized successfully!');
    } catch (err) {
      console.error('Failed to finalize:', err);
      alert('Failed to finalize pull sheet');
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!confirm('Reopen this finalized pull sheet? This will change status back to active.')) {
      return;
    }
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('pull_sheets')
        .update({ 
          status: 'active',
          finalized_by: null,
          finalized_at: null
        } as any)
        .eq('id', pullSheet.id);
      
      if (error) throw error;
      
      // Clear the session storage prompt flag
      sessionStorage.removeItem(`pull-sheet-${pullSheet.id}-prompted`);
      
      onRefresh();
      alert('Pull sheet reopened successfully!');
    } catch (err) {
      console.error('Failed to reopen:', err);
      alert('Failed to reopen pull sheet');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQty = async (itemId: string, field: 'qty_requested' | 'qty_pulled', value: number) => {
    try {
      const { error } = await supabase
        .from('pull_sheet_items')
        .update({ [field]: value } as any)
        .eq('id', itemId);
      
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to update qty:', err);
    }
  };

  const handleUpdateNotes = async (itemId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('pull_sheet_items')
        .update({ notes } as any)
        .eq('id', itemId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  const handleUndoScan = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const currentPulled = item.qty_pulled || 0;
    if (currentPulled === 0) {
      alert('No scans to undo for this item');
      return;
    }

    if (!confirm(`Undo one scan for ${item.inventory_items?.name || item.item_name}?\n\nThis will reduce qty from ${currentPulled} to ${currentPulled - 1}`)) {
      return;
    }

    try {
      setSaving(true);
      
      // Reduce qty_pulled by 1
      const { error } = await supabase
        .from('pull_sheet_items')
        .update({ qty_pulled: currentPulled - 1 } as any)
        .eq('id', itemId);
      
      if (error) throw error;

      // Delete the most recent scan for this item
      if (item.inventory_item_id) {
        const { error: scanError } = await supabase
          .from('pull_sheet_item_scans')
          .delete()
          .eq('pull_sheet_id', pullSheet.id)
          .eq('pull_sheet_item_id', itemId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (scanError) console.warn('Failed to delete scan record:', scanError);
      }

      setSelectedItemId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to undo scan:', err);
      alert('Failed to undo scan');
    } finally {
      setSaving(false);
    }
  };

  const handleSubstitute = async (itemId: string) => {
    // Toggle substitute mode
    if (substituteMode && substituteItemId === itemId) {
      // Cancel substitute mode
      setSubstituteMode(false);
      setSubstituteItemId(null);
      setSelectedItemId(null);
    } else {
      // Enter substitute mode
      setSubstituteMode(true);
      setSubstituteItemId(itemId);
      setSelectedItemId(null);
    }
  };

  const handleForceScan = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Only allow force scan for quantity items (cables, adapters, etc)
    // Prevent for unique barcoded items like speakers
    const isQuantityItem = item.inventory_items?.is_quantity_item ?? false;
    if (!isQuantityItem) {
      // Play error sound for non-quantity items
      const { playReject } = await import('@/lib/utils/sounds');
      playReject(soundTheme);
      return;
    }

    const currentPulled = item.qty_pulled || 0;
    const newTotal = currentPulled + 1;

    try {
      setSaving(true);
      
      // Update qty_pulled
      const { error } = await supabase
        .from('pull_sheet_items')
        .update({ qty_pulled: newTotal } as any)
        .eq('id', itemId);
      
      if (error) throw error;

      // Play success sound
      const { playSuccess } = await import('@/lib/utils/sounds');
      playSuccess(soundTheme);

      setSelectedItemId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to force scan:', err);
      alert('Failed to add scan');
    } finally {
      setSaving(false);
    }
  };

  const handleItemClick = (itemId: string) => {
    // Don't allow clicks when finalized
    if (pullSheet.status === 'finalized' || pullSheet.status === 'complete') {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // milliseconds

    // Check for double tap
    if (lastTapItemId === itemId && (now - lastTapTime) < DOUBLE_TAP_DELAY) {
      // Double tap detected - force scan
      handleForceScan(itemId);
      setLastTapTime(0);
      setLastTapItemId(null);
    } else {
      // Single tap - toggle selection
      setSelectedItemId(selectedItemId === itemId ? null : itemId);
      setLastTapTime(now);
      setLastTapItemId(itemId);
    }
  };

  const handlePrintPDF = async () => {
    try {
      // First get the full pull sheet data to find job_id
      const { data: fullSheetData } = await supabase
        .from('pull_sheets')
        .select('job_id')
        .eq('id', pullSheet.id)
        .single();

      if (!fullSheetData || !(fullSheetData as any).job_id) {
        alert('No job associated with this pull sheet');
        return;
      }

      // Fetch complete data with joins for PDF generation
      const { data: jobData } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (
            name,
            phone,
            email
          ),
          venues (
            name,
            address,
            city,
            state,
            contact_phone
          )
        `)
        .eq('id', (fullSheetData as any).job_id)
        .single();

      const manifestData = {
        pullSheet: {
          id: pullSheet.id,
          name: pullSheet.name,
          scheduled_out_at: pullSheet.scheduled_out_at,
          expected_return_at: pullSheet.expected_return_at,
          notes: pullSheet.notes
        },
        job: jobData as any,
        client: (jobData as any)?.clients || null,
        items: items.map(item => ({
          item_name: item.item_name || 'Unknown',
          qty_requested: item.qty_requested || 0,
          qty_pulled: item.qty_pulled || 0,
          notes: item.notes,
          inventory_items: item.inventory_items ? {
            barcode: item.inventory_items.barcode,
            category: item.inventory_items.category
          } : null
        }))
      };

      generateManifestPDF(manifestData);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-zinc-900 flex flex-col">
      {/* Substitute Mode Banner */}
      {substituteMode && substituteItemId && (
        <div className="bg-blue-600 text-white px-6 py-3 text-center font-bold border-b-2 border-blue-700">
          SUBSTITUTE MODE: Scan item to replace {items.find(i => i.id === substituteItemId)?.inventory_items?.name || items.find(i => i.id === substituteItemId)?.item_name || 'Unknown'} - Click Substitute again to cancel
        </div>
      )}

      {/* Finalized Banner */}
      {(pullSheet.status === 'finalized' || pullSheet.status === 'complete') && (
        <div className="bg-red-600 text-white px-6 py-3 text-center font-bold border-b-2 border-red-700">
          FINALIZED BY {(pullSheet as any).finalized_by || 'Unknown'} ON {(pullSheet as any).finalized_at ? new Date((pullSheet as any).finalized_at).toLocaleString() : 'Unknown Date'}
        </div>
      )}
      
      {/* Pull Sheet Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-2 relative">
          {/* Left: Job Title with Border */}
          <div className="border-2 border-zinc-600 rounded px-4 py-2 bg-zinc-750">
            <h1 className="text-lg font-bold text-white">
              {pullSheet.jobs?.title || pullSheet.name}
              {pullSheet.jobs?.code && (
                <span className="text-sm text-zinc-400 ml-3">Job #{pullSheet.jobs.code}</span>
              )}
            </h1>
          </div>

          {/* Center: Progress Percentage - Fixed Position */}
          <div className="px-6 py-2 border-2 border-zinc-600 rounded-lg bg-zinc-800">
            <div className="text-2xl font-bold text-white tabular-nums">
              {progress}%
            </div>
          </div>

          {/* Right: Last Scan Header */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-zinc-600"></div>
            <div className="text-white font-semibold text-sm">Last Scan</div>
          </div>
        </div>

        {/* Blue Progress Bar */}
        <div className="h-3 bg-zinc-700">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 shadow-lg shadow-blue-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-t border-zinc-700">
          <div className="flex gap-2 px-6 py-2">
            <button
              onClick={() => setView('scanhistory')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'scanhistory' 
                  ? 'bg-amber-400 text-black' 
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              Scan History
            </button>
            <button
              onClick={() => setView('pullsheet')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'pullsheet' 
                  ? 'bg-amber-400 text-black' 
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              Pull Sheet
            </button>
            <button
              onClick={() => setView('manifest')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'manifest' 
                  ? 'bg-amber-400 text-black' 
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              Manifest
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Pull Sheet/Scan History/Manifest */}
        <div 
          className="overflow-y-auto overflow-x-hidden scrollbar-hide"
          style={{ width: `${pullSheetWidth}%` }}
        >
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          {/* Barcode Scanner or Reopen Button */}
          <div className="p-3 border-b border-zinc-700 bg-zinc-800">
            {(pullSheet.status === 'finalized' || pullSheet.status === 'complete') ? (
              <button
                onClick={handleReopen}
                disabled={saving}
                className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Reopen Pull Sheet
              </button>
            ) : (
              <BarcodeScanner
                pullSheetId={pullSheet.id}
                soundTheme={soundTheme}
                onScan={async (scan) => {
                  console.log('🔍 onScan called with:', scan);
                  
                  // If in substitute mode, handle substitute scan
                  if (substituteMode && substituteItemId && scan?.inventory_item_id) {
                    const scannedInventoryId = scan.inventory_item_id;
                    
                    // Find the item we're substituting
                    const substituteItem = items.find(i => i.id === substituteItemId);
                    if (!substituteItem) {
                      console.error('Original item not found');
                      alert('Original item not found');
                      setSubstituteMode(false);
                      setSubstituteItemId(null);
                      return;
                    }
                    
                    // Get the scanned inventory item details
                    const { data: scannedInvItem } = await supabase
                      .from('inventory_items')
                      .select('name')
                      .eq('id', scannedInventoryId)
                      .single();
                    
                    // Update the pull sheet item to use the scanned inventory item
                    const { error: updateError } = await supabase
                      .from('pull_sheet_items')
                      .update({
                        inventory_item_id: scannedInventoryId,
                        item_name: scannedInvItem?.name || 'Unknown',
                        notes: substituteItem.notes 
                          ? `${substituteItem.notes}\nSubstituted from ${substituteItem.item_name}`
                          : `Substituted from ${substituteItem.item_name}`
                      } as any)
                      .eq('id', substituteItemId);
                      
                    if (updateError) {
                      console.error('Substitute error:', updateError);
                      alert('Failed to substitute item');
                    } else {
                      // Play success sound
                      try {
                        const audio = new Audio('/success.mp3');
                        audio.play();
                      } catch (e) {
                        console.error('Sound error:', e);
                      }
                      
                      console.log(`✅ Substituted ${substituteItem.item_name} → ${(scannedInvItem as any)?.name || 'Unknown'}`);
                      alert(`Substituted ${substituteItem.item_name} → ${(scannedInvItem as any)?.name || 'Unknown'}`);
                      onRefresh();
                    }
                    
                    // Reset substitute mode
                    setSubstituteMode(false);
                    setSubstituteItemId(null);
                    setSelectedItemId(null);
                    return;
                  }
                  
                  // Normal scan processing - fetch the complete scan with inventory item details
                  if (scan?.id) {
                    const { data } = await supabase
                      .from('pull_sheet_scans')
                      .select('*, inventory_items(name, barcode, category, gear_type, image_url)')
                      .eq('id', scan.id)
                      .single();
                    
                    console.log('📦 Fetched scan data:', data);
                    if (data) {
                      setLastScan(data);
                      // Also add to scan history
                      setScanHistory(prev => [data as any, ...prev]);
                      console.log('✅ Set lastScan to:', data);
                    }
                  }
                  onRefresh();
                  
                  // Check if pull sheet is complete after scan
                  setTimeout(() => {
                    checkCompletion();
                  }, 1000);
                }}
              />
            )}
          </div>

          {view === 'pullsheet' && (
            <div className="flex flex-col h-full">
              {/* Search, Filter, and Refresh Controls */}
              <div className="p-3 border-b border-zinc-700 bg-zinc-800 flex items-center gap-3">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items, barcodes, notes..."
                    className="w-full px-3 py-2 pr-8 bg-zinc-900 border border-zinc-600 rounded text-white text-sm focus:border-amber-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Filter Dropdown */}
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-600 rounded text-white text-sm focus:border-amber-400 focus:outline-none"
                >
                  <option value="all">Show All</option>
                  <option value="completed">Completed Only</option>
                  <option value="not-scanned">Not Scanned</option>
                </select>
                
                {/* Refresh Button */}
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm font-medium transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {CATEGORIES.map(category => {
                const categorySubcats = groupedItems[category] || {};
                const subcatKeys = Object.keys(categorySubcats);
                if (subcatKeys.length === 0) return null;

                // Count total items in category
                const totalCategoryItems = subcatKeys.reduce((sum, subcat) => sum + categorySubcats[subcat].length, 0);

                return (
                  <div key={category} className="bg-zinc-800 border-2 border-zinc-700 rounded-lg overflow-hidden">
                    {/* Main Category Header */}
                    <div className="bg-gradient-to-r from-zinc-700 to-zinc-600 px-6 py-3 border-b-2 border-zinc-600">
                      <h2 className="text-xl font-bold text-white">
                        {category}
                        <span className="ml-3 text-sm font-normal text-zinc-300">
                          ({totalCategoryItems} items)
                        </span>
                      </h2>
                    </div>

                    {/* Subcategories */}
                    {subcatKeys.map(subcategory => {
                      const subcatItems = categorySubcats[subcategory] || [];
                      
                      return (
                        <div key={subcategory} className="border-b border-zinc-700 last:border-b-0">
                          {/* Subcategory Header */}
                          <div className="bg-zinc-750 px-6 py-2 border-b border-zinc-600">
                            <h3 className="text-md font-semibold text-amber-400">
                              {subcategory}
                              <span className="ml-2 text-xs font-normal text-zinc-400">
                                ({subcatItems.length})
                              </span>
                            </h3>
                          </div>

                          {/* Items Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead className="bg-zinc-800 border-b-2 border-zinc-600">
                                <tr className="text-left">
                                  <th 
                                    className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-r border-zinc-600 relative"
                                    style={{ width: `${columnWidths.qty}px` }}
                                  >
                                    QTY
                                    <div
                                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-400 group"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const startX = e.clientX;
                                        const startWidth = columnWidths.qty;
                                        const handleMouseMove = (e: MouseEvent) => {
                                          const delta = e.clientX - startX;
                                          setColumnWidths(prev => ({ ...prev, qty: Math.max(50, startWidth + delta) }));
                                        };
                                        const handleMouseUp = () => {
                                          document.removeEventListener('mousemove', handleMouseMove);
                                          document.removeEventListener('mouseup', handleMouseUp);
                                        };
                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                      }}
                                    />
                                  </th>
                                  <th 
                                    className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-r border-zinc-600 relative"
                                    style={{ width: `${columnWidths.description}px` }}
                                  >
                                    DESCRIPTION
                                    <div
                                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-400"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const startX = e.clientX;
                                        const startWidth = columnWidths.description;
                                        const handleMouseMove = (e: MouseEvent) => {
                                          const delta = e.clientX - startX;
                                          setColumnWidths(prev => ({ ...prev, description: Math.max(100, startWidth + delta) }));
                                        };
                                        const handleMouseUp = () => {
                                          document.removeEventListener('mousemove', handleMouseMove);
                                          document.removeEventListener('mouseup', handleMouseUp);
                                        };
                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                      }}
                                    />
                                  </th>
                                  <th 
                                    className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-r border-zinc-600 relative"
                                    style={{ width: `${columnWidths.notes}px` }}
                                  >
                                    NOTES
                                    <div
                                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-400"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const startX = e.clientX;
                                        const startWidth = columnWidths.notes;
                                        const handleMouseMove = (e: MouseEvent) => {
                                          const delta = e.clientX - startX;
                                          setColumnWidths(prev => ({ ...prev, notes: Math.max(100, startWidth + delta) }));
                                        };
                                        const handleMouseUp = () => {
                                          document.removeEventListener('mousemove', handleMouseMove);
                                          document.removeEventListener('mouseup', handleMouseUp);
                                        };
                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                      }}
                                    />
                                  </th>
                                  <th 
                                    className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase"
                                    style={{ width: `${columnWidths.barcode}px` }}
                                  >
                                    BARCODE
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-700">
                                {subcatItems.map((item: Item) => {
                                  const itemName = item.inventory_items?.name || item.item_name || 'Unknown Item';
                                  const barcode = item.inventory_items?.barcode || '';
                                  const pulled = item.qty_pulled || 0;
                                  const requested = item.qty_requested || 0;
                                  const isPrepComplete = pulled >= requested;
                                  const isSelected = selectedItemId === item.id;

                                  const isFinalized = pullSheet.status === 'finalized' || pullSheet.status === 'complete';

                                  return (
                                    <tr 
                                      key={item.id} 
                                      onClick={() => handleItemClick(item.id)}
                                      className={`transition-colors ${
                                        isFinalized 
                                          ? 'cursor-not-allowed opacity-75' 
                                          : 'cursor-pointer hover:bg-zinc-800/50'
                                      } ${
                                        isSelected 
                                          ? 'bg-amber-500/20 border-l-4 border-amber-400' 
                                          : ''
                                      }`}
                                    >
                                      <td 
                                        className="px-4 py-3 border-r border-zinc-700"
                                        style={{ width: `${columnWidths.qty}px` }}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1 text-sm font-mono">
                                            <span className={pulled >= requested ? 'text-green-400 font-bold' : 'text-white font-bold'}>{pulled}</span>
                                            <span className="text-zinc-500">/</span>
                                            <span className="text-zinc-400">{requested}</span>
                                          </div>
                                          {isSelected && !isFinalized && (
                                            <div className="flex gap-1">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUndoScan(item.id);
                                                }}
                                                disabled={saving || (pulled === 0) || isFinalized}
                                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Undo last scan"
                                              >
                                                ↶ Undo
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSubstitute(item.id);
                                                }}
                                                disabled={saving || isFinalized}
                                                className={`px-2 py-1 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                                                  substituteMode && substituteItemId === item.id
                                                    ? 'bg-amber-500 hover:bg-amber-600 ring-2 ring-amber-300'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                                }`}
                                                title={substituteMode && substituteItemId === item.id 
                                                  ? "Substitute mode active - scan to replace" 
                                                  : "Substitute with different item"}
                                              >
                                                ⇄ Sub
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td 
                                        className="px-4 py-3 border-r border-zinc-700"
                                        style={{ width: `${columnWidths.description}px` }}
                                      >
                                        <div className="text-white font-medium">{itemName}</div>
                                      </td>
                                      <td 
                                        className="px-4 py-3 border-r border-zinc-700"
                                        style={{ width: `${columnWidths.notes}px` }}
                                      >
                                        <input
                                          type="text"
                                          value={item.notes || ''}
                                          onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="Add notes..."
                                          disabled={pullSheet.status === 'finalized' || pullSheet.status === 'complete'}
                                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-white text-xs focus:border-amber-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                      </td>
                                      <td 
                                        className="px-4 py-3"
                                        style={{ width: `${columnWidths.barcode}px` }}
                                      >
                                        <div className="text-xs text-zinc-400 font-mono">{barcode || '-'}</div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {view === 'scanhistory' && (
            <div className="p-4 space-y-2">
              {scanHistory.length === 0 ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Scan History</h3>
                  <p className="text-zinc-400 text-sm">No scans yet</p>
                </div>
              ) : (
                scanHistory.map((scan: any) => (
                  <div key={scan.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {/* Image */}
                      <div className="w-16 h-16 bg-zinc-700 rounded flex-shrink-0 overflow-hidden">
                        {scan.inventory_items?.image_url ? (
                          <img 
                            src={scan.inventory_items.image_url} 
                            alt={scan.inventory_items?.name || 'Item'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                            No img
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1">
                        <div className="font-semibold text-white">
                          {scan.inventory_items?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono mt-1">
                          {scan.barcode || 'No barcode'}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(scan.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      {/* Scan Type Badge */}
                      <div className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-semibold">
                        {scan.scan_type || 'SCAN'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'manifest' && (
            <div className="p-4 space-y-4">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Pull Sheet Manifest</h3>
                  <div className="text-sm text-zinc-400">
                    Job: {pullSheet.jobs?.code || 'N/A'}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-zinc-400 text-sm text-center py-8">No items on this pull sheet</p>
                  ) : (
                    items.map(item => {
                      const itemName = item.inventory_items?.name || item.item_name || 'Unknown Item';
                      const barcode = item.inventory_items?.barcode || '';
                      const pulled = item.qty_pulled || 0;
                      const requested = item.qty_requested || 0;
                      const isComplete = pulled >= requested;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            isComplete 
                              ? 'bg-green-500/10 border-green-500/50' 
                              : 'bg-zinc-750 border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-white text-lg">{itemName}</div>
                              <div className="text-xs text-zinc-400 font-mono mt-1">{barcode || 'No barcode'}</div>
                              {item.notes && (
                                <div className="text-sm text-amber-400 mt-2">
                                  📝 {item.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm text-zinc-400">Quantity</div>
                                <div className="text-2xl font-bold font-mono">
                                  <span className={isComplete ? 'text-green-400' : 'text-white'}>{pulled}</span>
                                  <span className="text-zinc-500">/</span>
                                  <span className="text-zinc-400">{requested}</span>
                                </div>
                              </div>
                              {isComplete && (
                                <div className="text-green-400 text-2xl">✓</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-zinc-700">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-zinc-400">
                      Total Items: {items.length}
                    </div>
                    <div className="text-sm text-zinc-400">
                      Scanned: {items.filter(i => (i.qty_pulled || 0) > 0).length} / {items.length}
                    </div>
                    <div className="text-sm text-zinc-400">
                      Progress: {progress}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resize Divider */}
        <div 
          className="w-px bg-zinc-600 hover:bg-amber-400 cursor-col-resize transition-colors relative group"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = pullSheetWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const delta = e.clientX - startX;
              const newWidth = Math.max(30, Math.min(70, startWidth + (delta / window.innerWidth) * 100));
              setPullSheetWidth(newWidth);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          {/* Invisible wider hit area for easier dragging */}
          <div className="absolute inset-y-0 -left-1 -right-1 w-2"></div>
          <div className="w-1 h-12 bg-zinc-500 group-hover:bg-amber-300 rounded-full"></div>
        </div>

        {/* Right Panel: Last Scan + Actions */}
        <div className="flex-1 flex flex-col">
          {/* Last Scan Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
              {lastScan ? (
                <div className="space-y-4">
                  {/* Item Image */}
                  <div className="w-full aspect-square bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {lastScan.inventory_items?.image_url ? (
                      <img 
                        src={lastScan.inventory_items.image_url} 
                        alt={lastScan.inventory_items?.name || 'Item'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-zinc-500">
                        <div className="text-sm">No Image Available</div>
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Item</div>
                    <div className="text-lg font-semibold text-white">
                      {lastScan.inventory_items?.name || 'Unknown'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Barcode</div>
                    <div className="text-sm font-mono text-white">
                      {lastScan.barcode || '-'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Location</div>
                    <div className="text-lg font-semibold text-white">{pullSheet.jobs?.title || 'On Job'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Scanned</div>
                    <div className="text-sm text-zinc-300">
                      {lastScan.created_at ? new Date(lastScan.created_at).toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500 py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <div>No scans yet</div>
                  <div className="text-sm mt-2">Scan an item to see details</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Column */}
          <div className="p-6 space-y-3 border-t border-zinc-700">
            <button
              onClick={() => router.push(`/app/jobs/${pullSheet.jobs?.code || ''}`)}
              className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors"
            >
              View Job
            </button>
            <button
              onClick={handlePrintPDF}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              📄 Print Manifest PDF
            </button>
            <button
              className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors"
            >
              Share
            </button>
            <button
              onClick={onRefresh}
              className="w-full px-4 py-3 bg-amber-400 text-black rounded-lg font-semibold hover:bg-amber-500 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Footer - Simplified */}
      <div className="bg-zinc-800 border-t border-zinc-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600 flex items-center gap-2"
          >
            ← Back
          </button>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Sound Theme:</span>
            <button
              onClick={() => setSoundTheme(soundTheme === 'ding' ? 'voice' : 'ding')}
              className="px-3 py-1 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
            >
              {soundTheme === 'ding' ? '🔔 Ding' : '🗣️ Voice'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Scan Prompts:</span>
            <button 
              onClick={() => setShowScanPromptsConfig(true)}
              className="px-3 py-1 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
            >
              Configure
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Scan Prompts Configuration Modal */}
      {showScanPromptsConfig && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Scan Prompt Settings</h2>
            
            <div className="space-y-4">
              {/* Success Message */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Success Message</label>
                <input
                  type="text"
                  value={scanPrompts.successMessage}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, successMessage: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-zinc-500"
                  placeholder="Scan successful"
                />
              </div>

              {/* Error Message */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Error Message</label>
                <input
                  type="text"
                  value={scanPrompts.errorMessage}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, errorMessage: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-zinc-500"
                  placeholder="Nope, try again"
                />
              </div>

              {/* Volume */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Volume: {Math.round(scanPrompts.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={scanPrompts.volume}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Rate/Speed */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Speed: {scanPrompts.rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={scanPrompts.rate}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Pitch */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Pitch: {scanPrompts.pitch.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={scanPrompts.pitch}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Enable Toggles */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={scanPrompts.enableSuccess}
                    onChange={(e) => setScanPrompts(prev => ({ ...prev, enableSuccess: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Enable success sounds
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={scanPrompts.enableError}
                    onChange={(e) => setScanPrompts(prev => ({ ...prev, enableError: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Enable error sounds
                </label>
              </div>

              {/* Preview Button */}
              <button
                onClick={() => {
                  if (soundTheme === 'voice') {
                    try {
                      const utterance = new SpeechSynthesisUtterance(scanPrompts.successMessage);
                      const voices = speechSynthesis.getVoices();
                      const femaleVoice = voices.find(voice => 
                        voice.name.toLowerCase().includes('female') || 
                        voice.name.toLowerCase().includes('woman') ||
                        voice.name.toLowerCase().includes('samantha') ||
                        voice.name.toLowerCase().includes('victoria') ||
                        voice.name.toLowerCase().includes('zira')
                      );
                      if (femaleVoice) utterance.voice = femaleVoice;
                      utterance.rate = scanPrompts.rate;
                      utterance.pitch = scanPrompts.pitch;
                      utterance.volume = scanPrompts.volume;
                      speechSynthesis.speak(utterance);
                    } catch (e) {
                      console.error('Voice synthesis failed:', e);
                    }
                  }
                }}
                className="w-full px-4 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
              >
                Test Success Sound
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  localStorage.setItem('scanPromptSettings', JSON.stringify(scanPrompts));
                  setShowScanPromptsConfig(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
              >
                Save
              </button>
              <button
                onClick={() => setShowScanPromptsConfig(false)}
                className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
