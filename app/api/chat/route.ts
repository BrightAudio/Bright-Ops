import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, messages, systemPrompt } = body;

    // Support both single message and multi-message formats
    const userMessage = message || (messages && messages[messages.length - 1]?.content);

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Default system prompt for financial advisor
    const defaultSystemPrompt = 'You are a Harvard Business School-educated financial advisor specializing in small business operations and equipment rental management. You provide strategic, data-driven financial analysis and recommendations. Always respond with clear, actionable insights.';

    // Use provided system prompt or default
    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // Build messages array
    let messagesArray: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    
    if (messages && Array.isArray(messages)) {
      // Use provided messages array
      messagesArray = messages;
    } else {
      // Use single message
      messagesArray = [{ role: 'user', content: userMessage }];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: finalSystemPrompt,
          },
          ...messagesArray,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from OpenAI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'No response generated';

    // Return both 'reply' (for legacy code) and 'response' (for price search)
    return NextResponse.json({ reply, response: reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
