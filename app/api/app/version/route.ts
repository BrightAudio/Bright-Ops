import { NextResponse } from 'next/server';

/**
 * GET /api/app/version
 * 
 * Returns version policy for desktop app auto-updates and enforcement.
 * 
 * Used by electron-updater to:
 * 1. Check if current version requires an update
 * 2. Enforce minimum version (disable paid actions for old versions)
 * 3. Get latest available version
 */
export async function GET() {
  try {
    // TODO: Later, load these from a Supabase table: app_version_policy
    // For now: hardcoded values for testing
    // 
    // In production, you'll want:
    // 1. A Supabase table: app_version_policy(id, min_version, latest_version, force_update, created_at)
    // 2. An admin panel to update these values without redeploying
    // 3. Caching with appropriate TTL

    const versionPolicy = {
      min_version: '0.1.0', // Current minimum version - old builds below this lose sync/create access
      latest_version: '0.1.0', // Latest available version - auto-updater checks for this
      force_update: false, // If true, user cannot dismiss update prompt
    };

    return NextResponse.json(versionPolicy, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour on CDN
      },
    });
  } catch (error) {
    console.error('Error fetching version policy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version policy' },
      { status: 500 }
    );
  }
}
