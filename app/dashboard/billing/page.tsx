'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Types - supports both direct DB format and API response format
interface PricingPlan {
  id?: string;
  name: string;
  displayName?: string;
  slug?: string;
  price_monthly?: number;
  price_yearly?: number | null;
  sms_limit?: number | null;
  email_limit?: number | null;
  data_limit_gb?: number | null;
  airtime_limit_ghs?: number | null;
  features?: string[] | Record<string, unknown>;
  is_popular?: boolean;
  // API response format
  pricing?: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  limits?: {
    sms: number;
    emails: number;
    dataGb: number;
    airtimeGhs: number;
  };
}

interface Subscription {
  id?: string;
  plan: PricingPlan;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start?: string;
  current_period_end?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  usage: {
    sms?: number;
    emails?: number;
    sms_used?: number;
    email_used?: number;
    data_used_gb?: number;
    dataMb?: number;
    airtime_used_ghs?: number;
    airtimeGhs?: number;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  amountPaid?: number;
  amountDue?: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  date: string;
  dueDate?: string | null;
  paidAt?: string | null;
  planName?: string;
  billingCycle?: string;
  pdfUrl?: string | null;
  hostedUrl?: string | null;
  currency?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile_money' | 'bank_transfer';
  provider: string | null;
  last_four: string;
  expiry_month: number | null;
  expiry_year: number | null;
  is_default: boolean;
}

type TabType = 'account' | 'members' | 'billing' | 'plans' | 'settings' | 'notifications' | 'api';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('billing');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const itemsPerPage = 8;

