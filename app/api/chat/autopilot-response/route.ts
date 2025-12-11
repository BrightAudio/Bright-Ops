import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { conversation_id, visitor_message } = await request.json();

    // Get the current user to fetch their OpenAI API key
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Get OpenAI API key from user_profiles
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('openai_api_key')
      .eq('id', user.id)
      .single();

    const openaiApiKey = (userProfile as any)?.openai_api_key || process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add it in Leads > Settings.' },
        { status: 400 }
      );
    }

    // Get conversation details
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*, chat_messages(*)')
      .eq('id', conversation_id)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build conversation history for context
    const messages = conversation.chat_messages || [];
    const conversationHistory = messages.map((msg: any) => ({
      role: msg.sender_type === 'visitor' ? 'user' : 'assistant',
      content: msg.message,
    }));

    // System prompt for the bot
    const systemPrompt = `You are a helpful assistant for Bright Audio, a professional audio equipment rental and production company. 

Your primary goal is to:
1. Answer questions about our audio/visual equipment rental services
2. Collect visitor information (name, email, phone if not already provided)
3. Understand their event needs (date, type of event, equipment needed)
4. Book a consultation meeting when appropriate

Company Info:
- We provide professional audio equipment rentals
- We offer sound engineering services
- We serve events of all sizes
- We can provide quotes and consultations

When the visitor is ready or has provided enough information, suggest booking a meeting to discuss their needs in detail. Be friendly, professional, and helpful.

If asked about pricing, explain that it depends on the specific equipment and duration, and suggest a consultation.

Visitor Name: ${conversation.visitor_name || 'Not provided'}
Visitor Email: ${conversation.visitor_email || 'Not provided'}
Visitor Phone: ${conversation.visitor_phone || 'Not provided'}`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: visitor_message },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const botResponse = data.choices[0]?.message?.content || 
      "I'm here to help! Could you tell me more about your audio equipment needs?";

    // Save bot response to database
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        sender_type: 'bot',
        message: botResponse,
      });

    // Check if response mentions booking/meeting and create lead if needed
    if (botResponse.toLowerCase().includes('book') || 
        botResponse.toLowerCase().includes('meeting') ||
        botResponse.toLowerCase().includes('consultation')) {
      
      // Try to create/update lead
      if (conversation.visitor_email) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('email', conversation.visitor_email)
          .single();

        if (!existingLead) {
          // Create new lead
          const { data: newLead } = await supabase
            .from('leads')
            .insert({
              email: conversation.visitor_email,
              name: conversation.visitor_email.split('@')[0], // Use email prefix as fallback name
              ...(conversation.visitor_phone && { phone: conversation.visitor_phone }),
              source: 'Website Chat',
              status: 'new',
              notes: `Initial chat: ${visitor_message}`,
            })
          .select()
          .single();

          // Link conversation to lead
          if (newLead) {
            await supabase
              .from('chat_conversations')
              .update({ lead_id: newLead.id })
              .eq('id', conversation_id);
          }
        }
      }
    }

    return NextResponse.json({ message: botResponse });
  } catch (error: any) {
    console.error('Error generating autopilot response:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    );
  }
}
