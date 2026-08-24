-- Migration 016: close anon-key read access on two tables
--
-- `newsletter_subscribers` and `billing_events` were created without RLS, and
-- PostgREST exposes any RLS-less table in `public` to the anon key - which ships
-- publicly in the landing site's browser bundle. Verified before this migration:
-- an anon-key GET on /rest/v1/newsletter_subscribers returned every subscriber
-- row including email addresses.
--
-- Every writer of these tables is server-side and uses the service role
-- (sendcomms-landing newsletter/unsubscribe routes, backend Stripe webhook),
-- and the service role bypasses RLS, so enabling RLS changes no app behaviour.
--
-- Policies are service-role-only; customers read their own billing history
-- through the API, not directly from PostgREST.

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to newsletter_subscribers" ON newsletter_subscribers;
CREATE POLICY "Service role full access to newsletter_subscribers" ON newsletter_subscribers
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to billing_events" ON billing_events;
CREATE POLICY "Service role full access to billing_events" ON billing_events
    FOR ALL USING (auth.role() = 'service_role');

-- Customers may read their own billing audit trail (dashboard, via user JWT)
DROP POLICY IF EXISTS "Customers can view own billing events" ON billing_events;
CREATE POLICY "Customers can view own billing events" ON billing_events
    FOR SELECT USING (
        customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
    );
