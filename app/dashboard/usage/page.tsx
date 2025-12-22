'use client';

import { useState, useEffect } from 'react';

interface UsageData {
  minute: { used: number; limit: number; remaining: number };
  hour: { used: number; limit: number; remaining: number };
  day: { used: number; limit: number; remaining: number };
  month: { used: number; limit: number; remaining: number };
}

interface ServiceUsage {
  minute: { used: number; limit: number; remaining: number };
  day: { used: number; limit: number; remaining: number };
}

interface UsageResponse {
  plan: string;
  global: UsageData;
  services: {
    email: ServiceUsage;
    sms: ServiceUsage;
    airtime: ServiceUsage;
    data: ServiceUsage;
  };
}

function UsageBar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsage() {
      try {
        // In production, this would call the API with the user's API key
        // For demo purposes, we'll show placeholder data
        const mockUsage: UsageResponse = {
          plan: 'free',
          global: {
            minute: { used: 3, limit: 10, remaining: 7 },
            hour: { used: 25, limit: 100, remaining: 75 },
            day: { used: 150, limit: 1000, remaining: 850 },
            month: { used: 2500, limit: 10000, remaining: 7500 }
          },
          services: {
            email: { minute: { used: 2, limit: 10, remaining: 8 }, day: { used: 100, limit: 500, remaining: 400 } },
            sms: { minute: { used: 1, limit: 5, remaining: 4 }, day: { used: 50, limit: 100, remaining: 50 } },
            airtime: { minute: { used: 0, limit: 2, remaining: 2 }, day: { used: 5, limit: 50, remaining: 45 } },
            data: { minute: { used: 0, limit: 2, remaining: 2 }, day: { used: 3, limit: 50, remaining: 47 } }
          }
        };
        
        setUsage(mockUsage);
        setLoading(false);
      } catch (err) {
        setError('Failed to load usage data');
        setLoading(false);
      }
    }

    loadUsage();
    const interval = setInterval(loadUsage, 10000); // Refresh every 10s

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Usage</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Usage</h1>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-600 dark:text-red-400">
          {error || 'Failed to load usage data'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">API Usage</h1>
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
          {usage.plan.toUpperCase()} Plan
        </span>
      </div>

      {/* Global Rate Limits */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Rate Limits</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">This Minute</p>
            <p className="text-2xl font-bold">{usage.global.minute.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.global.minute.limit}
            </p>
            <UsageBar 
              used={usage.global.minute.used} 
              limit={usage.global.minute.limit} 
              color="bg-blue-600" 
            />
          </div>

          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">This Hour</p>
            <p className="text-2xl font-bold">{usage.global.hour.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.global.hour.limit}
            </p>
            <UsageBar 
              used={usage.global.hour.used} 
              limit={usage.global.hour.limit} 
              color="bg-green-600" 
            />
          </div>

          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
            <p className="text-2xl font-bold">{usage.global.day.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.global.day.limit}
            </p>
            <UsageBar 
              used={usage.global.day.used} 
              limit={usage.global.day.limit} 
              color="bg-yellow-600" 
            />
          </div>

          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
            <p className="text-2xl font-bold">{usage.global.month.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.global.month.limit}
            </p>
            <UsageBar 
              used={usage.global.month.used} 
              limit={usage.global.month.limit} 
              color="bg-purple-600" 
            />
          </div>
        </div>
      </div>

      {/* Service-Specific Usage */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Service Usage (Today)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📧</span>
              <h3 className="font-semibold">Email</h3>
            </div>
            <p className="text-2xl font-bold">{usage.services.email.day.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.services.email.day.limit} emails/day
            </p>
            <UsageBar 
              used={usage.services.email.day.used} 
              limit={usage.services.email.day.limit} 
              color="bg-green-500" 
            />
          </div>

          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📱</span>
              <h3 className="font-semibold">SMS</h3>
            </div>
            <p className="text-2xl font-bold">{usage.services.sms.day.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.services.sms.day.limit} SMS/day
            </p>
            <UsageBar 
              used={usage.services.sms.day.used} 
              limit={usage.services.sms.day.limit} 
              color="bg-blue-500" 
            />
          </div>

          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📞</span>
              <h3 className="font-semibold">Airtime</h3>
            </div>
            <p className="text-2xl font-bold">{usage.services.airtime.day.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.services.airtime.day.limit} purchases/day
            </p>
            <UsageBar 
              used={usage.services.airtime.day.used} 
              limit={usage.services.airtime.day.limit} 
              color="bg-yellow-500" 
            />
          </div>

          <div className="p-4 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📶</span>
              <h3 className="font-semibold">Data</h3>
            </div>
            <p className="text-2xl font-bold">{usage.services.data.day.used}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {usage.services.data.day.limit} purchases/day
            </p>
            <UsageBar 
              used={usage.services.data.day.used} 
              limit={usage.services.data.day.limit} 
              color="bg-purple-500" 
            />
          </div>
        </div>
      </div>

      {/* Low Quota Warning */}
      {usage.global.day.remaining < 100 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">
            ⚠️ You&apos;re running low on daily quota ({usage.global.day.remaining} requests remaining). 
            Consider <a href="/pricing" className="underline font-semibold">upgrading your plan</a>.
          </p>
        </div>
      )}
    </div>
  );
}
