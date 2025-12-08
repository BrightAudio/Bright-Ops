import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, speakerType, selectedTypes, driver, drivers, availableParts, blueprintResearch, driverAnalysis } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    let prompt = '';
    let systemPrompt = 'You are an expert speaker cabinet designer with deep knowledge of acoustics, Thiele-Small parameters, cabinet design, and professional audio engineering.';

    if (task === 'research') {
      // Search for blueprints and DIY designs using the selected drivers
      const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
      const googleSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
      
      let blueprintInfo = '';
      
      if (googleApiKey && googleSearchEngineId && drivers && drivers.length > 0) {
        try {
          const driverNames = drivers.map((d: any) => d.name).join(' ');
          const allTypes = [speakerType, ...(selectedTypes || [])];
          const typesStr = allTypes.map(t => t.replace(/_/g, ' ')).join(' ');
          const searchQuery = `${driverNames} ${typesStr} speaker cabinet blueprint DIY plans schematic`;
          const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=5`;
          
          const searchResponse = await fetch(searchUrl);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData.items?.slice(0, 5).map((item: any) => 
              `${item.title}\n${item.link}\n${item.snippet}`
            ).join('\n\n') || '';
            
            if (results) {
              blueprintInfo = `\n\nBlueprint Search Results:\n${results}`;
            }
          }
        } catch (searchErr) {
          console.warn('Google search for blueprints failed, continuing without web results:', searchErr);
        }
      }

      const allTypes = [speakerType, ...(selectedTypes || [])];
      const typesStr = allTypes.map(t => t.replace(/_/g, ' ')).join(' + ');
      
      prompt = `Find open-source, DIY, or official blueprints for ${typesStr} speaker cabinets using these drivers:
${drivers?.map((d: any) => `- ${d.name} (${d.type})`).join('\n') || 'No specific drivers'}

Based on the web search results below, provide:
1. Specific DIY or commercial cabinet designs that use these exact drivers or similar drivers
2. Links to blueprints, schematics, or build guides (if found in search results)
3. Cabinet dimensions and internal volume from found designs
4. Port specifications from found designs
5. Materials lists and construction notes
6. Any modifications needed to adapt designs for the selected drivers
7. Similar professional speakers that use these drivers

${blueprintInfo}

If no exact matches found, suggest the closest alternative designs and explain what modifications would be needed.`;
    } else if (task === 'analyze_driver') {
      // First, search for the driver specifications online
      const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
      const googleSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
      
      let driverInfo = '';
      
      if (googleApiKey && googleSearchEngineId) {
        try {
          const searchQuery = `${driver.name} speaker driver specifications thiele small parameters`;
          const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=5`;
          
          const searchResponse = await fetch(searchUrl);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData.items?.slice(0, 3).map((item: any) => 
              `${item.title}\n${item.snippet}`
            ).join('\n\n') || '';
            
            if (results) {
              driverInfo = `\n\nWeb Search Results for ${driver.name}:\n${results}`;
            }
          }
        } catch (searchErr) {
          console.warn('Google search failed, continuing without web results:', searchErr);
        }
      }

      prompt = `First, identify the specific driver model and find its exact specifications.

Driver Name: ${driver.name}
Type: ${driver.subcategory || driver.type || 'Unknown'}
Specifications from database: ${JSON.stringify(driver.specs || {})}
${driverInfo}

Based on the driver name and any web search results above, identify:
1. Exact manufacturer and model number
2. Full Thiele-Small parameters (Fs, Qts, Qes, Qms, Vas, Re, Le, BL, Sd, Xmax, Pe)
3. Physical specifications (diameter, mounting depth, weight)
4. Frequency response and sensitivity

Then provide cabinet design recommendations:
1. Suitable cabinet types for this specific driver
2. Recommended cabinet volume (calculate using Thiele-Small parameters)
3. Port dimensions if applicable (with tuning frequency calculations)
4. Crossover recommendations
5. Examples of commercial cabinets using this exact driver or similar drivers

Be specific with calculations and measurements. If you cannot find the exact driver, clearly state what information is missing.`;
    } else if (task === 'generate_design') {
      const driverList = drivers.map((d: any) => `${d.name} (${d.subcategory || 'Unknown'})`).join(', ');
      const allTypes = [speakerType, ...(selectedTypes || [])];
      const typesStr = allTypes.map(t => t.replace(/_/g, ' ')).join(' + ');
      
      // Include research context if available
      let researchContext = '';
      if (blueprintResearch) {
        researchContext += `\n\n=== BLUEPRINT RESEARCH ===\n${blueprintResearch}\n`;
      }
      if (driverAnalysis && driverAnalysis.length > 0) {
        researchContext += `\n\n=== DRIVER ANALYSIS ===\n`;
        driverAnalysis.forEach((analysis: any) => {
          researchContext += `\n${analysis.driverName}:\n${analysis.analysis}\n`;
        });
      }
      
      prompt = `Design a ${typesStr} speaker cabinet using these drivers:
${driverList}
${researchContext ? `\nIMPORTANT - Use this research data to inform your design:\n${researchContext}` : ''}

Generate a complete design with:

1. CABINET DIMENSIONS (in mm):
   - Width, Height, Depth
   - Internal volume in liters
   - Wall thickness recommendation

2. PORT SPECIFICATIONS (if ported):
   - Diameter in mm
   - Length in mm
   - Tuning frequency in Hz
   - Use formula: f = (c / 2π) * sqrt(A / (V * L)) where c=343m/s

3. WOOD CUT LIST:
   - List each panel with dimensions (e.g., "Front panel: 400mm x 600mm x 18mm")
   - Include material type (Baltic birch, MDF, etc.)

4. STEEL BRACING:
   - List internal bracing pieces with dimensions
   - Pattern description

5. DAMPENING:
   - Type and amount needed (fiberglass, acoustic foam, etc.)
   - Placement recommendations

6. CROSSOVER (if passive):
   - Component values
   - Crossover frequency
   - Topology (2-way, 3-way, etc.)

7. AMP PLATE (if active):
   - Recommended wattage per driver
   - Suggested models or specifications
   - DSP requirements

8. AVAILABLE PARTS:
${availableParts?.slice(0, 10).map((p: any) => `   - ${p.name} (${p.subcategory})`).join('\n') || '   None'}

Format the response as JSON with these exact keys:
{
  "cabinetDimensions": { "width": 0, "height": 0, "depth": 0, "volume": 0 },
  "portSpecs": { "diameter": 0, "length": 0, "tuning": 0 },
  "materials": {
    "woodCutList": [],
    "steelBracing": [],
    "dampening": "",
    "crossover": "",
    "ampPlate": ""
  },
  "availableParts": [],
  "analysis": ""
}`;
    } else if (task === 'generate_blueprint') {
      const { currentDesign } = body;
      
      if (!currentDesign || !currentDesign.cabinetDimensions) {
        return NextResponse.json(
          { error: 'No design available to generate blueprint from' },
          { status: 400 }
        );
      }

      const allTypes = [speakerType, ...(selectedTypes || [])];
      const typesStr = allTypes.map(t => t.replace(/_/g, ' ')).join(' + ');
      
      prompt = `Generate a detailed manufacturing blueprint for this ${typesStr} speaker cabinet design:

CURRENT DESIGN SPECIFICATIONS:
- Cabinet: ${currentDesign.cabinetDimensions.width}mm W x ${currentDesign.cabinetDimensions.height}mm H x ${currentDesign.cabinetDimensions.depth}mm D
- Volume: ${currentDesign.cabinetDimensions.volume}L
${currentDesign.portSpecs ? `- Port: ${currentDesign.portSpecs.diameter}mm diameter x ${currentDesign.portSpecs.length}mm length, tuned to ${currentDesign.portSpecs.tuning}Hz` : ''}
- Drivers: ${drivers?.map((d: any) => d.name).join(', ')}

Generate a complete manufacturing blueprint with:

1. WOOD CUTTING SCHEDULE - Array of panels with:
   - Panel name (Front Panel, Back Panel, Top, Bottom, Left Side, Right Side, Internal Baffles)
   - Exact dimensions in mm (width, height, thickness)
   - Material type (18mm Baltic Birch, 25mm MDF, etc.)
   - Quantity needed
   - Cutouts required (driver holes with diameter and position, port holes, amp plate cutout, etc.)

2. STEEL CUTTING SCHEDULE - Array of steel bracing pieces with:
   - Piece name/purpose (Horizontal Brace, Vertical Stiffener, Corner Reinforcement)
   - Type (angle iron, square tubing, flat bar with dimensions)
   - Length in mm
   - Quantity needed
   - Mounting position description

3. INTERNAL BRACING DESIGN with:
   - Bracing pattern description (cross-bracing, ladder bracing, window bracing, etc.)
   - Exact positions for each brace (distance from bottom, left, etc.)
   - Assembly sequence/instructions
   - Fastening recommendations (screws, glue, welding)

4. ASSEMBLY NOTES:
   - Critical measurements and tolerances
   - Gluing/fastening sequence
   - Sealing requirements
   - Driver mounting details
   - Port installation notes
   - Finishing recommendations

Format as JSON with these exact keys:
{
  "woodCuts": [
    {
      "name": "Front Panel",
      "width": 400,
      "height": 600,
      "thickness": 18,
      "material": "18mm Baltic Birch",
      "quantity": 1,
      "cutouts": [
        { "type": "driver_hole", "diameter": 380, "position": "center" }
      ]
    }
  ],
  "steelCuts": [
    {
      "name": "Horizontal Brace",
      "type": "50x50x3mm square tubing",
      "length": 350,
      "quantity": 2,
      "purpose": "Mid-cabinet horizontal stiffener"
    }
  ],
  "bracingDesign": {
    "pattern": "Cross-bracing with horizontal and vertical stiffeners",
    "positions": [
      { "location": "Horizontal center brace", "distance": "300mm from bottom" }
    ],
    "instructions": [
      "Install horizontal braces first",
      "Add vertical stiffeners",
      "Secure with wood glue and screws"
    ]
  },
  "assemblyNotes": [
    "Use wood glue on all joints",
    "Pre-drill all screw holes",
    "Seal all internal seams with silicone"
  ]
}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use same cost-effective model as other endpoints
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'AI request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    // Try to parse JSON if it's a generate_design or generate_blueprint task
    if (task === 'generate_design' || task === 'generate_blueprint') {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (task === 'generate_blueprint') {
            return NextResponse.json({ 
              blueprint: parsed,
              response: 'Manufacturing blueprint generated successfully!'
            });
          }
          return NextResponse.json(parsed);
        }
      } catch (e) {
        console.warn('Could not parse JSON from AI response, returning raw text');
      }
    }

    return NextResponse.json({ analysis: aiResponse });

  } catch (error) {
    console.error('Speaker research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
