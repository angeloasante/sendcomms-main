'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DataLog {
  id: string;
  transaction_id: string;
  reference: string;
  phone_number: string;
  country_code: string;
  country_name: string;
  operator_id: string;
  operator_name: string;
  package_id: string;
  package_name: string;
  data_amount: string;
  validity: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  completed_at: string;
}

interface DataStats {
  total_purchases: number;
  pending_count: number;
  processing_count: number;
  successful_count: number;
  failed_count: number;
  refunded_count: number;
  last_24h_count: number;
  last_7d_count: number;
  last_30d_count: number;
  // Pricing data
  total_amount: number;
  amount_today: number;
  amount_this_week: number;
  amount_this_month: number;
  // Trend data
  daily_trend: { date: string; purchases: number; successful: number; amount: number }[];
  // Top operators
  top_operators: { name: string; count: number }[];
}

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'purchases'>('analytics');
  const [purchases, setPurchases] = useState<DataLog[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch data stats
      const statsResponse = await fetch('/api/v1/data/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent purchases
      const purchasesResponse = await fetch('/api/v1/data/logs?limit=50');
      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json();
        setPurchases(purchasesData.purchases || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Pending' },
      processing: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Processing' },
      successful: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Successful' },
      failed: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
      refunded: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Refunded' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
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
      minimumFractionDigits: 2,
    }).format(amount);
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
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Data Bundles Overview</h1>
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
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 rounded-lg shadow-lg shadow-cyan-500/20 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Purchase Data
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
                  ? 'text-foreground border-cyan-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('purchases')}
              className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none flex items-center gap-2 ${
                activeTab === 'purchases' 
                  ? 'text-foreground border-cyan-500' 
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Purchases
            </button>
          </nav>
        </div>

        {/* TAB: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Total Purchases */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">Total Purchases</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-semibold text-foreground tracking-tight">
                        {loading ? '...' : (stats?.total_purchases || 0)}
                      </span>
                      {stats && stats.last_7d_count > 0 && (
                        <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          +{stats.last_7d_count} this week
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats?.last_24h_count || 0} purchased today
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Successful</span>
                      <span className="text-foreground font-medium">{stats?.successful_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.successful_count || 0, stats?.total_purchases || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="text-foreground font-medium">{stats?.pending_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-gray-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.pending_count || 0, stats?.total_purchases || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Failed</span>
                      <span className="text-foreground font-medium">{stats?.failed_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.failed_count || 0, stats?.total_purchases || 1)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground font-medium">Success Rate</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-semibold text-foreground tracking-tight">
                        {loading ? '...' : `${stats?.total_purchases ? Math.round((stats.successful_count / stats.total_purchases) * 100) : 0}%`}
                      </span>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Healthy</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats?.successful_count || 0} completed successfully
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
                      <span className="text-muted-foreground">Processing</span>
                      <span className="text-foreground font-medium">{stats?.processing_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.processing_count || 0, stats?.total_purchases || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Refunded</span>
                      <span className="text-foreground font-medium">{stats?.refunded_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.refunded_count || 0, stats?.total_purchases || 1)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Failed</span>
                      <span className="text-foreground font-medium">{stats?.failed_count || 0}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.failed_count || 0, stats?.total_purchases || 1)}%` }}></div>
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
                      <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${getPercentage(stats?.last_24h_count || 0, stats?.last_30d_count || 1)}%` }}></div>
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
                  <h3 className="text-sm font-semibold text-foreground">Purchase Trend</h3>
                  <button className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:text-foreground rounded border border-border transition-colors">
                    Last 30 Days
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-medium mb-6">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Purchases
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Successful
                  </div>
                </div>

                {/* Simple Bar Chart */}
                {stats && stats.daily_trend && stats.daily_trend.length > 0 ? (
                  <div className="h-[200px] w-full flex items-end gap-1">
                    {stats.daily_trend.slice(-14).map((day, index) => {
                      const maxVal = Math.max(...stats.daily_trend.slice(-14).map(d => d.purchases), 1);
                      const purchasesHeight = (day.purchases / maxVal) * 100;
                      const dayLabel = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="w-full flex flex-col gap-0.5 h-[160px] items-center justify-end">
                            {day.purchases > 0 && (
                              <div 
                                className="w-full max-w-[20px] bg-cyan-500 rounded-t transition-all hover:bg-cyan-400"
                                style={{ height: `${Math.max(purchasesHeight, 4)}%` }}
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
                              <div className="text-cyan-400">Purchases: {day.purchases}</div>
                              <div className="text-emerald-400">Successful: {day.successful}</div>
                              <div className="text-amber-400">Amount: {formatCurrency(day.amount)}</div>
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
                      <p className="text-sm">Make some purchases to see the trend chart</p>
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
                    {formatCurrency(stats?.total_amount || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Data Spending</div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Purchases</span>
                    <span className="text-sm font-medium text-foreground">{stats?.successful_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg. per Purchase</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(stats?.successful_count ? (stats.total_amount / stats.successful_count) : 0)}
                    </span>
                  </div>
                  
                  <div className="h-px bg-border my-2"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Today</span>
                    <span className="text-sm font-medium text-emerald-400">{formatCurrency(stats?.amount_today || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">This Week</span>
                    <span className="text-sm font-medium text-blue-400">{formatCurrency(stats?.amount_this_week || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">This Month</span>
                    <span className="text-sm font-medium text-cyan-400">{formatCurrency(stats?.amount_this_month || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Purchases (Table) */}
        {activeTab === 'purchases' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Recent Purchases</h3>
                <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary px-2 py-1 rounded border border-border">
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">Transaction ID</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operator</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Package</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            Loading purchases...
                          </div>
                        </td>
                      </tr>
                    ) : purchases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                          <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                          </svg>
                          <p className="text-sm font-medium text-foreground mb-1">No data purchases yet</p>
                          <p className="text-xs text-muted-foreground">Data bundle purchases through the API will appear here</p>
                        </td>
                      </tr>
                    ) : (
                      purchases.map((purchase) => (
                        <tr key={purchase.id} className="group hover:bg-accent/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                            {purchase.transaction_id?.slice(0, 12) || purchase.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">{purchase.phone_number}</div>
                            {purchase.country_name && (
                              <div className="text-xs text-muted-foreground">{purchase.country_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {purchase.operator_name || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">{purchase.data_amount || '-'}</div>
                            {purchase.validity && (
                              <div className="text-xs text-muted-foreground">{purchase.validity}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {formatCurrency(purchase.amount)}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {formatShortDate(purchase.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(purchase.status)}
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
              {purchases.length > 0 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Showing {purchases.length} purchases
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

      </div>
    </div>
  );
}
