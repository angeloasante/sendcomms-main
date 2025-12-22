import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Communications API for Africa
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Send SMS, emails, airtime, and data bundles across Africa with a single, 
            unified API. Built for developers, trusted by businesses.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/dashboard" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Get Started Free
            </Link>
            <Link 
              href="/docs/introduction" 
              className="border border-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">One API, Multiple Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">SMS</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Send SMS to 50+ African countries with high delivery rates and real-time tracking.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Email</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Transactional and marketing emails with templates and analytics.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📞</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Airtime</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Top up mobile phones instantly across all major African carriers.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📶</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Data Bundles</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Purchase mobile data bundles for customers and employees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            Create your free account and start sending messages in minutes.
          </p>
          <Link 
            href="/dashboard" 
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-block"
          >
            Start Building
          </Link>
        </div>
      </section>
    </div>
  );
}
