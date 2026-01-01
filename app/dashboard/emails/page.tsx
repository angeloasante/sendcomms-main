'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EmailLog {
  id: string;
  message_id: string;
  from_email: string;
  from_name: string;
  to_email: string;
  to_name: string;
  subject: string;
  status: string;
  created_at: string;
  sent_at: string;
  delivered_at: string;
  opened_at: string;
}

interface EmailStats {
  total_emails: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  failed_count: number;
  last_24h_count: number;
  last_7d_count: number;
  last_30d_count: number;
  // Pricing data
  price_per_email: number;
  total_cost: number;
  cost_today: number;
  cost_this_week: number;
  cost_this_month: number;
  // Trend data
  daily_trend: { date: string; sent: number; delivered: number; opened: number }[];
}

// Domain Types
interface DnsRecord {
  record: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
  name: string;
  type: 'TXT' | 'CNAME' | 'MX';
  ttl: string;
  status: string;
  value: string;
  priority?: number;
}

interface Domain {
  id: string;
  resend_domain_id: string;
  name: string;
  status: 'not_started' | 'pending' | 'verified' | 'failed' | 'temporary_failure';
  status_description: string;
  region: string;
  custom_return_path?: string;
  open_tracking: boolean;
  click_tracking: boolean;
  tls: string;
  sending_enabled: boolean;
  receiving_enabled: boolean;
  dns_records: DnsRecord[];
  is_primary: boolean;
  verified_at?: string;
  created_at: string;
}

