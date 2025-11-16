import { NextRequest, NextResponse } from 'next/server';

// Mock data generator - generates realistic fake leads instantly
export async function POST(request: NextRequest) {
  try {
    const { city, state } = await request.json();

    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }

    console.log(`🎭 Generating mock leads for ${city}, ${state}`);

    // First names
    const firstNames = [
      'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'James', 'Jessica', 'Robert',
      'Amanda', 'Christopher', 'Lisa', 'Daniel', 'Michelle', 'Matthew', 'Lauren',
      'Andrew', 'Rachel', 'Joseph', 'Maria', 'Thomas', 'Karen', 'Charles', 'Nancy'
    ];

    // Last names
    const lastNames = [
      'Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
      'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
    ];

    // Job titles for events
    const jobTitles = [
      'Event Coordinator', 'Venue Manager', 'Events Director', 'Event Planner',
      'Operations Manager', 'Sales Manager', 'Facility Manager', 'Banquet Manager',
      'Wedding Coordinator', 'Corporate Events Manager', 'Entertainment Director',
      'Special Events Manager', 'Meetings Manager', 'Catering Manager', 'Marketing Manager'
    ];

    // Venues and organizations
    const venues = [
      'Grand Ballroom Events', 'Riverside Event Center', 'Downtown Convention Hall',
      'The Elegant Manor', 'Heritage Banquet Halls', 'Metropolitan Event Spaces',
      'Luxury Weddings & Events', 'City Venue Productions', 'Premier Event Solutions',
      'Signature Events Group', 'Celebration Estates', 'Modern Event Spaces',
      'Elite Venues Group', 'Gateway Event Center', 'Pinnacle Entertainment Venues'
    ];

    // Domain names for realistic emails
    const domains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'events.com',
      'venuepro.com', 'eventsmgmt.com', 'corporateevents.com', 'weddingevents.com'
    ];

    // Generate 15-20 leads
    const leadCount = Math.floor(Math.random() * 6) + 15; // 15-20 leads
    const leads = [];

    for (let i = 0; i < leadCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      const venue = venues[Math.floor(Math.random() * venues.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];

      // Create realistic email
      const emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      const email = `${emailBase}@${domain}`;

      // Generate realistic phone number
      const areaCode = Math.floor(Math.random() * 900) + 200;
      const exchange = Math.floor(Math.random() * 900) + 200;
      const lineNumber = Math.floor(Math.random() * 9000) + 1000;
      const phone = `(${areaCode}) ${exchange}-${lineNumber}`;

      leads.push({
        name: `${firstName} ${lastName}`,
        email,
        phone,
        title,
        org: venue,
        venue: venue,
        status: 'uncontacted',
        source: 'mock-generator',
        snippet: `${title} at ${venue} in ${city}, ${state}`
      });
    }

    console.log(`✨ Generated ${leads.length} mock leads for ${city}, ${state}`);

    return NextResponse.json({
      leads,
      message: `Generated ${leads.length} sample leads for ${city}, ${state}`,
      total: leads.length
    });

  } catch (error: any) {
    console.error('❌ Mock search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate mock leads' },
      { status: 500 }
    );
  }
}
