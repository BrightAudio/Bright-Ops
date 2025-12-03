import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, message, user_id } = body;

    if (!conversation_id || !message) {
      return NextResponse.json(
        { error: 'conversation_id and message are required' },
        { status: 400 }
      );
    }

    // Insert the message
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        sender_type: user_id ? 'agent' : 'visitor',
        message,
        user_id: user_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Check if autopilot is enabled
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('autopilot_enabled')
      .eq('id', conversation_id)
      .single();

    // If autopilot is enabled and message is from visitor, trigger bot response
    if (conversation?.autopilot_enabled && !user_id) {
      // Trigger autopilot response (async, don't wait)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/chat/autopilot-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id, visitor_message: message }),
      }).catch(console.error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversation_id = searchParams.get('conversation_id');

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
