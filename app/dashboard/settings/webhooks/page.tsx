export default function WebhooksSettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-foreground mb-8">Webhook Settings</h1>
      
      <div className="bg-card border border-border p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Webhook Endpoints</h2>
            <p className="text-sm text-muted-foreground">Configure endpoints to receive real-time notifications</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Add Endpoint
          </button>
        </div>
        
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Events</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-6 py-4 text-sm text-muted-foreground" colSpan={4}>
                  No webhook endpoints configured.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 p-4 bg-secondary rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">Available Events</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <code className="bg-muted px-1 rounded">sms.sent</code> - SMS successfully sent</li>
            <li>• <code className="bg-muted px-1 rounded">sms.delivered</code> - SMS delivered to recipient</li>
            <li>• <code className="bg-muted px-1 rounded">sms.failed</code> - SMS delivery failed</li>
            <li>• <code className="bg-muted px-1 rounded">email.sent</code> - Email successfully sent</li>
            <li>• <code className="bg-muted px-1 rounded">email.delivered</code> - Email delivered</li>
            <li>• <code className="bg-muted px-1 rounded">email.bounced</code> - Email bounced</li>
            <li>• <code className="bg-muted px-1 rounded">airtime.success</code> - Airtime purchase successful</li>
            <li>• <code className="bg-muted px-1 rounded">airtime.failed</code> - Airtime purchase failed</li>
            <li>• <code className="bg-muted px-1 rounded">data.success</code> - Data purchase successful</li>
            <li>• <code className="bg-muted px-1 rounded">data.failed</code> - Data purchase failed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
