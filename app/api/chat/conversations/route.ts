import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';

    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        chat_messages (
          id,
          message,
          sender_type,
          created_at,
          read_by_agent
        )
      `)
      .eq('status', status)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Calculate unread counts
    const conversationsWithUnread = data?.map(conv => ({
      ...conv,
      unread_count: conv.chat_messages?.filter(
        (msg: any) => msg.sender_type === 'visitor' && !msg.read_by_agent
      ).length || 0,
      last_message: conv.chat_messages?.[conv.chat_messages.length - 1] || null,
    }));

    return NextResponse.json(conversationsWithUnread);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, status, autopilot_enabled } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (typeof autopilot_enabled === 'boolean') updates.autopilot_enabled = autopilot_enabled;

    const { data, error } = await supabase
      .from('chat_conversations')
      .update(updates)
      .eq('id', conversation_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
