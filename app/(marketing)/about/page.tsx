export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">About SendComms</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            We're building the communication infrastructure that powers businesses across Africa.
          </p>
        </div>

        {/* Mission */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                To provide developers and businesses across Africa with reliable, affordable, 
                and easy-to-use communication APIs that enable them to connect with their customers.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                We believe that great communication tools should be accessible to everyone, 
                from startups to enterprises.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl h-64 flex items-center justify-center">
              <span className="text-6xl">🌍</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-12 mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-blue-600">50+</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Countries Covered</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-blue-600">1M+</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Messages Sent</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-blue-600">500+</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Happy Customers</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-blue-600">99.9%</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Uptime</p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-4">Our Team</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We're a diverse team of engineers, designers, and business professionals 
            passionate about connecting Africa.
          </p>
        </div>

        {/* Contact */}
        <div className="max-w-xl mx-auto text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Have questions? We'd love to hear from you.
          </p>
          <div className="space-y-3 text-left">
            <p className="flex items-center gap-3">
              <span>📧</span>
              <a href="mailto:hello@sendcomms.com" className="text-blue-600 hover:underline">
                hello@sendcomms.com
              </a>
            </p>
            <p className="flex items-center gap-3">
              <span>🐦</span>
              <a href="https://twitter.com/sendcomms" className="text-blue-600 hover:underline">
                @sendcomms
              </a>
            </p>
            <p className="flex items-center gap-3">
              <span>📍</span>
              <span className="text-gray-600 dark:text-gray-400">Lagos, Nigeria</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
