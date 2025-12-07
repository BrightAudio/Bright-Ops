import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, speakerType, driver, drivers, availableParts } = body;

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
      prompt = `Research and provide detailed information about ${speakerType.replace(/_/g, ' ')} speaker designs. Include:
1. Typical cabinet dimensions and internal volume
2. Common driver configurations
3. Port tuning frequencies and dimensions
4. Internal bracing patterns
5. Recommended materials and dampening
6. Professional examples from brands like JBL, d&b, L-Acoustics, Meyer Sound
7. Key acoustic principles for this speaker type

Provide specific measurements and formulas where applicable.`;
    } else if (task === 'analyze_driver') {
      prompt = `Analyze this speaker driver for cabinet design:
Driver: ${driver.name}
Type: ${driver.subcategory || driver.type || 'Unknown'}
Specifications: ${JSON.stringify(driver.specs || {})}

Provide:
1. Suitable cabinet types for this driver
2. Recommended cabinet volume (using Thiele-Small if specs available)
3. Port dimensions if applicable
4. Crossover recommendations
5. Examples of commercial cabinets using similar drivers

Be specific with calculations and measurements.`;
    } else if (task === 'generate_design') {
      const driverList = drivers.map((d: any) => `${d.name} (${d.subcategory || 'Unknown'})`).join(', ');
      
      prompt = `Design a ${speakerType.replace(/_/g, ' ')} speaker cabinet using these drivers:
${driverList}

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

    // Try to parse JSON if it's a generate_design task
    if (task === 'generate_design') {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
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
