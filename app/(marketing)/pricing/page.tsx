import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Pay only for what you use. No hidden fees, no long-term contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="border dark:border-gray-700 rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-2">Free</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Perfect for testing</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 100 SMS/month
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 1,000 emails/month
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> API access
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Webhooks
              </li>
            </ul>
            <Link 
              href="/dashboard" 
              className="block text-center border dark:border-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-blue-600 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm px-3 py-1 rounded-full">
              Most Popular
            </div>
            <h3 className="text-xl font-semibold mb-2">Pro</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">For growing businesses</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 5,000 SMS/month
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 50,000 emails/month
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Priority support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Custom sender IDs
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Analytics dashboard
              </li>
            </ul>
            <Link 
              href="/dashboard" 
              className="block text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="border dark:border-gray-700 rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">For large organizations</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">Custom</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Unlimited SMS
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Unlimited emails
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Dedicated support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> SLA guarantee
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Custom integrations
              </li>
            </ul>
            <Link 
              href="/about" 
              className="block text-center border dark:border-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Contact Sales
            </Link>
          </div>
        </div>

        {/* Pay As You Go */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Pay As You Go Rates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">SMS Rates</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Nigeria: $0.025/SMS</li>
                <li>Kenya: $0.030/SMS</li>
                <li>South Africa: $0.035/SMS</li>
                <li>Ghana: $0.028/SMS</li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Email Rates</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Transactional: $0.001/email</li>
                <li>Marketing: $0.002/email</li>
                <li>Bulk (10k+): Custom pricing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
