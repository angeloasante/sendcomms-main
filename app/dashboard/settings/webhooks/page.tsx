export default function WebhooksSettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Webhook Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Webhook Endpoints</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure endpoints to receive real-time notifications</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Add Endpoint
          </button>
        </div>
        
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Events</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400" colSpan={4}>
                  No webhook endpoints configured.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2">Available Events</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• <code>sms.sent</code> - SMS successfully sent</li>
            <li>• <code>sms.delivered</code> - SMS delivered to recipient</li>
            <li>• <code>sms.failed</code> - SMS delivery failed</li>
            <li>• <code>email.sent</code> - Email successfully sent</li>
            <li>• <code>email.delivered</code> - Email delivered</li>
            <li>• <code>email.bounced</code> - Email bounced</li>
            <li>• <code>airtime.success</code> - Airtime purchase successful</li>
            <li>• <code>airtime.failed</code> - Airtime purchase failed</li>
            <li>• <code>data.success</code> - Data purchase successful</li>
            <li>• <code>data.failed</code> - Data purchase failed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
