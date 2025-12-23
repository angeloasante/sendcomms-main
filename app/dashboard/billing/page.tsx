export default function BillingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-foreground mb-8">Billing</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card border border-border p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Current Plan</h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-foreground">Free Plan</p>
                <p className="text-sm text-muted-foreground">1,000 SMS / 10,000 Emails per month</p>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                Upgrade Plan
              </button>
            </div>
          </div>
          
          <div className="bg-card border border-border p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-foreground mb-4">Payment History</h2>
            <p className="text-muted-foreground">No payment history available.</p>
          </div>
        </div>
        
        <div>
          <div className="bg-card border border-border p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-foreground mb-4">Payment Method</h2>
            <p className="text-muted-foreground mb-4">No payment method on file.</p>
            <button className="w-full bg-secondary hover:bg-accent text-foreground px-4 py-2 rounded-lg border border-border">
              Add Payment Method
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
