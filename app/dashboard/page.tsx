'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface DashboardStats {
  customer: {
    name: string;
    plan: string;
    balance: number;
  };
  today: {
    email: number;
    sms: number;
    airtime: number;
    data: number;
    total: number;
  };
  monthly: {
    email: number;
    sms: number;
    airtime: number;
    data: number;
    total: number;
  };
  serviceUsage: {
    email: number;
    sms: number;
    airtime: number;
    data: number;
  };
  deliveryStatus: {
    delivered: string;
    sent: string;
    failed: string;
    bounced: string;
  };
  regionStats: Record<string, number>;
  topEndpoints: Array<{
    path: string;
    requests: number;
    method: string;
    change: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    status: string;
    destination: string;
    recipientCount: number;
    createdAt: string;
    timeAgo: string;
  }>;
  counts: {
    webhooks: number;
    apiKeys: number;
  };
  lastUpdated: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('Loading...');

  const fetchStats = async () => {
    try {
      // Get API key from localStorage or session
      const apiKey = localStorage.getItem('sendcomms_api_key');
      
      if (!apiKey) {
        // Show demo data if no API key
        setStats(getDemoStats());
        setLastUpdated('Demo mode');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/v1/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setLastUpdated('just now');
      } else {
        throw new Error(data.error?.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      // Fall back to demo data
      setStats(getDemoStats());
      setLastUpdated('Demo mode');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    fetchStats();
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate conic gradient for donut chart
  const emailPct = stats.serviceUsage.email || 55;
  const smsPct = stats.serviceUsage.sms || 30;
  const airtimePct = stats.serviceUsage.airtime || 15;
  const conicGradient = `conic-gradient(#3b82f6 0% ${emailPct}%, #10b981 ${emailPct}% ${emailPct + smsPct}%, #f59e0b ${emailPct + smsPct}% 100%)`;

  return (
    <div className="p-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-white tracking-tight">API Command Center</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              All Systems Operational
            </span>
          </div>
          <p className="text-sm text-gray-500">Real-time monitoring • Last updated: {lastUpdated}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link 
            href="/dashboard/api-keys" 
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New API Key
          </Link>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-6">

        {/* Left Column (Main Charts) */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          
          {/* Map Card */}
          <div className="bg-[#121316] border border-white/5 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
              backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
            
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white">Global API Distribution</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">Request distribution across African regions</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-medium text-gray-400">
                  {Object.values(stats.regionStats).filter(v => v > 0).length} Active Regions
                </span>
              </div>
            </div>

            {/* Stylized Map Visualization */}
            <div className="relative h-64 w-full bg-[#16181b] rounded-lg border border-white/5 mb-6 overflow-hidden flex items-center justify-center">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                background: 'repeating-linear-gradient(45deg, #18181b, #18181b 2px, transparent 2px, transparent 4px)'
              }}></div>
              
              {/* Dot Pattern */}
              <svg viewBox="0 0 800 400" className="w-full h-full text-[#27272a] opacity-50 absolute">
                <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill="currentColor"></circle>
                </pattern>
                <rect width="800" height="400" fill="url(#dots)"></rect>
              </svg>

              {/* Active Pulse Points */}
              {stats.regionStats['West Africa'] > 0 && (
                <div className="absolute top-[45%] left-[48%] flex flex-col items-center group/point cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-[#16181b]"></span>
                  </span>
                  <div className="mt-2 px-2 py-1 bg-[#0b0c0e] border border-white/10 rounded text-[10px] text-white opacity-0 group-hover/point:opacity-100 transition-opacity absolute top-4 whitespace-nowrap z-20">
                    Lagos ({formatNumber(stats.regionStats['West Africa'])} req)
                  </div>
                </div>
              )}

              {stats.regionStats['East Africa'] > 0 && (
                <div className="absolute top-[50%] left-[55%] flex flex-col items-center group/point cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-[#16181b]"></span>
                  </span>
                  <div className="mt-2 px-2 py-1 bg-[#0b0c0e] border border-white/10 rounded text-[10px] text-white opacity-0 group-hover/point:opacity-100 transition-opacity absolute top-4 whitespace-nowrap z-20">
                    Nairobi ({formatNumber(stats.regionStats['East Africa'])} req)
                  </div>
                </div>
              )}
              
              {stats.regionStats['South Africa'] > 0 && (
                <div className="absolute top-[75%] left-[52%] flex flex-col items-center group/point cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border-2 border-[#16181b]"></span>
                  </span>
                  <div className="mt-2 px-2 py-1 bg-[#0b0c0e] border border-white/10 rounded text-[10px] text-white opacity-0 group-hover/point:opacity-100 transition-opacity absolute top-4 whitespace-nowrap z-20">
                    Cape Town ({formatNumber(stats.regionStats['South Africa'])} req)
                  </div>
                </div>
              )}

              {stats.regionStats['North Africa'] > 0 && (
                <div className="absolute top-[25%] left-[52%] flex flex-col items-center group/point cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-[#16181b]"></span>
                  </span>
                  <div className="mt-2 px-2 py-1 bg-[#0b0c0e] border border-white/10 rounded text-[10px] text-white opacity-0 group-hover/point:opacity-100 transition-opacity absolute top-4 whitespace-nowrap z-20">
                    Cairo ({formatNumber(stats.regionStats['North Africa'])} req)
                  </div>
                </div>
              )}

              {/* Central Africa pulse point */}
              {stats.regionStats['Central Africa'] > 0 && (
                <div className="absolute top-[55%] left-[50%] flex flex-col items-center group/point cursor-pointer">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border-2 border-[#16181b]"></span>
                  </span>
                  <div className="mt-2 px-2 py-1 bg-[#0b0c0e] border border-white/10 rounded text-[10px] text-white opacity-0 group-hover/point:opacity-100 transition-opacity absolute top-4 whitespace-nowrap z-20">
                    Kinshasa ({formatNumber(stats.regionStats['Central Africa'])} req)
                  </div>
                </div>
              )}

              {/* Show "No data" message if all regions are 0 */}
              {Object.values(stats.regionStats).every(v => v === 0) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No regional data yet</p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-400">West</span>
                </div>
                <span className="text-xs font-mono font-medium text-white">{formatNumber(stats.regionStats['West Africa'] || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-gray-400">East</span>
                </div>
                <span className="text-xs font-mono font-medium text-white">{formatNumber(stats.regionStats['East Africa'] || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-400">North</span>
                </div>
                <span className="text-xs font-mono font-medium text-white">{formatNumber(stats.regionStats['North Africa'] || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                  <span className="text-xs text-gray-400">South</span>
                </div>
                <span className="text-xs font-mono font-medium text-white">{formatNumber(stats.regionStats['South Africa'] || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                  <span className="text-xs text-gray-400">Central</span>
                </div>
                <span className="text-xs font-mono font-medium text-white">{formatNumber(stats.regionStats['Central Africa'] || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                  <span className="text-xs text-gray-400">Other</span>
                </div>
                <span className="text-xs font-mono font-medium text-white">{formatNumber(stats.regionStats['Other'] || 0)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Donut Chart Card */}
            <div className="bg-[#121316] border border-white/5 rounded-xl p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white">Service Usage</h3>
                <p className="text-xs text-gray-500 mt-1">Request distribution by endpoint type</p>
              </div>

              <div className="flex items-center justify-center mb-6">
                <div className="relative w-40 h-40 rounded-full" style={{
                  background: stats.monthly.total > 0 ? conicGradient : '#1e2024'
                }}>
                  <div className="absolute inset-4 bg-[#121316] rounded-full flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-white tracking-tight">{formatNumber(stats.monthly.total)}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-medium">Requests</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-gray-400">Email API</span>
                  </div>
                  <span className="text-xs font-mono text-white">{stats.serviceUsage.email}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-400">SMS API</span>
                  </div>
                  <span className="text-xs font-mono text-white">{stats.serviceUsage.sms}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-gray-400">Airtime</span>
                  </div>
                  <span className="text-xs font-mono text-white">{stats.serviceUsage.airtime}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-gray-400">Data</span>
                  </div>
                  <span className="text-xs font-mono text-white">{stats.serviceUsage.data}%</span>
                </div>
              </div>
            </div>

            {/* Bar Chart Card */}
            <div className="bg-[#121316] border border-white/5 rounded-xl p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white">Delivery Status</h3>
                <p className="text-xs text-gray-500 mt-1">Message delivery performance</p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Bar 1 */}
                <div className="group">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-mono">DELIVERED</span>
                    <span className="text-white font-mono">{stats.deliveryStatus.delivered}%</span>
                  </div>
                  <div className="w-full bg-[#1e2024] rounded-full h-6 relative overflow-hidden">
                    <div className="bg-green-500/30 absolute inset-0 rounded-full group-hover:bg-green-500/40 transition-colors duration-300" style={{ width: `${stats.deliveryStatus.delivered}%` }}></div>
                  </div>
                </div>

                {/* Bar 2 */}
                <div className="group">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-mono">SENT</span>
                    <span className="text-white font-mono">{stats.deliveryStatus.sent}%</span>
                  </div>
                  <div className="w-full bg-[#1e2024] rounded-full h-6 relative overflow-hidden">
                    <div className="bg-blue-500/30 absolute inset-0 rounded-full group-hover:bg-blue-500/40 transition-colors duration-300" style={{ width: `${stats.deliveryStatus.sent}%` }}></div>
                  </div>
                </div>

                {/* Bar 3 */}
                <div className="group">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-mono">FAILED</span>
                    <span className="text-white font-mono">{stats.deliveryStatus.failed}%</span>
                  </div>
                  <div className="w-full bg-[#1e2024] rounded-full h-6 relative overflow-hidden">
                    <div className="bg-red-500/30 absolute inset-0 rounded-full group-hover:bg-red-500/40 transition-colors duration-300" style={{ width: `${stats.deliveryStatus.failed}%` }}></div>
                  </div>
                </div>

                {/* Bar 4 */}
                <div className="group">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400 font-mono">BOUNCED</span>
                    <span className="text-white font-mono">{stats.deliveryStatus.bounced}%</span>
                  </div>
                  <div className="w-full bg-[#1e2024] rounded-full h-6 relative overflow-hidden">
                    <div className="bg-yellow-500/30 absolute inset-0 rounded-full group-hover:bg-yellow-500/40 transition-colors duration-300" style={{ width: `${stats.deliveryStatus.bounced}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column (Insights & Lists) */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#121316] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-gray-400">Emails Today</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(stats.today.email)}</div>
              <div className="text-[10px] text-gray-500 mt-1">
                {stats.monthly.email} this month
              </div>
            </div>
            <div className="bg-[#121316] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs text-gray-400">SMS Today</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(stats.today.sms)}</div>
              <div className="text-[10px] text-gray-500 mt-1">
                {stats.monthly.sms} this month
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-[#121316] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">Account Balance</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                {stats.customer.plan}
              </span>
            </div>
            <div className="text-2xl font-bold text-white">${stats.customer.balance.toFixed(2)}</div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="text-xs text-gray-400">{stats.counts.apiKeys} API keys</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs text-gray-400">{stats.counts.webhooks} webhooks</span>
              </div>
            </div>
          </div>

          {/* Top Endpoints */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-sm font-semibold text-white">Top Endpoints</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-900/40 text-green-400 border border-green-500/20">Live</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Most requested APIs this month</p>

            <div className="bg-[#121316] border border-white/5 rounded-xl overflow-hidden">
              {stats.topEndpoints.length > 0 ? (
                stats.topEndpoints.map((endpoint, index) => (
                  <Link 
                    key={endpoint.path}
                    href="/docs/api/email" 
                    className={`p-4 ${index < stats.topEndpoints.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/[0.02] transition-colors group cursor-pointer block`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-medium text-gray-300 group-hover:text-blue-400 transition-colors">{endpoint.path}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        endpoint.path.includes('email') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        endpoint.path.includes('sms') ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>{endpoint.method}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{formatNumber(endpoint.requests)} requests</span>
                      <span className={`text-[10px] font-medium flex items-center gap-0.5 ${endpoint.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={endpoint.change >= 0 ? "M7 17l9.2-9.2M17 17V7H7" : "M17 7l-9.2 9.2M7 7v10h10"} />
                        </svg>
                        {Math.abs(endpoint.change)}%
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-xs text-gray-500">No API calls yet</p>
                  <Link href="/docs/quickstart" className="text-xs text-indigo-400 hover:underline mt-1 inline-block">Get started →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              </div>
            </div>

            <div className="space-y-3">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="bg-[#121316] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        activity.type.includes('email') ? 'bg-blue-500/10 text-blue-400' :
                        activity.type === 'sms' ? 'bg-green-500/10 text-green-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {activity.type.includes('email') ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : activity.type === 'sms' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-semibold text-white capitalize">
                            {activity.type.replace('_', ' ')} {activity.status}
                          </h4>
                          <span className="text-[10px] text-gray-500">{activity.timeAgo}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {activity.recipientCount > 1 
                            ? `${activity.recipientCount} recipients` 
                            : activity.destination || 'No destination'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#121316] border border-white/5 rounded-xl p-6 text-center">
                  <p className="text-xs text-gray-500">No recent activity</p>
                  <Link href="/docs/quickstart" className="text-xs text-indigo-400 hover:underline mt-1 inline-block">Send your first message →</Link>
                </div>
              )}
            </div>

            {stats.recentActivity.length > 0 && (
              <button className="w-full mt-4 py-2 text-xs font-medium text-gray-400 bg-white/5 border border-white/5 rounded-lg hover:text-white hover:bg-white/10 transition-all">
                View All Activity
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Demo data for when no API key is present
function getDemoStats(): DashboardStats {
  return {
    customer: {
      name: 'Demo User',
      plan: 'free',
      balance: 0
    },
    today: {
      email: 0,
      sms: 0,
      airtime: 0,
      data: 0,
      total: 0
    },
    monthly: {
      email: 0,
      sms: 0,
      airtime: 0,
      data: 0,
      total: 0
    },
    serviceUsage: {
      email: 0,
      sms: 0,
      airtime: 0,
      data: 0
    },
    deliveryStatus: {
      delivered: '0.0',
      sent: '0.0',
      failed: '0.0',
      bounced: '0.0'
    },
    regionStats: {
      'West Africa': 0,
      'East Africa': 0,
      'North Africa': 0,
      'South Africa': 0,
      'Central Africa': 0,
      'Other': 0
    },
    topEndpoints: [],
    recentActivity: [],
    counts: {
      webhooks: 0,
      apiKeys: 0
    },
    lastUpdated: new Date().toISOString()
  };
}
