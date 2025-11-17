import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // Define rental rates based on speaker type
    // Maps to actual category names in the database
    const rentalRules = [
      {
        name: 'L Acoustics speakers',
        dailyRate: 150,
        categories: [],
        patterns: ['l acoustics', 'la8', 'la12', 'kyara', 'kara'],
      },
      {
        name: 'Subs',
        dailyRate: 100,
        categories: ['subs'],
        patterns: [],
      },
      {
        name: 'Tops',
        dailyRate: 100,
        categories: ['tops'],
        patterns: [],
      },
      {
        name: 'Monitor Wedges & Monitors',
        dailyRate: 75,
        categories: ['monitor_wedges'],
        patterns: ['monitor', 'wedge'],
      },
      {
        name: 'Column Speakers',
        dailyRate: 75,
        categories: ['column_speakers'],
        patterns: [],
      },
    ];

    let totalUpdated = 0;
    const results = [];

    // First pass: Update by category (highest priority)
    for (const rule of rentalRules) {
      if (rule.categories.length === 0) continue; // Skip rules with no category

      // Get items by category
      const { data: items, error: selectError } = await supabase
        .from('inventory_items')
        .select('id, name, category, rental_cost_daily')
        .in('category', rule.categories);

      if (selectError) {
        return NextResponse.json(
          { error: `Failed to fetch items: ${selectError.message}` },
          { status: 500 }
        );
      }

      // Filter by patterns if specified
      let matchingItems = items || [];
      if (rule.patterns.length > 0) {
        matchingItems = matchingItems.filter((item: any) => {
          const nameLower = item.name.toLowerCase();
          return rule.patterns.some((pattern) =>
            nameLower.includes(pattern.toLowerCase())
          );
        });
      }

      // Update rental costs
      if (matchingItems.length > 0) {
        const itemIds = matchingItems.map((i: any) => i.id);

        const updatePayload: any = {
          rental_cost_daily: rule.dailyRate,
          rental_cost_weekly: rule.dailyRate * 5,
        };

        const { error: updateError } = await (supabase as any)
          .from('inventory_items')
          .update(updatePayload)
          .in('id', itemIds);

        if (updateError) {
          return NextResponse.json(
            { error: `Failed to update ${rule.name}: ${updateError.message}` },
            { status: 500 }
          );
        }

        totalUpdated += matchingItems.length;
        results.push({
          category: rule.name,
          dailyRate: rule.dailyRate,
          weeklyRate: rule.dailyRate * 5,
          count: matchingItems.length,
          speakers: matchingItems.map((s: any) => s.name),
        });
      }
    }

    // Second pass: Update L Acoustics by name pattern (overrides category)
    const laRule = rentalRules[0];
    const { data: allItems, error: allError } = await supabase
      .from('inventory_items')
      .select('id, name, category, rental_cost_daily');

    if (allError) {
      return NextResponse.json(
        { error: `Failed to fetch items: ${allError.message}` },
        { status: 500 }
      );
    }

    const laItems = (allItems || []).filter((item: any) => {
      const nameLower = item.name.toLowerCase();
      return laRule.patterns.some((pattern) =>
        nameLower.includes(pattern.toLowerCase())
      );
    });

    if (laItems.length > 0) {
      const laItemIds = laItems.map((i: any) => i.id);

      const updatePayload: any = {
        rental_cost_daily: laRule.dailyRate,
        rental_cost_weekly: laRule.dailyRate * 5,
      };

      const { error: updateError } = await (supabase as any)
        .from('inventory_items')
        .update(updatePayload)
        .in('id', laItemIds);

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update L Acoustics: ${updateError.message}` },
          { status: 500 }
        );
      }

      // Check if this was already counted
      const existingLAResult = results.find(
        (r) => r.category === laRule.name
      );
      if (existingLAResult) {
        existingLAResult.count = laItems.length;
        existingLAResult.speakers = laItems.map((s: any) => s.name);
      } else {
        totalUpdated += laItems.length;
        results.push({
          category: laRule.name,
          dailyRate: laRule.dailyRate,
          weeklyRate: laRule.dailyRate * 5,
          count: laItems.length,
          speakers: laItems.map((s: any) => s.name),
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        totalUpdated,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