  const fetchBillingData = useCallback(async () => {
    try {
      // Fetch subscription, invoices, and payment methods in parallel
      const [subscriptionRes, invoicesRes, paymentMethodsRes] = await Promise.all([
        fetch('/api/v1/dashboard/billing'),
        fetch(`/api/v1/billing/invoices?page=${currentPage}&limit=${itemsPerPage}`),
        fetch('/api/v1/billing/payment-methods')
      ]);

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        // Handle both {data: ...} and direct response formats
        setSubscription(subData.data || subData);
      }

      if (invoicesRes.ok) {
        const invoiceData = await invoicesRes.json();
        setInvoices(invoiceData.invoices || []);
        setTotalInvoices(invoiceData.pagination?.total || 0);
      }

      if (paymentMethodsRes.ok) {
        const pmData = await paymentMethodsRes.json();
        setPaymentMethods(pmData.payment_methods || []);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Set up Supabase realtime subscription for usage updates
  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to changes on the subscriptions table
    const channel = supabase
      .channel('billing-usage-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          // Refetch billing data when subscription is updated
          fetchBillingData();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setIsLive(status === 'SUBSCRIBED');
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBillingData]);

  const tabs: { id: TabType; label: string; href?: string }[] = [
    { id: 'account', label: 'Account', href: '/dashboard/settings' },
    { id: 'members', label: 'Members', href: '/dashboard/settings' },
    { id: 'billing', label: 'Billing' },
    { id: 'plans', label: 'Plans', href: '/dashboard/settings' },
    { id: 'settings', label: 'Settings', href: '/dashboard/settings' },
    { id: 'notifications', label: 'Notifications', href: '/dashboard/settings' },
    { id: 'api', label: 'API', href: '/dashboard/api-keys' },
  ];

  // Use subscription data from API - normalize different response formats
  // API returns: { plan: { name, pricing: { monthly }, limits: { sms, emails } }, usage: { sms, emails } }
  const rawPlan = subscription?.plan;
  const planDetails = {
    name: rawPlan?.displayName || rawPlan?.name || 'Free Plan',
    price_monthly: rawPlan?.pricing?.monthly ?? rawPlan?.price_monthly ?? 0,
    sms_limit: rawPlan?.limits?.sms ?? rawPlan?.sms_limit ?? 50,
    email_limit: rawPlan?.limits?.emails ?? rawPlan?.email_limit ?? 500,
    data_limit_gb: rawPlan?.limits?.dataGb ?? rawPlan?.data_limit_gb ?? 1,
    airtime_limit_ghs: rawPlan?.limits?.airtimeGhs ?? rawPlan?.airtime_limit_ghs ?? 10
  };
  
  // Usage tracking for all services - handle both API response formats
  const rawUsage = subscription?.usage || {
    sms: 0,
    emails: 0,
    dataMb: 0,
    airtimeGhs: 0
  };
  
  // Normalize usage data to handle different property naming conventions
  const dataGbValue = (rawUsage as Record<string, number>).data_used_gb;
  const usage = {
    sms: (rawUsage as Record<string, number>).sms ?? (rawUsage as Record<string, number>).sms_used ?? 0,
    emails: (rawUsage as Record<string, number>).emails ?? (rawUsage as Record<string, number>).email_used ?? 0,
    dataMb: (rawUsage as Record<string, number>).dataMb ?? (dataGbValue ? dataGbValue * 1024 : 0),
    airtimeGhs: (rawUsage as Record<string, number>).airtimeGhs ?? (rawUsage as Record<string, number>).airtime_used_ghs ?? 0
  };
  
  // Calculate usage percentages
  const smsPercent = Math.min(((usage.sms || 0) / (planDetails.sms_limit || 50)) * 100, 100);
  const emailPercent = Math.min(((usage.emails || 0) / (planDetails.email_limit || 500)) * 100, 100);
  // Convert MB to GB for display
  const dataUsedGb = (usage.dataMb || 0) / 1024;
  const dataPercent = Math.min((dataUsedGb / (planDetails.data_limit_gb || 1)) * 100, 100);

  // Helper to get progress bar color
  const getProgressColor = (percent: number) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Pagination
  const totalPages = Math.ceil(totalInvoices / itemsPerPage);
  
  // Get default payment method
  const defaultPaymentMethod = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64 mb-8"></div>
          <div className="h-10 bg-muted rounded w-full max-w-2xl mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your billing and payment details.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          tab.href && tab.id !== 'billing' ? (
            <Link
              key={tab.id}
              href={tab.href}
              className="px-4 py-2 text-sm font-medium rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                activeTab === tab.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {tab.label}
            </button>
          )
        ))}
      </div>

      {/* Plan and Payment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Current Plan Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          {/* Live indicator */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {lastUpdated && `Updated ${lastUpdated.toLocaleTimeString()}`}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
              <span className="text-xs text-muted-foreground">{isLive ? 'Live' : 'Connecting...'}</span>
            </div>
          </div>

          {/* Payment Status Warning */}
          {subscription?.status === 'past_due' && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Payment Past Due</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                    We couldn&apos;t process your last payment. Please update your payment method to avoid service interruption.
                  </p>
                  <Link 
                    href="/dashboard/billing/upgrade" 
                    className="text-xs text-yellow-800 dark:text-yellow-200 underline mt-1 inline-block"
                  >
                    Update Payment Method
                  </Link>
                </div>
              </div>
            </div>
          )}

          {subscription?.status === 'cancelled' && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Subscription Cancelled</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Your subscription has been cancelled. You can still use the service until the end of your billing period.
                  </p>
                  <Link 
                    href="/dashboard/billing/upgrade" 
                    className="text-xs text-red-800 dark:text-red-200 underline mt-1 inline-block"
                  >
                    Resubscribe
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{planDetails.name}</h2>
                {subscription?.status && subscription.status !== 'active' && (
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    subscription.status === 'past_due' 
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : subscription.status === 'cancelled'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : subscription.status === 'trialing'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {subscription.status === 'past_due' ? 'Past Due' 
                      : subscription.status === 'trialing' ? 'Trial'
                      : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {planDetails.price_monthly === 0 
                  ? 'Free plan with limited monthly usage.' 
                  : `${planDetails.sms_limit?.toLocaleString()} SMS / ${planDetails.email_limit?.toLocaleString()} emails per month.`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">
                ${planDetails.price_monthly || 0}
              </span>
              <span className="text-muted-foreground text-sm"> / month</span>
            </div>
          </div>

          {/* Usage Progress - All Services */}
          <div className="space-y-3 mb-4">
            {/* SMS Usage */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  SMS
                </span>
                <span className="text-foreground font-medium">{usage.sms || 0} / {planDetails.sms_limit || 50}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(smsPercent)}`} style={{ width: `${smsPercent}%` }} />
              </div>
            </div>

            {/* Email Usage */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Emails
                </span>
                <span className="text-foreground font-medium">{usage.emails || 0} / {planDetails.email_limit || 500}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(emailPercent)}`} style={{ width: `${emailPercent}%` }} />
              </div>
            </div>

            {/* Data Usage */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  Data
                </span>
                <span className="text-foreground font-medium">{dataUsedGb.toFixed(2)} GB / {planDetails.data_limit_gb || 1} GB</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(dataPercent)}`} style={{ width: `${dataPercent}%` }} />
              </div>
            </div>
          </div>

          <Link 
            href="/dashboard/billing/upgrade"
            className="inline-block bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Upgrade
          </Link>
        </div>

        {/* Payment Method Card - Now shows subscription details */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Subscription Details</h2>
            <p className="text-sm text-muted-foreground">Your subscription billing information.</p>
          </div>

          {/* Billing Dates */}
          <div className="space-y-4 mb-6">
            {/* Next Payment Date */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Next Payment</p>
                  <p className="text-xs text-muted-foreground">
                    {subscription?.currentPeriodEnd 
                      ? formatDate(subscription.currentPeriodEnd)
                      : subscription?.current_period_end
                        ? formatDate(subscription.current_period_end)
                        : 'No upcoming payment'}
                  </p>
                </div>
              </div>
              <span className="text-lg font-semibold text-foreground">
                ${planDetails.price_monthly}/mo
              </span>
            </div>

            {/* Last Payment Date */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Last Payment</p>
                  <p className="text-xs text-muted-foreground">
                    {subscription?.currentPeriodStart 
                      ? formatDate(subscription.currentPeriodStart)
                      : subscription?.current_period_start
                        ? formatDate(subscription.current_period_start)
                        : 'No previous payment'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Paid
              </span>
            </div>
          </div>

          {/* Cancel Subscription Button */}
          {planDetails.price_monthly > 0 && (
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
                  // Handle cancellation
                  fetch('/api/v1/billing/subscription/cancel', { method: 'POST' })
                    .then(res => {
                      if (res.ok) {
                        window.location.reload();
                      }
                    });
                }
              }}
              className="w-full py-2.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-card border border-border rounded-lg">
        {/* Invoices Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
            <p className="text-sm text-muted-foreground">Access all your previous invoices.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-accent transition-colors text-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All
          </button>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Invoice</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* PDF Icon */}
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {invoice.invoiceNumber}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(invoice.date)}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">${invoice.amount.toFixed(2)}</td>
                    <td className="p-4 text-sm text-muted-foreground">{invoice.planName || 'Subscription'}</td>
                    <td className="p-4 text-right">
                      {invoice.pdfUrl ? (
                        <a 
                          href={invoice.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Download
                        </a>
                      ) : invoice.hostedUrl ? (
                        <a 
                          href={invoice.hostedUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <span className="text-sm text-muted-foreground">
            {totalInvoices > 0 
              ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalInvoices)} of ${totalInvoices}`
              : '0 invoices'
            }
          </span>
        </div>
      </div>
    </div>
  );
}
