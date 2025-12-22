interface DocsPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const path = slug?.join('/') || 'introduction';
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex gap-8">
        <aside className="w-64 flex-shrink-0">
          <nav className="sticky top-8">
            <h3 className="font-semibold mb-4">Documentation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/docs/introduction" className="text-blue-600 hover:underline">Introduction</a>
              </li>
              <li>
                <a href="/docs/authentication" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Authentication</a>
              </li>
              <li>
                <a href="/docs/sms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">SMS API</a>
              </li>
              <li>
                <a href="/docs/email" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Email API</a>
              </li>
              <li>
                <a href="/docs/airtime" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Airtime API</a>
              </li>
              <li>
                <a href="/docs/data" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Data API</a>
              </li>
              <li>
                <a href="/docs/webhooks" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Webhooks</a>
              </li>
              <li>
                <a href="/docs/errors" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Error Handling</a>
              </li>
            </ul>
          </nav>
        </aside>
        
        <main className="flex-1 max-w-3xl">
          <h1 className="text-3xl font-bold mb-4 capitalize">{path.replace(/-/g, ' ')}</h1>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400">
              Documentation content for <code>{path}</code> will be loaded here.
            </p>
            
            <h2>Getting Started</h2>
            <p>
              Welcome to the SendComms API documentation. This API provides a unified interface 
              for sending SMS, emails, purchasing airtime, and data bundles across Africa.
            </p>
            
            <h2>Base URL</h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              https://api.sendcomms.com/v1
            </pre>
            
            <h2>Authentication</h2>
            <p>
              All API requests require authentication using an API key. Include your API key 
              in the <code>Authorization</code> header:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              Authorization: Bearer YOUR_API_KEY
            </pre>
          </div>
        </main>
      </div>
    </div>
  );
}
