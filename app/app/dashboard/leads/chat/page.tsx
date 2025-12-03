'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FaRobot, FaUser, FaCheck, FaTimes, FaCircle } from 'react-icons/fa';

type Conversation = {
  id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone?: string;
  status: string;
  autopilot_enabled: boolean;
  last_message_at: string;
  unread_count: number;
  chat_messages: Message[];
};

type Message = {
  id: string;
  sender_type: 'visitor' | 'agent' | 'bot';
  message: string;
  created_at: string;
  read_by_agent: boolean;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUser();
    loadConversations();
    
    // Poll for new conversations and messages every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      loadConversations();
      if (selectedConversation) {
        loadMessages(selectedConversation);
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [selectedConversation]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function loadConversations() {
    try {
      const response = await fetch('/api/chat/conversations');
      const data = await response.json();
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const response = await fetch(`/api/chat/send?conversation_id=${conversationId}`);
      const data = await response.json();
      setMessages(data || []);
      
      // Mark messages as read
      const unreadMessages = data.filter((msg: Message) => 
        msg.sender_type === 'visitor' && !msg.read_by_agent
      );
      
      if (unreadMessages.length > 0) {
        await Promise.all(unreadMessages.map((msg: Message) => 
          supabase
            .from('chat_messages')
            .update({ read_by_agent: true })
            .eq('id', msg.id)
        ));
      }

      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async function handleSelectConversation(conversationId: string) {
    setSelectedConversation(conversationId);
    await loadMessages(conversationId);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConversation,
          message: messageInput,
          user_id: user.id,
        }),
      });

      setMessageInput('');
      await loadMessages(selectedConversation);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }

  async function toggleAutopilot(conversationId: string, enabled: boolean) {
    try {
      await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          autopilot_enabled: enabled,
        }),
      });

      await loadConversations();
    } catch (error) {
      console.error('Error toggling autopilot:', error);
    }
  }

  async function closeConversation(conversationId: string) {
    if (!confirm('Are you sure you want to close this conversation?')) return;

    try {
      await fetch('/api/chat/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          status: 'closed',
        }),
      });

      setSelectedConversation(null);
      await loadConversations();
    } catch (error) {
      console.error('Error closing conversation:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 60px)',
      background: '#1a1a1a'
    }}>
      {/* Conversations List */}
      <div style={{
        width: '350px',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        background: '#1e1e1e'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #333'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: '#fff'
          }}>
            Website Chats
          </h2>
          <p style={{
            margin: '0.5rem 0 0 0',
            fontSize: '13px',
            color: '#999'
          }}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{
          flex: 1,
          overflow: 'auto'
        }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              <p>No active conversations</p>
              <p style={{ fontSize: '12px', marginTop: '1rem' }}>
                Embed the chat widget on your website:
              </p>
              <code style={{
                display: 'block',
                background: '#000',
                padding: '0.5rem',
                borderRadius: '4px',
                fontSize: '11px',
                marginTop: '0.5rem',
                wordBreak: 'break-all'
              }}>
                {`<script src="${process.env.NEXT_PUBLIC_APP_URL}/api/chat-widget"></script>`}
              </code>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #333',
                  cursor: 'pointer',
                  background: selectedConversation === conv.id ? '#2a2a2a' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '0.5rem'
                }}>
                  <div>
                    <div style={{
                      fontWeight: 600,
                      color: '#fff',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {conv.visitor_name}
                      {conv.unread_count > 0 && (
                        <span style={{
                          background: '#667eea',
                          color: 'white',
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: 600
                        }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#999',
                      marginTop: '2px'
                    }}>
                      {conv.visitor_email}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </div>
                    {conv.autopilot_enabled && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#4ade80',
                        fontSize: '11px'
                      }}>
                        <FaRobot size={12} />
                        <span>Auto</span>
                      </div>
                    )}
                  </div>
                </div>
                {conv.chat_messages?.[conv.chat_messages.length - 1] && (
                  <div style={{
                    fontSize: '13px',
                    color: '#aaa',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {conv.chat_messages[conv.chat_messages.length - 1].message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a1a'
      }}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #333',
              background: '#1e1e1e',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#fff'
                }}>
                  {selectedConv.visitor_name}
                </h3>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginTop: '4px',
                  fontSize: '13px',
                  color: '#999'
                }}>
                  <span>📧 {selectedConv.visitor_email}</span>
                  {selectedConv.visitor_phone && (
                    <span>📞 {selectedConv.visitor_phone}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => toggleAutopilot(selectedConv.id, !selectedConv.autopilot_enabled)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: selectedConv.autopilot_enabled ? '#4ade80' : '#333',
                    color: selectedConv.autopilot_enabled ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  <FaRobot />
                  {selectedConv.autopilot_enabled ? 'Autopilot ON' : 'Autopilot OFF'}
                </button>
                <button
                  onClick={() => closeConversation(selectedConv.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Close Chat
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender_type === 'visitor' ? 'flex-start' : 'flex-end'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '4px',
                    fontSize: '12px',
                    color: '#999'
                  }}>
                    {msg.sender_type === 'visitor' && <FaUser size={10} />}
                    {msg.sender_type === 'bot' && <FaRobot size={10} />}
                    <span>
                      {msg.sender_type === 'visitor' ? selectedConv.visitor_name : 
                       msg.sender_type === 'bot' ? 'AI Assistant' : 'You'}
                    </span>
                    <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div style={{
                    maxWidth: '70%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: msg.sender_type === 'visitor' ? '#667eea' : 
                               msg.sender_type === 'bot' ? '#4ade80' : '#333',
                    color: msg.sender_type === 'agent' ? '#fff' : '#000',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #333',
                background: '#1e1e1e',
                display: 'flex',
                gap: '0.75rem'
              }}
            >
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                disabled={selectedConv.autopilot_enabled}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={sending || !messageInput.trim() || selectedConv.autopilot_enabled}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: (sending || !messageInput.trim() || selectedConv.autopilot_enabled) ? 0.5 : 1
                }}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '16px'
          }}>
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