export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'emails' | 'domain'>('analytics');
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Domain state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainRegion, setNewDomainRegion] = useState('us-east-1');
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [syncingDomains, setSyncingDomains] = useState(false);
  
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch email stats
      const statsResponse = await fetch('/api/v1/emails/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent emails
      const emailsResponse = await fetch('/api/v1/emails/logs?limit=50');
      if (emailsResponse.ok) {
        const emailsData = await emailsResponse.json();
        setEmails(emailsData.emails || []);
      }
    } catch (error) {
      console.error('Error fetching email data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch domains
  const fetchDomains = useCallback(async () => {
    setDomainsLoading(true);
    try {
      const response = await fetch('/api/v1/domains');
      if (response.ok) {
        const data = await response.json();
        setDomains(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setDomainsLoading(false);
    }
  }, []);

  // Add domain
  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return;
    
    setAddingDomain(true);
    setDomainError(null);
    
    try {
      const response = await fetch('/api/v1/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDomainName.trim().toLowerCase(),
          region: newDomainRegion,
          openTracking: false,
          clickTracking: false,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setDomainError(data.error || 'Failed to add domain');
        return;
      }
      
      // Refresh domains list
      await fetchDomains();
      setShowAddDomain(false);
      setNewDomainName('');
      setSelectedDomain(data.data);
    } catch (error) {
      console.error('Error adding domain:', error);
      setDomainError('Failed to add domain. Please try again.');
    } finally {
      setAddingDomain(false);
    }
  };

  // Verify domain
  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomain(domainId);
    
    try {
      const response = await fetch(`/api/v1/domains/${domainId}/verify`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Refresh domains to get updated status
        await fetchDomains();
      } else {
        setDomainError(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setDomainError('Failed to verify domain. Please try again.');
    } finally {
      setVerifyingDomain(null);
    }
  };

  // Delete domain
  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;
    
    try {
      const response = await fetch(`/api/v1/domains/${domainId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchDomains();
        if (selectedDomain?.id === domainId) {
          setSelectedDomain(null);
        }
      } else {
        const data = await response.json();
        setDomainError(data.error || 'Failed to delete domain');
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
      setDomainError('Failed to delete domain. Please try again.');
    }
  };

  // Sync domains with Resend
  const handleSyncDomains = async () => {
    setSyncingDomains(true);
    
    try {
      const response = await fetch('/api/v1/domains/sync', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        setDomains(data.data || []);
      }
    } catch (error) {
      console.error('Error syncing domains:', error);
    } finally {
      setSyncingDomains(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch domains when domain tab is selected
  useEffect(() => {
    if (activeTab === 'domain') {
      fetchDomains();
    }
  }, [activeTab, fetchDomains]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      queued: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Queued' },
      sent: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', label: 'Sent' },
      delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Delivered' },
      opened: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Opened' },
      clicked: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Clicked' },
      bounced: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Bounced' },
      failed: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
      complained: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Complained' },
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

  // Calculate percentages for progress bars
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Mail Overview</h1>
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
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Mail
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
                  ? 'text-foreground border-indigo-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('emails')}
              className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none flex items-center gap-2 ${
                activeTab === 'emails' 
                  ? 'text-foreground border-indigo-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Emails
            </button>
            <button 
              onClick={() => setActiveTab('domain')}
              className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none flex items-center gap-2 ${
                activeTab === 'domain' 
                  ? 'text-foreground border-indigo-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Domain
            </button>
          </nav>
        </div>

        {/* TAB: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Total Emails */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">Total Emails</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-semibold text-foreground tracking-tight">
                        {loading ? '...' : (stats?.total_emails || 0)}
                      </span>
                      {stats && stats.last_7d_count > 0 && (
                        <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          +{stats.last_7d_count} this week
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats?.last_24h_count || 0} sent today
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
                      <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.sent_count || 0, stats?.total_emails || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Delivered</span>
                      <span className="text-foreground font-medium">{stats?.delivered_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.delivered_count || 0, stats?.total_emails || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Failed</span>
                      <span className="text-foreground font-medium">{stats?.failed_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.failed_count || 0, stats?.total_emails || 1)}%` }}></div>
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
                        {loading ? '...' : `${stats?.total_emails ? Math.round((stats.delivered_count / stats.total_emails) * 100) : 0}%`}
                      </span>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Healthy</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats?.delivered_count || 0} delivered successfully
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Opened</span>
                      <span className="text-foreground font-medium">{stats?.opened_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.opened_count || 0, stats?.delivered_count || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Clicked</span>
                      <span className="text-foreground font-medium">{stats?.clicked_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.clicked_count || 0, stats?.delivered_count || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Bounced</span>
                      <span className="text-foreground font-medium">{stats?.bounced_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.bounced_count || 0, stats?.total_emails || 1)}%` }}></div>
                    </div>
                  </div>
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
                      <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.last_24h_count || 0, stats?.last_30d_count || 1)}%` }}></div>
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
                  <h3 className="text-sm font-semibold text-foreground">Email Trend</h3>
                  <button className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:text-foreground rounded border border-border transition-colors">
                    Last 30 Days
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-medium mb-6">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Sent
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Delivered
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Opened
                  </div>
                </div>

                {/* Simple Bar Chart */}
                {stats && stats.daily_trend && stats.daily_trend.length > 0 ? (
                  <div className="h-[200px] w-full flex items-end gap-1">
                    {stats.daily_trend.slice(-14).map((day, index) => {
                      const maxVal = Math.max(...stats.daily_trend.slice(-14).map(d => d.sent), 1);
                      const sentHeight = (day.sent / maxVal) * 100;
                      const deliveredHeight = (day.delivered / maxVal) * 100;
                      const openedHeight = (day.opened / maxVal) * 100;
                      const dayLabel = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="w-full flex flex-col gap-0.5 h-[160px] items-center justify-end">
                            {day.sent > 0 && (
                              <div 
                                className="w-full max-w-[20px] bg-indigo-500 rounded-t transition-all hover:bg-indigo-400"
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
                              <div className="text-indigo-400">Sent: {day.sent}</div>
                              <div className="text-emerald-400">Delivered: {day.delivered}</div>
                              <div className="text-amber-400">Opened: {day.opened}</div>
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm">Send some emails to see the trend chart</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Price Display */}
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    ${stats ? stats.total_cost.toFixed(4) : '0.0000'}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Email Cost</div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Price per Email</span>
                    <span className="text-sm font-medium text-foreground">${stats?.price_per_email?.toFixed(6) || '0.000529'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Emails Sent</span>
                    <span className="text-sm font-medium text-foreground">{stats?.total_emails || 0}</span>
                  </div>
                  
                  <div className="h-px bg-border my-2"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Today</span>
                    <span className="text-sm font-medium text-emerald-400">${stats?.cost_today?.toFixed(4) || '0.0000'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">This Week</span>
                    <span className="text-sm font-medium text-blue-400">${stats?.cost_this_week?.toFixed(4) || '0.0000'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">This Month</span>
                    <span className="text-sm font-medium text-indigo-400">${stats?.cost_this_month?.toFixed(4) || '0.0000'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Emails (Table) */}
        {activeTab === 'emails' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Recent Emails</h3>
                <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary px-2 py-1 rounded border border-border">
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">Email ID</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            Loading emails...
                          </div>
                        </td>
                      </tr>
                    ) : emails.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm font-medium text-foreground mb-1">No emails sent yet</p>
                          <p className="text-xs text-muted-foreground">Emails sent through the API will appear here</p>
                        </td>
                      </tr>
                    ) : (
                      emails.map((email) => (
                        <tr key={email.id} className="group hover:bg-accent/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                            {email.message_id?.slice(0, 12) || email.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">{email.to_email}</div>
                            {email.to_name && (
                              <div className="text-xs text-muted-foreground">{email.to_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground max-w-xs truncate">
                            {email.subject}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {formatShortDate(email.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(email.status)}
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
              {emails.length > 0 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Showing {emails.length} emails
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

        {/* TAB: Domain */}
        {activeTab === 'domain' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Domain Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Domain Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">Configure and verify your sending domains for better deliverability.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSyncDomains}
                  disabled={syncingDomains}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card hover:bg-accent border border-border rounded-lg transition-all disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${syncingDomains ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncingDomains ? 'Syncing...' : 'Sync'}
                </button>
                <button 
                  onClick={() => setShowAddDomain(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Domain
                </button>
              </div>
            </div>

            {/* Error Message */}
            {domainError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-400">{domainError}</span>
                </div>
                <button onClick={() => setDomainError(null)} className="text-red-400 hover:text-red-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Add Domain Modal */}
            {showAddDomain && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Add New Domain</h3>
                    <button onClick={() => setShowAddDomain(false)} className="text-muted-foreground hover:text-foreground">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Domain Name</label>
                      <input
                        type="text"
                        value={newDomainName}
                        onChange={(e) => setNewDomainName(e.target.value)}
                        placeholder="example.com"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">We recommend using a subdomain (e.g., mail.example.com)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Region</label>
                      <select
                        value={newDomainRegion}
                        onChange={(e) => setNewDomainRegion(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="eu-west-1">EU West (Ireland)</option>
                        <option value="sa-east-1">South America (São Paulo)</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Select the region closest to your users</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowAddDomain(false)}
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddDomain}
                      disabled={addingDomain || !newDomainName.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingDomain && (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {addingDomain ? 'Adding...' : 'Add Domain'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Domain Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{domains.filter(d => d.status === 'verified').length}</div>
                    <div className="text-xs text-muted-foreground">Verified</div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{domains.filter(d => ['pending', 'not_started'].includes(d.status)).length}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{stats?.total_emails || 0}</div>
                    <div className="text-xs text-muted-foreground">Emails Sent</div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{stats?.total_emails ? Math.round((stats.delivered_count / stats.total_emails) * 100) : 100}%</div>
                    <div className="text-xs text-muted-foreground">Reputation</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Domain List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Your Domains</h3>
              </div>
              
              {domainsLoading ? (
                <div className="p-8 text-center">
                  <svg className="w-8 h-8 mx-auto text-muted-foreground animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-sm text-muted-foreground mt-2">Loading domains...</p>
                </div>
              ) : domains.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary border border-border mb-4">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-foreground mb-1">No domains configured</h4>
                  <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                    Add a custom domain to send emails with your own branding and improve deliverability.
                  </p>
                  <button 
                    onClick={() => setShowAddDomain(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Your First Domain
                  </button>
                </div>
              ) : (
                <>
                  {domains.map((domain) => (
                    <div key={domain.id} className="p-5 border-b border-border hover:bg-accent/30 transition-colors last:border-b-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-semibold text-foreground">{domain.name}</span>
                              {/* Status Badge */}
                              {domain.status === 'verified' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Verified
                                </span>
                              )}
                              {domain.status === 'pending' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Pending
                                </span>
                              )}
                              {domain.status === 'not_started' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                  Not Started
                                </span>
                              )}
                              {domain.status === 'failed' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                  Failed
                                </span>
                              )}
                              {domain.status === 'temporary_failure' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  Temporary Failure
                                </span>
                              )}
                              {domain.is_primary && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Region: {domain.region}</div>
                            {/* DNS Record Status */}
                            {domain.dns_records && domain.dns_records.length > 0 && (
                              <div className="flex items-center gap-4 mt-3">
                                {/* Group records by type */}
                                {['SPF', 'DKIM', 'DMARC'].map((recordType) => {
                                  const records = domain.dns_records.filter(r => r.record === recordType);
                                  if (records.length === 0) return null;
                                  const allVerified = records.every(r => r.status === 'verified');
                                  const anyPending = records.some(r => r.status === 'pending');
                                  return (
                                    <div key={recordType} className="flex items-center gap-1.5 text-xs">
                                      <span className={`w-2 h-2 rounded-full ${allVerified ? 'bg-emerald-500' : anyPending ? 'bg-amber-500' : 'bg-gray-500'}`}></span>
                                      <span className="text-muted-foreground">{recordType}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {domain.status !== 'verified' && (
                            <button 
                              onClick={() => handleVerifyDomain(domain.id)}
                              disabled={verifyingDomain === domain.id}
                              className="px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {verifyingDomain === domain.id ? 'Verifying...' : 'Verify'}
                            </button>
                          )}
                          <button 
                            onClick={() => setSelectedDomain(selectedDomain?.id === domain.id ? null : domain)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteDomain(domain.id)}
                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Expanded DNS Records */}
                      {selectedDomain?.id === domain.id && domain.dns_records && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h4 className="text-sm font-medium text-foreground mb-3">DNS Records</h4>
                          <p className="text-xs text-muted-foreground mb-4">{domain.status_description}</p>
                          <div className="space-y-3">
                            {domain.dns_records.map((record, idx) => (
                              <div key={idx} className="bg-secondary/50 rounded-lg p-4 border border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{record.record} Record</span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                      record.status === 'verified' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : record.status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                    }`}>
                                      {record.status === 'verified' ? '✓ Verified' : record.status === 'pending' ? 'Pending' : 'Not Started'}
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(record.value)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <div className="flex gap-4 text-xs mb-2">
                                  <div>
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="ml-2 font-mono text-foreground">{record.type}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Host:</span>
                                    <span className="ml-2 font-mono text-foreground">{record.name}</span>
                                  </div>
                                  {record.priority !== undefined && (
                                    <div>
                                      <span className="text-muted-foreground">Priority:</span>
                                      <span className="ml-2 font-mono text-foreground">{record.priority}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 bg-background rounded border border-border">
                                  <code className="text-xs text-emerald-400 font-mono break-all">{record.value}</code>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* DNS Configuration Guide */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-2">How to Verify Your Domain</h3>
                  <div className="text-sm text-muted-foreground space-y-3">
                    <p>To verify your domain and start sending emails, follow these steps:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-2">
                      <li>Add your domain using the &quot;Add Domain&quot; button above</li>
                      <li>Copy the DNS records provided for your domain</li>
                      <li>Add these records to your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.)</li>
                      <li>Wait for DNS propagation (can take up to 72 hours)</li>
                      <li>Click &quot;Verify&quot; to check if the records are properly configured</li>
                    </ol>
                    <p className="text-xs">
                      <strong>Note:</strong> SPF and DKIM records are required for verification. DMARC is recommended for better deliverability.
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <a href="https://docs.sendcomms.com/email/domains" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                      View Full Documentation →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
