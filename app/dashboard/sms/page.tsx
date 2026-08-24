'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SenderId {
  id: string;
  sender_id: string;
  status: 'pending' | 'approved' | 'rejected';
  purpose: string;
  provider: string;
  destination_code: string;
  destination_label: string;
  created_at: string;
  approved_at: string | null;
}

/** Where a sender ID will be used. This decides which carrier we register it with. */
const SENDER_DESTINATIONS = [
  { code: '233', label: 'Ghana' },
  { code: '234', label: 'Nigeria' },
  { code: '254', label: 'Kenya' },
  { code: '27', label: 'South Africa' },
  { code: '256', label: 'Uganda' },
  { code: '255', label: 'Tanzania' },
  { code: 'international', label: 'Anywhere else' },
];

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
  detail?: string;
}

/** Split a comma-separated recipient list into unique, trimmed numbers. */
function parseNumbers(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(',')
    .map((n) => n.replace(/[\s-]/g, '').trim())
    .filter((n) => n.length > 0)
    .filter((n) => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
}

const E164 = /^\+?[1-9]\d{6,14}$/;

interface SMSLog {
  id: string;
  transaction_id: string;
  message_id: string;
  phone_number: string;
  message_content: string;
  sender_id: string;
  country_code: string;
  country_name: string;
  continent: string;
  segments: number;
  status: string;
  price: number;
  error_message: string;
  reference: string;
  created_at: string;
  sent_at: string;
}

interface SMSStats {
  total_sms: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  total_segments: number;
  last_24h_count: number;
  last_7d_count: number;
  last_30d_count: number;
  // Pricing data
  avg_price_per_sms: number;
  total_cost: number;
  cost_today: number;
  cost_this_week: number;
  cost_this_month: number;
  // Trend data
  daily_trend: { date: string; sent: number; delivered: number; cost: number }[];
  // Top countries
  top_countries: { name: string; count: number }[];
}

export default function SMSPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'messages' | 'senders'>('analytics');
  const [messages, setMessages] = useState<SMSLog[]>([]);
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [loading, setLoading] = useState(true);
  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((type: Toast['type'], message: string, detail?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((t) => [...t, { id, type, message, detail }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  const dismissToast = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  // Sender IDs
  const [senders, setSenders] = useState<SenderId[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [showAddSender, setShowAddSender] = useState(false);
  const [newSenderId, setNewSenderId] = useState('');
  const [newSenderPurpose, setNewSenderPurpose] = useState('');
  const [newSenderDest, setNewSenderDest] = useState('233');
  const [addingSender, setAddingSender] = useState(false);
  const [refreshingSender, setRefreshingSender] = useState<string | null>(null);

  // Send SMS composer
  const [showSend, setShowSend] = useState(false);
  const [smTo, setSmTo] = useState('');
  const [smFrom, setSmFrom] = useState('');
  const [smMessage, setSmMessage] = useState('');
  const [smSending, setSmSending] = useState(false);

  const supabase = createClient();

  const fetchSenders = useCallback(async () => {
    setSendersLoading(true);
    try {
      const res = await fetch('/api/v1/sms/sender-ids');
      const data = await res.json();
      if (res.ok) setSenders(data.data || []);
    } catch {
      /* surfaced on the next action */
    } finally {
      setSendersLoading(false);
    }
  }, []);

  const handleAddSender = async () => {
    if (!newSenderId.trim() || !newSenderPurpose.trim()) return;
    setAddingSender(true);
    try {
      const res = await fetch('/api/v1/sms/sender-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: newSenderId.trim(),
          purpose: newSenderPurpose.trim(),
          destination: newSenderDest,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast('error', data?.error?.message || data?.error || 'Could not register sender ID');
        return;
      }
      pushToast(data.submitted_to_carrier ? 'success' : 'error', data.message || 'Sender ID submitted.');
      setShowAddSender(false);
      setNewSenderId('');
      setNewSenderPurpose('');
      fetchSenders();
    } catch {
      pushToast('error', 'Could not reach the server. Check your connection and try again.');
    } finally {
      setAddingSender(false);
    }
  };

  const handleRefreshSender = async (id: string) => {
    setRefreshingSender(id);
    try {
      const res = await fetch(`/api/v1/sms/sender-ids/${id}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        pushToast('error', data?.error?.message || data?.error || 'Could not check status');
        return;
      }
      if (data.warning) pushToast('error', data.warning);
      else pushToast('success', data.message || 'Status updated.');
      fetchSenders();
    } catch {
      pushToast('error', 'Could not reach the server.');
    } finally {
      setRefreshingSender(null);
    }
  };

  const handleDeleteSender = async (id: string, name: string) => {
    if (!confirm(`Remove sender ID "${name}"? You will no longer be able to send from it.`)) return;
    try {
      const res = await fetch(`/api/v1/sms/sender-ids/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        pushToast('error', data?.error?.message || data?.error || 'Could not remove sender ID');
        return;
      }
      pushToast('success', data.message || 'Sender ID removed.');
      fetchSenders();
    } catch {
      pushToast('error', 'Could not reach the server.');
    }
  };

  // Sends for real, one request per recipient (the API sends to one number at a time).
  const handleSendSms = async () => {
    const numbers = parseNumbers(smTo);
    if (numbers.length === 0) { pushToast('error', 'Add at least one phone number.'); return; }
    const bad = numbers.find((n) => !E164.test(n));
    if (bad) { pushToast('error', `Not a valid number: ${bad}. Use E.164, e.g. +233540800994.`); return; }
    if (!smMessage.trim()) { pushToast('error', 'Write a message.'); return; }

    setSmSending(true);
    try {
      const results = await Promise.all(numbers.map(async (to) => {
        try {
          const body: Record<string, unknown> = { to, message: smMessage };
          if (smFrom.trim()) body.from = smFrom.trim();
          const res = await fetch('/api/v1/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          return { to, ok: res.ok && data?.success !== false, error: data?.error };
        } catch {
          return { to, ok: false, error: { message: 'Network error' } };
        }
      }));

      const sent = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      if (sent.length > 0) {
        pushToast('success', `Sent to ${sent.length} of ${numbers.length} number${numbers.length === 1 ? '' : 's'}.`);
      }
      for (const f of failed.slice(0, 3)) {
        pushToast('error', `${f.to}: ${f.error?.message || 'Failed to send'}`, f.error?.code);
      }
      if (failed.length > 3) pushToast('error', `…and ${failed.length - 3} more failed.`);

      if (failed.length === 0) {
        setShowSend(false);
        setSmTo('');
        setSmMessage('');
      }
      fetchData();
    } finally {
      setSmSending(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      // Fetch SMS stats
      const statsResponse = await fetch('/api/v1/sms/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent messages
      const messagesResponse = await fetch('/api/v1/sms/logs?limit=50');
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
    } catch (error) {
      console.error('Error fetching SMS data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'senders') fetchSenders();
  }, [activeTab, fetchSenders]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      queued: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Queued' },
      sent: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Sent' },
      delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Delivered' },
      failed: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
    };
    
    const config = statusConfig[status] || statusConfig.queued;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text} border border-current/20`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  // Calculate percentages for progress bars
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Truncate message for display
  const truncateMessage = (msg: string, maxLen: number = 40) => {
    if (!msg) return '-';
    return msg.length > maxLen ? msg.substring(0, maxLen) + '...' : msg;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">SMS Overview</h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card hover:bg-accent border border-border rounded-lg transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
              <svg className="w-3.5 h-3.5 ml-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => setShowSend(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 border border-purple-500 rounded-lg shadow-lg shadow-purple-500/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Send SMS
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-6" aria-label="Tabs">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none flex items-center gap-2 ${
                activeTab === 'analytics' 
                  ? 'text-foreground border-purple-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none flex items-center gap-2 ${
                activeTab === 'messages' 
                  ? 'text-foreground border-purple-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Messages
            </button>
            <button 
              onClick={() => setActiveTab('senders')}
              className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none flex items-center gap-2 ${
                activeTab === 'senders' 
                  ? 'text-foreground border-purple-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Sender IDs
            </button>
          </nav>
        </div>

        {/* TAB: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Total SMS */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">Total Messages</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-semibold text-foreground tracking-tight">
                        {loading ? '...' : (stats?.total_sms || 0)}
                      </span>
                      {stats && stats.last_7d_count > 0 && (
                        <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          +{stats.last_7d_count} this week
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats?.last_24h_count || 0} sent today • {stats?.total_segments || 0} segments
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Sent</span>
                      <span className="text-foreground font-medium">{stats?.sent_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.sent_count || 0, stats?.total_sms || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Delivered</span>
                      <span className="text-foreground font-medium">{stats?.delivered_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.delivered_count || 0, stats?.total_sms || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Failed</span>
                      <span className="text-foreground font-medium">{stats?.failed_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.failed_count || 0, stats?.total_sms || 1)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Stats */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">Delivery Rate</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-semibold text-foreground tracking-tight">
                        {loading ? '...' : `${stats?.total_sms ? Math.round(((stats.sent_count + stats.delivered_count) / stats.total_sms) * 100) : 0}%`}
                      </span>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Healthy</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(stats?.sent_count || 0) + (stats?.delivered_count || 0)} delivered successfully
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                
                {/* Top Countries */}
                <div className="space-y-3 mt-4">
                  <div className="text-xs text-muted-foreground font-medium mb-2">Top Destinations</div>
                  {stats && stats.top_countries && stats.top_countries.length > 0 ? (
                    stats.top_countries.slice(0, 3).map((country, idx) => (
                      <div key={country.name}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">{country.name}</span>
                          <span className="text-foreground font-medium">{country.count}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                            style={{ width: `${getPercentage(country.count, stats.top_countries[0]?.count || 1)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No messages sent yet</div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">Recent Activity</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-semibold text-foreground tracking-tight">
                        {loading ? '...' : (stats?.last_30d_count || 0)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">last 30 days</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats?.last_7d_count || 0} in the last 7 days
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Today</span>
                      <span className="text-foreground font-medium">{stats?.last_24h_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.last_24h_count || 0, stats?.last_30d_count || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">This Week</span>
                      <span className="text-foreground font-medium">{stats?.last_7d_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.last_7d_count || 0, stats?.last_30d_count || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">This Month</span>
                      <span className="text-foreground font-medium">{stats?.last_30d_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Trend Chart */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-semibold text-foreground">SMS Trend</h3>
                  <button className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:text-foreground rounded border border-border transition-colors">
                    Last 30 Days
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-medium mb-6">
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Sent
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Delivered
                  </div>
                </div>

                {/* Simple Bar Chart */}
                {stats && stats.daily_trend && stats.daily_trend.length > 0 ? (
                  <div className="h-[200px] w-full flex items-end gap-1">
                    {stats.daily_trend.slice(-14).map((day, index) => {
                      const maxVal = Math.max(...stats.daily_trend.slice(-14).map(d => d.sent), 1);
                      const sentHeight = (day.sent / maxVal) * 100;
                      const dayLabel = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="w-full flex flex-col gap-0.5 h-[160px] items-center justify-end">
                            {day.sent > 0 && (
                              <div 
                                className="w-full max-w-[20px] bg-purple-500 rounded-t transition-all hover:bg-purple-400"
                                style={{ height: `${Math.max(sentHeight, 4)}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 hidden md:block">
                            {index % 2 === 0 ? dayLabel : ''}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                            <div className="bg-card border border-border rounded-lg p-2 shadow-xl text-xs whitespace-nowrap">
                              <div className="font-medium text-foreground mb-1">{dayLabel}</div>
                              <div className="text-purple-400">Sent: {day.sent}</div>
                              <div className="text-emerald-400">Delivered: {day.delivered}</div>
                              <div className="text-amber-400">Cost: {formatCurrency(day.cost)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm">Send some SMS to see the trend chart</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Spending</h3>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Price Display */}
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {formatCurrency(stats?.total_cost || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total SMS Cost</div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg. per SMS</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(stats?.avg_price_per_sms || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Segments</span>
                    <span className="text-sm font-medium text-foreground">{stats?.total_segments || 0}</span>
                  </div>
                  
                  <div className="h-px bg-border my-2"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Today</span>
                    <span className="text-sm font-medium text-emerald-400">{formatCurrency(stats?.cost_today || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">This Week</span>
                    <span className="text-sm font-medium text-blue-400">{formatCurrency(stats?.cost_this_week || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">This Month</span>
                    <span className="text-sm font-medium text-purple-400">{formatCurrency(stats?.cost_this_month || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Messages (Table) */}
        {activeTab === 'messages' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Recent Messages</h3>
                <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary px-2 py-1 rounded border border-border">
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">ID</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Message</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Country</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Segments</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            Loading messages...
                          </div>
                        </td>
                      </tr>
                    ) : messages.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                          <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-sm font-medium text-foreground mb-1">No SMS sent yet</p>
                          <p className="text-xs text-muted-foreground">Messages sent through the API will appear here</p>
                        </td>
                      </tr>
                    ) : (
                      messages.map((msg) => (
                        <tr key={msg.id} className="group hover:bg-accent/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                            {msg.transaction_id?.slice(0, 12) || msg.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">{msg.phone_number}</div>
                            {msg.sender_id && (
                              <div className="text-xs text-muted-foreground">From: {msg.sender_id}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs">
                            {truncateMessage(msg.message_content)}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {msg.country_name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground text-center">
                            {msg.segments || 1}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {formatCurrency(msg.price || 0)}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {formatShortDate(msg.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(msg.status)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {messages.length > 0 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Showing {messages.length} messages
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:text-foreground rounded border border-border transition-colors disabled:opacity-50" disabled>
                      Previous
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:text-foreground rounded border border-border transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Sender IDs */}
        {activeTab === 'senders' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Sender IDs</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  The name recipients see instead of a phone number. Carriers review each one manually,
                  which can take a few weeks &mdash; you can keep sending from your default sender in the meantime.
                </p>
              </div>
              <button
                onClick={() => setShowAddSender(true)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 border border-purple-500 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Register Sender ID
              </button>
            </div>

            {sendersLoading && <div className="text-sm text-muted-foreground">Loading sender IDs…</div>}

            {!sendersLoading && senders.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <div className="text-sm font-medium text-foreground mb-1">No sender IDs yet</div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Register one to have your brand name appear as the sender. Ghanaian carriers block
                  unregistered names, so registering is required before you can use one there.
                </p>
              </div>
            )}

            {!sendersLoading && senders.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-secondary/50 border-b border-border">
                    <tr>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sender ID</th>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usable for</th>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purpose</th>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {senders.map((sid) => (
                      <tr key={sid.id}>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{sid.sender_id}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{sid.destination_label || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            sid.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : sid.status === 'rejected'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {sid.status === 'approved' ? 'Approved' : sid.status === 'rejected' ? 'Rejected' : 'Pending review'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">{sid.purpose}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {sid.status !== 'approved' && (
                            <button
                              onClick={() => handleRefreshSender(sid.id)}
                              disabled={refreshingSender === sid.id}
                              className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border mr-2 disabled:opacity-50"
                            >
                              {refreshingSender === sid.id ? 'Checking…' : 'Check status'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSender(sid.id, sid.sender_id)}
                            className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/20"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Ghana:</span> promotional SMS may not be sent on Sundays,
                and political, religious, gambling or unsolicited promotional content is not permitted.
              </p>
            </div>
          </div>
        )}

        {/* ---------------- Register Sender ID ---------------- */}
        {showAddSender && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Register Sender ID</h3>
                <button onClick={() => setShowAddSender(false)} className="text-muted-foreground hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Sender ID</label>
                  <input
                    type="text"
                    value={newSenderId}
                    maxLength={11}
                    onChange={(e) => setNewSenderId(e.target.value)}
                    placeholder="AcmeCorp"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {newSenderId.length}/11 characters. Letters, numbers, spaces, dots and dashes.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Where will you send to?</label>
                  <select
                    value={newSenderDest}
                    onChange={(e) => setNewSenderDest(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {SENDER_DESTINATIONS.map((d) => (
                      <option key={d.code} value={d.code}>{d.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each carrier keeps its own approved list, so this decides who we register the name with.
                    Register it again for another destination if you need it in more than one market.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Purpose</label>
                  <textarea
                    value={newSenderPurpose}
                    onChange={(e) => setNewSenderPurpose(e.target.value)}
                    rows={3}
                    placeholder="Order notifications for our online store"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Carriers require a reason. Be specific &mdash; vague purposes are commonly rejected.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                  <p className="text-xs text-amber-300">
                    Approval is done by the mobile carriers and typically takes a few weeks. Your messages
                    keep sending from the default sender until it is approved.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={() => setShowAddSender(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                <button
                  onClick={handleAddSender}
                  disabled={addingSender || newSenderId.trim().length < 3 || !newSenderPurpose.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingSender && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {addingSender ? 'Submitting…' : 'Submit for approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Send SMS ---------------- */}
        {showSend && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Send SMS</h3>
                <button onClick={() => setShowSend(false)} className="text-muted-foreground hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">To</label>
                  <input
                    type="text"
                    value={smTo}
                    onChange={(e) => setSmTo(e.target.value)}
                    placeholder="+233540800994, +447555834656"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    E.164 format. Separate multiple numbers with commas.
                    {parseNumbers(smTo).length > 0 && (
                      <span className="text-purple-400 ml-1">
                        {parseNumbers(smTo).length} recipient{parseNumbers(smTo).length === 1 ? '' : 's'}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    From <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={smFrom}
                    onChange={(e) => setSmFrom(e.target.value)}
                    placeholder="Leave blank to use your default sender"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">A verified number or sender ID. Not supported in every country.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
                  <textarea
                    value={smMessage}
                    onChange={(e) => setSmMessage(e.target.value)}
                    rows={5}
                    maxLength={1600}
                    placeholder="Write your message…"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {smMessage.length}/1600 characters ·{' '}
                    {(() => {
                      const unicode = /[^\x00-\x7F]/.test(smMessage);
                      const per = unicode ? 70 : 160;
                      const segs = Math.max(1, Math.ceil(smMessage.length / per));
                      return `${segs} segment${segs === 1 ? '' : 's'}${unicode ? ' (unicode, 70 chars each)' : ''}`;
                    })()}
                    {parseNumbers(smTo).length > 1 && ' · billed per recipient'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={() => setShowSend(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                <button
                  onClick={handleSendSms}
                  disabled={smSending || !smTo.trim() || !smMessage.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {smSending && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {smSending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Toasts ---------------- */}
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${
                t.type === 'error'
                  ? 'bg-red-950/90 border-red-500/30 text-red-200'
                  : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm">{t.message}</div>
                {t.detail && <div className="text-xs opacity-70 mt-0.5 font-mono">{t.detail}</div>}
              </div>
              <button onClick={() => dismissToast(t.id)} className="opacity-60 hover:opacity-100 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
