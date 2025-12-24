'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PricingPlan {
  id: string;
  name: string;
  display_name?: string;
  displayName?: string;
  description: string;
  price_monthly?: number;
  price_yearly?: number;
  pricing?: {
    monthly: number;
    yearly: number;
  };
  sms_limit?: number;
  email_limit?: number;
  data_limit_gb?: number;
  airtime_limit_ghs?: number;
  limits?: {
    sms: number;
    emails: number;
    dataGb: number;
    airtimeGhs: number;
  };
  features: {
    sandbox?: string;
    support?: string;
    branding?: boolean;
    remove_branding?: boolean;
    webhooks?: boolean;
    slack_channel?: boolean;
    account_manager?: boolean;
    uptime_sla?: string;
    custom_sla?: boolean;
    business_reviews?: string;
  };
  uptimeSla?: string;
}

type BillingCycle = 'monthly' | 'yearly';
type PaymentMethod = 'card' | 'momo';

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get('plan');
  
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>(preselectedPlan || 'starter');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/v1/billing/plans');
      if (res.ok) {
        const data = await res.json();
        // Handle both {plans: [...]} and {data: [...]} response formats
        const allPlans = data.plans || data.data || [];
        // Filter out free and enterprise plans
        const paidPlans = allPlans.filter(
          (p: PricingPlan) => p.name !== 'free' && p.name !== 'enterprise' && 
            ((p.price_monthly && p.price_monthly > 0) || (p.pricing?.monthly && p.pricing.monthly > 0))
        );
        setPlans(paidPlans);
        if (!preselectedPlan && paidPlans.length > 0) {
          setSelectedPlan(paidPlans[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.name === selectedPlan);
  
  // Handle both API response formats
  const monthlyPrice = currentPlan?.price_monthly || currentPlan?.pricing?.monthly || 0;
  const yearlyPrice = currentPlan?.price_yearly || currentPlan?.pricing?.yearly || 0;
  const smsLimit = currentPlan?.sms_limit || currentPlan?.limits?.sms || 0;
  const emailLimit = currentPlan?.email_limit || currentPlan?.limits?.emails || 0;
  const dataLimit = currentPlan?.data_limit_gb || currentPlan?.limits?.dataGb || 0;
  const airtimeLimit = currentPlan?.airtime_limit_ghs || currentPlan?.limits?.airtimeGhs || 0;
  const planDisplayName = currentPlan?.display_name || currentPlan?.displayName || 'Select Plan';
  const planDescription = currentPlan?.description || '';
  
  const yearlyMonthlyEquivalent = yearlyPrice > 0 ? yearlyPrice / 12 : 0;
  const savings = monthlyPrice > 0 ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100) : 20;
  
  const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyMonthlyEquivalent;
  const totalPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  
  // Dynamic descriptions based on plan
  const getMonthlyDescription = () => {
    if (!currentPlan) return 'Pay month-to-month, cancel anytime.';
    return `Pay $${monthlyPrice}/month for ${planDisplayName}. Cancel anytime.`;
  };
  
  const getAnnualDescription = () => {
    if (!currentPlan) return 'Save with annual billing.';
    const yearlyTotal = yearlyPrice;
    return `$${yearlyTotal}/year (billed annually)`;
  };
  
  // Dynamic support description based on plan features
  const getSupportDescription = () => {
    const support = currentPlan?.features?.support;
    switch (support) {
      case 'email': return 'email support';
      case 'priority': return 'priority support and a dedicated Slack channel';
      case 'phone': return 'phone support and a dedicated account manager';
      case 'dedicated': return 'dedicated 24/7 support';
      default: return 'professional support';
    }
  };

  const handleSubscribe = async () => {
    if (!currentPlan) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      // Create Stripe Checkout session
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  const getFeaturesList = (plan: PricingPlan) => {
    const sms = plan.sms_limit || plan.limits?.sms || 0;
    const emails = plan.email_limit || plan.limits?.emails || 0;
    const data = plan.data_limit_gb || plan.limits?.dataGb || 0;
    const airtime = plan.airtime_limit_ghs || plan.limits?.airtimeGhs || 0;
    
    const features = [];
    if (sms) features.push(`${sms.toLocaleString()} SMS per month`);
    if (emails) features.push(`${emails.toLocaleString()} Emails per month`);
    if (data) features.push(`${data}GB Data bundles`);
    if (airtime) features.push(`GHS ${airtime} Airtime`);
    features.push('Unlimited sandbox testing');
    if (plan.features?.support) {
      const supportType = plan.features.support;
      if (supportType === 'email') features.push('Email support');
      else if (supportType === 'priority') features.push('Priority support');
      else if (supportType === 'phone') features.push('Phone support');
      else if (supportType === 'dedicated') features.push('Dedicated support');
      else features.push(`${supportType.charAt(0).toUpperCase() + supportType.slice(1)} support`);
    }
    if (plan.features?.remove_branding) features.push('Remove SendComms branding');
    if (plan.features?.webhooks) features.push('Webhook notifications');
    if (plan.features?.slack_channel) features.push('Dedicated Slack channel');
    if (plan.features?.account_manager) features.push('Dedicated account manager');
    if (plan.features?.custom_sla || plan.uptimeSla) {
      features.push(`${plan.uptimeSla || plan.features?.uptime_sla || '99.9%'} Uptime SLA`);
    }
    if (plan.features?.business_reviews) {
      features.push(`${plan.features.business_reviews.charAt(0).toUpperCase() + plan.features.business_reviews.slice(1)} business reviews`);
    }
    return features;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/billing" 
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Billing
          </Link>
          <h1 className="text-primary font-semibold text-lg">SendComms</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Plan Selection */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Upgrade Your SendComms Plan
            </h2>
            <p className="text-muted-foreground mb-8">
              Get unlimited access to all communication APIs in seconds.
            </p>

            {/* Plan Selection */}
            <div className="mb-8">
              <h3 className="font-semibold text-foreground mb-2">
                {planDisplayName}
              </h3>
              {planDescription && (
                <p className="text-sm text-muted-foreground mb-4">{planDescription}</p>
              )}
              
              <div className="space-y-3">
                {/* Monthly Option */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    billingCycle === 'monthly' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      billingCycle === 'monthly' ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {billingCycle === 'monthly' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Monthly Billing</p>
                      <p className="text-sm text-muted-foreground">{getMonthlyDescription()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-foreground">${monthlyPrice}</span>
                    <span className="text-muted-foreground text-sm"> / Month</span>
                  </div>
                  <input
                    type="radio"
                    name="billing"
                    value="monthly"
                    checked={billingCycle === 'monthly'}
                    onChange={() => setBillingCycle('monthly')}
                    className="sr-only"
                  />
                </label>

                {/* Annual Option */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    billingCycle === 'yearly' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      billingCycle === 'yearly' ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {billingCycle === 'yearly' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Annual Billing
                        {savings > 0 && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                            Save {savings}%
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{getAnnualDescription()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-foreground">${Math.round(yearlyMonthlyEquivalent)}</span>
                    <span className="text-muted-foreground text-sm"> / Month</span>
                  </div>
                  <input
                    type="radio"
                    name="billing"
                    value="yearly"
                    checked={billingCycle === 'yearly'}
                    onChange={() => setBillingCycle('yearly')}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Plan Switcher */}
            {plans.length > 1 && (
              <div className="mb-8">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Choose Plan</h4>
                <div className="flex flex-wrap gap-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.name)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedPlan === plan.name
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      {plan.display_name || plan.displayName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* What you'll unlock */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                What you&apos;ll unlock with {planDisplayName}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </h3>
              
              {currentPlan ? (
                <>
                  <ul className="space-y-2 mb-6">
                    {getFeaturesList(currentPlan).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <p className="text-sm text-muted-foreground">
                    Upgrade to {planDisplayName} and unlock powerful communication tools. 
                    Scale your workflows smoothly with {getSupportDescription()}.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a plan to see what&apos;s included.
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Payment Summary */}
          <div className="bg-card rounded-2xl border border-border p-6 h-fit">
            {/* Payment Method Tabs */}
            <div className="flex mb-6 bg-muted rounded-lg p-1">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'card'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay by Card
              </button>
              <button
                onClick={() => setPaymentMethod('momo')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'momo'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Pay by MoMo
              </button>
            </div>

            {/* Order Summary */}
            <div className="mb-6">
              <h4 className="font-semibold text-foreground mb-4">Order Summary</h4>
              
              {/* Plan Details */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-foreground">{planDisplayName}</h5>
                    <p className="text-xs text-muted-foreground">
                      {billingCycle === 'monthly' ? 'Monthly subscription' : 'Annual subscription'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    ${billingCycle === 'monthly' ? monthlyPrice : yearlyPrice}
                  </span>
                </div>
                
                {/* Included Features */}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SMS Credits</span>
                    <span className="text-foreground font-medium">{smsLimit.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Email Credits</span>
                    <span className="text-foreground font-medium">{emailLimit.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Data Bundles</span>
                    <span className="text-foreground font-medium">{dataLimit} GB</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Airtime</span>
                    <span className="text-foreground font-medium">GHS {airtimeLimit}</span>
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              {billingCycle === 'yearly' && savings > 0 && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
                  <span className="text-sm text-green-700 dark:text-green-400">Annual Savings</span>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    ${(monthlyPrice * 12 - yearlyPrice).toFixed(0)} ({savings}% off)
                  </span>
                </div>
              )}

              {/* Payment Method Info */}
              {paymentMethod === 'card' ? (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold italic">VISA</span>
                    </div>
                    <div className="w-8 h-5 bg-orange-500 rounded flex items-center justify-center">
                      <div className="flex">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full -ml-1"></div>
                      </div>
                    </div>
                    <div className="w-8 h-5 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-[7px] font-bold">AMEX</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Secure card payment via Stripe</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-8 h-5 bg-yellow-500 rounded flex items-center justify-center">
                      <span className="text-black text-[7px] font-bold">MTN</span>
                    </div>
                    <div className="w-8 h-5 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white text-[6px] font-bold">VODA</span>
                    </div>
                    <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-[6px] font-bold">TIGO</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Mobile Money payment</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-4 border-t border-border mb-4">
              <span className="font-medium text-foreground">Total Due Today</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">${billingCycle === 'yearly' ? totalPrice : displayPrice}</span>
                <p className="text-xs text-muted-foreground">
                  {billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
                </p>
              </div>
            </div>

            {/* Renewal Info */}
            <p className="text-xs text-muted-foreground mb-4 text-center">
              {billingCycle === 'monthly' 
                ? `Your subscription will automatically renew every month at $${monthlyPrice}.`
                : `Your subscription will automatically renew every year at $${yearlyPrice}.`}
              {' '}Cancel anytime.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handleSubscribe}
              disabled={processing}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Pay ${billingCycle === 'yearly' ? totalPrice : displayPrice} with {paymentMethod === 'card' ? 'Card' : 'MoMo'}
                </>
              )}
            </button>

            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>256-bit SSL encrypted • PCI DSS compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
