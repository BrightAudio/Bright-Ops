"use client";

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  org: string | null;
  title: string | null;
  venue: string | null;
  status: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function StrategiesPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [callingApp, setCallingApp] = useState<string>('ask');

  useEffect(() => {
    loadUncontactedLeads();
    loadCallingPreference();
  }, []);

  async function loadCallingPreference() {
    try {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('leads_settings')
        .select('default_calling_app')
        .single();

      if (data && data.default_calling_app) {
        setCallingApp(data.default_calling_app);
      }
    } catch (err) {
      console.error('Error loading calling preference:', err);
      // Default to 'ask' if there's an error
    }
  }

  const loadUncontactedLeads = useCallback(async () => {
    try {
      setLoading(true);
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('leads')
        .select('id, name, email, phone, org, title, venue, status')
        .eq('status', 'uncontacted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStrategy = useCallback(async () => {
    if (!selectedLead || messages.length === 0) return;

    try {
      const strategyContent = messages
        .filter(m => m.role === 'assistant')
        .map(m => m.content)
        .join('\n\n---\n\n');

      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('strategies')
        .insert({
          lead_id: selectedLead.id,
          lead_name: selectedLead.name,
          lead_email: selectedLead.email,
          lead_org: selectedLead.org,
          lead_venue: selectedLead.venue,
          strategy_content: strategyContent,
          messages: JSON.stringify(messages)
        });

      if (error) throw error;
      alert('✅ Strategy saved successfully!');
    } catch (err) {
      console.error('Error saving strategy:', err);
      alert('Failed to save strategy. Please try again.');
    }
  }, [selectedLead, messages]);

  const generateStrategy = useCallback(async () => {
    if (!selectedLead) return;

    setGenerating(true);
    const systemPrompt = `You are an expert B2B partnership strategist for a professional production equipment company. Our mission is to build win/win partnerships with event venues and production companies by providing high-quality audio, lighting, and staging equipment.

Our Core Values (based on 7 Habits of Highly Effective People):
- Respect: Honor their time, expertise, and current operations
- Win/Win: Create mutually beneficial partnerships, not just sales
- Put First Things First: Focus on their most pressing production needs
- Be Proactive: Anticipate their equipment challenges before they ask
- Begin with the End in Mind: Understand their event success goals
- Seek First to Understand: Learn their unique venue/client needs before pitching
- Synergize: Find creative ways our equipment enhances their existing capabilities
- Sharpen the Saw: Offer ongoing support, training, and equipment upgrades

Lead Information:
- Name: ${selectedLead.name}
- Position: ${selectedLead.title || 'Unknown'}
- Organization: ${selectedLead.org || 'Unknown'}
- Venue/Client Type: ${selectedLead.venue || 'Unknown'}
- Email: ${selectedLead.email}

CRITICAL: First, research and determine what type of operation they run by analyzing their venue type and organization:

**EVENT PRODUCERS** (Clubs, Bars, Live Music Venues, Festivals, Concert Halls, Theaters that produce their own shows):
- Position: EQUIPMENT RENTAL PARTNERSHIP
- Offer: Professional production equipment rental for their events
- Value Proposition: "Upgrade your production capabilities without capital investment. Access pro-grade equipment on-demand for every show."
- Revenue Impact: "Reduce production costs by 40-60% vs. buying equipment, reallocate budget to talent/marketing, increase event frequency with reliable gear access"
- Pain Points: Equipment maintenance costs, storage limitations, tech obsolescence, inconsistent quality
- CTA: Equipment demo, trial rental for upcoming show, needs assessment

**EVENT HOSTS** (Wedding Venues, Corporate Event Spaces, Hotels, Convention Centers, Community Centers that rent space to clients):
- Position: VENDOR PARTNERSHIP / REVENUE SHARE MODEL
- Offer: Become their preferred/exclusive production vendor with 25-30% commission on all bookings they refer
- Value Proposition: "Add a high-margin revenue stream without any equipment investment or operational overhead. We handle everything, you collect commission."
- Revenue Impact: "Generate $X,000-$XX,000 in additional annual revenue per 100 events. Clients get seamless production packages, you earn passive income on every booking."
- Partnership Structure: "We provide full production services (audio, lighting, staging), your venue gets 25-30% of every booking you refer. No equipment to buy, maintain, or store. Just connect your clients to us and earn."
- Pain Points: Clients asking for production recommendations, losing bookings to full-service venues, missed upsell opportunities
- CTA: Partnership agreement review, commission structure discussion, trial on next client event

**HYBRID OPERATIONS** (Venues that both produce and host):
- Position: DUAL PARTNERSHIP MODEL
- Offer: Equipment rental for their produced events + vendor partnership for client events
- Value: "Support both sides of your business - pro equipment for your shows, commission income from client referrals"

Create a client acquisition strategy that:
1. VENUE ANALYSIS: Based on the venue type, identify if they are EVENT PRODUCERS, EVENT HOSTS, or HYBRID
2. PERSONALIZED OPENING: Reference their specific venue type/position and demonstrate you've researched their business model
3. TAILORED VALUE PROPOSITION: 
   - For Producers: Focus on equipment access, cost savings, production quality upgrades
   - For Hosts: Focus on NEW REVENUE STREAM, passive income, 25-30% commission structure, zero overhead
4. REVENUE/INCOME INCREASE: Provide specific examples of how we increase their sales/income:
   - For Producers: "Save $X on equipment costs per event, reinvest in more shows/better talent"
   - For Hosts: "Earn $X per event referred × Y events/year = $Z annual commission income with zero investment"
5. PAIN POINTS TO ADDRESS: Specific to their business model (equipment costs vs. missed revenue opportunities)
6. COLLABORATIVE CALL TO ACTION: Appropriate to their model (demo/trial vs. partnership agreement)
7. FOLLOW-UP STRATEGY: Multi-touch approach that builds trust and demonstrates ongoing value

Focus on partnership language, not vendor language. Emphasize how we INCREASE THEIR REVENUE and provide measurable financial value.

Provide a complete, ready-to-use outreach script that reflects our values-driven, relationship-first approach.`;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: `Generate an outreach strategy for ${selectedLead.name}` }
    ];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: systemPrompt
        })
      });

      if (!response.ok) throw new Error('Failed to generate strategy');

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply || data.response }]);
    } catch (err) {
      console.error('Error generating strategy:', err);
      alert('Failed to generate strategy. Make sure OpenAI API is configured.');
    } finally {
      setGenerating(false);
    }
  }, [selectedLead, messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selectedLead) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: input }
    ];
    setMessages(newMessages);
    setInput('');
    setGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: `You are a B2B partnership strategist for a production equipment company. We build win/win partnerships based on respect, collaboration, and mutual success. 

Context - Lead: ${selectedLead.name} (${selectedLead.title}), Organization: ${selectedLead.org}, Venue Type: ${selectedLead.venue}. 

Research their venue type to determine if they are EVENT PRODUCERS (clubs, bars, festivals, concert halls producing shows) or EVENT HOSTS (wedding venues, corporate spaces, hotels renting space to clients). 

For PRODUCERS: Focus on equipment rental partnerships, cost savings, and production quality.
For HOSTS: Focus on 25-30% commission revenue share model where we provide production for their clients and they earn passive income with zero overhead.

Always emphasize measurable revenue/income increases and financial value.`
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply || data.response }]);
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to send message');
    } finally {
      setGenerating(false);
    }
  }, [input, selectedLead, messages]);

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#e5e5e5' }}>
      {/* Header */}
      <div style={{ background: '#2a2a2a', borderBottom: '1px solid #333', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f3f4f6', margin: 0 }}>
              AI Strategy Generator
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Get personalized outreach scripts powered by AI
            </p>
          </div>
          <button
            onClick={() => router.push('/app/dashboard/leads/imported')}
            style={{
              background: '#2a2a2a',
              border: '1px solid #333',
              color: '#e5e5e5',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Leads
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: 'calc(100vh - 100px)' }}>
        {/* Lead Selection Sidebar */}
        <div style={{ background: '#2a2a2a', borderRight: '1px solid #333', overflowY: 'auto', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Select Lead ({leads.length})
          </h2>
          
          {loading ? (
            <p style={{ color: '#9ca3af' }}>Loading leads...</p>
          ) : leads.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No uncontacted leads found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLead(lead);
                    setMessages([]);
                  }}
                  style={{
                    background: selectedLead?.id === lead.id ? '#667eea' : '#1a1a1a',
                    border: '1px solid',
                    borderColor: selectedLead?.id === lead.id ? '#667eea' : '#333',
                    padding: '1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{lead.name}</div>
                  {lead.title && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>{lead.title}</div>}
                  {lead.org && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>{lead.org}</div>}
                  {lead.venue && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>📍 {lead.venue}</div>}
                  <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    {lead.email && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>✉️ {lead.email}</div>}
                    {lead.phone && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>📞 {lead.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {!selectedLead ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Select a Lead</h3>
                <p>Choose an uncontacted lead to generate a personalized outreach strategy</p>
              </div>
            </div>
          ) : (
            <>
              {/* Selected Lead Info */}
              <div style={{ background: '#2a2a2a', borderBottom: '1px solid #333', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>{selectedLead.name}</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                      {selectedLead.org} • {selectedLead.venue}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {selectedLead.phone && (
                      <button
                        onClick={() => {
                          const phone = selectedLead.phone;
                          
                          // Copy to clipboard first (while document has focus)
                          const copyToClipboard = async () => {
                            try {
                              await navigator.clipboard.writeText(phone || '');
                            } catch (err) {
                              console.error('Clipboard error:', err);
                            }
                          };

                          // Handle based on user preference
                          if (callingApp === 'copy') {
                            // Just copy to clipboard
                            copyToClipboard();
                            alert(`📋 Phone number copied: ${phone}`);
                          } else if (callingApp === 'ask') {
                            // Ask user each time
                            copyToClipboard();
                            const useApp = confirm(
                              `📞 Calling: ${phone}\n\n` +
                              `The number has been copied to your clipboard.\n\n` +
                              `Choose your calling method:\n` +
                              `✓ OK - Open in default phone app\n` +
                              `✓ Cancel - Just use copied number`
                            );
                            
                            if (useApp) {
                              window.location.href = `tel:${phone}`;
                            }
                          } else if (callingApp === 'teams') {
                            // Microsoft Teams
                            copyToClipboard();
                            window.open(`msteams://teams.microsoft.com/l/call/0/0?users=${phone}`, '_blank');
                          } else if (callingApp === 'skype') {
                            // Skype
                            copyToClipboard();
                            window.location.href = `skype:${phone}?call`;
                          } else if (callingApp === 'zoom') {
                            // Zoom Phone
                            copyToClipboard();
                            window.location.href = `zoomphonecall:${phone}`;
                          } else if (callingApp === 'google-voice') {
                            // Google Voice
                            copyToClipboard();
                            window.open(`https://voice.google.com/u/0/calls?a=nc,%2B${(phone || '').replace(/\D/g, '')}`, '_blank');
                          } else {
                            // Default: use tel: protocol
                            copyToClipboard();
                            window.location.href = `tel:${phone}`;
                          }
                        }}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          padding: '0.75rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '500',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        📞 Call
                      </button>
                    )}
                    <a
                      href={`mailto:${selectedLead.email}`}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                    >
                      ✉️ Email
                    </a>
                    {messages.length > 0 && (
                      <button
                        onClick={saveStrategy}
                        style={{
                          background: '#f59e0b',
                          color: 'white',
                          padding: '0.75rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        💾 Save Strategy
                      </button>
                    )}
                    {messages.length === 0 && (
                      <button
                        onClick={generateStrategy}
                        disabled={generating}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: generating ? 'not-allowed' : 'pointer',
                          opacity: generating ? 0.6 : 1,
                          fontWeight: '500'
                        }}
                      >
                        {generating ? '⏳ Generating...' : '✨ Generate Strategy'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '2rem' }}>
                    <p>Click "Generate Strategy" to get AI-powered outreach suggestions</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            background: msg.role === 'user' ? '#667eea' : '#2a2a2a',
                            padding: '1rem',
                            borderRadius: '12px',
                            maxWidth: '80%',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {generating && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '12px' }}>
                          <span>⏳ Thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ background: '#2a2a2a', borderTop: '1px solid #333', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask follow-up questions or refine the strategy..."
                    style={{
                      flex: 1,
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      color: '#e5e5e5',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || generating}
                    style={{
                      background: '#667eea',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: !input.trim() || generating ? 'not-allowed' : 'pointer',
                      opacity: !input.trim() || generating ? 0.6 : 1
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
