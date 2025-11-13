import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/leads/generate-email
 * 
 * Generates personalized email subject and body for a lead using OpenAI.
 * 
 * Request body:
 * {
 *   leadName: string,
 *   leadTitle: string,
 *   leadOrg: string,
 *   snippet?: string
 * }
 * 
 * Response:
 * {
 *   subject: string,
 *   body: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { leadName, leadTitle, leadOrg, snippet } = await request.json();

    if (!leadName || !leadOrg) {
      return NextResponse.json(
        { error: "leadName and leadOrg are required" },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Construct personalized prompt
    const prompt = `You are writing a professional, warm outreach email from Bright Audio, a premium audio/visual production company, to a potential client.

Lead Details:
- Name: ${leadName}
- Title: ${leadTitle || "Event Professional"}
- Organization: ${leadOrg}
${snippet ? `- Context: ${snippet}` : ""}

Write a personalized email that:
1. Addresses them by name
2. Mentions their organization and role
3. Briefly introduces Bright Audio as a trusted AV partner for events
4. Highlights our expertise in audio, lighting, and visual production
5. Offers to discuss their upcoming event needs
6. Keeps it concise and friendly (3-4 paragraphs max)
7. Ends with a clear call-to-action

Return ONLY valid JSON in this exact format:
{
  "subject": "Email subject line here",
  "body": "Email body text here"
}`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cost-effective model
        messages: [
          {
            role: "system",
            content: "You are a professional business development assistant specializing in event production outreach. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate email" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 }
      );
    }

    // Parse JSON response
    let emailData;
    try {
      emailData = JSON.parse(generatedText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", generatedText);
      // Fallback: try to extract subject and body manually
      const subjectMatch = generatedText.match(/"subject":\s*"([^"]+)"/);
      const bodyMatch = generatedText.match(/"body":\s*"([^"]+)"/);
      
      if (subjectMatch && bodyMatch) {
        emailData = {
          subject: subjectMatch[1],
          body: bodyMatch[1],
        };
      } else {
        return NextResponse.json(
          { error: "Failed to parse generated email" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      subject: emailData.subject,
      body: emailData.body,
    });

  } catch (error) {
    console.error("Error in generate-email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
