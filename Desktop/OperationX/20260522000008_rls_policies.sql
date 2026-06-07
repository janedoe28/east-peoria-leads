-- ============================================================================
-- COMMAND CENTER — Migration 008: Row Level Security
-- ----------------------------------------------------------------------------
-- Locks down all tables so:
--   - Unauthenticated requests (anon key, no session) → blocked everywhere
--   - Authenticated users (Katie, Miguel) → only their company's rows
--   - Service role (agents via Netlify) → bypasses RLS entirely (Supabase default)
--
-- Pattern:
--   1. user_company_access table maps auth.uid → company_id
--   2. my_company_ids() helper function (SECURITY DEFINER) returns allowed IDs
--   3. Enable RLS + create one ALL policy per table
-- ============================================================================

-- ============================================================================
-- STEP 1: user_company_access — maps auth users to companies they own
-- ============================================================================

CREATE TABLE user_company_access (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX idx_uca_user ON user_company_access(user_id);

-- Seed: give Katie and Miguel access to Digital Products Co.
-- Uses email lookup from auth.users so we don't need to know UIDs.
INSERT INTO user_company_access (user_id, company_id)
SELECT au.id, c.id
FROM auth.users au
CROSS JOIN companies c
WHERE au.email IN ('kaitlynleedesigns@gmail.com', 'migz1995@gmail.com')
  AND c.name = 'Digital Products Co.'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Helper function — returns company IDs for the calling auth user
-- SECURITY DEFINER so it can read user_company_access even after RLS is on.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.my_company_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM user_company_access WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- STEP 3: Enable RLS and add policies
-- ============================================================================

-- ── user_company_access (users see only their own rows) ─────────────────────
ALTER TABLE user_company_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uca_own_rows" ON user_company_access
  FOR ALL USING (user_id = auth.uid());

-- ── companies ───────────────────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_own" ON companies
  FOR ALL USING (id IN (SELECT my_company_ids()));

-- ── agents ──────────────────────────────────────────────────────────────────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_own" ON agents
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── projects ────────────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_own" ON projects
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── tasks (no direct company_id — link via agent_id) ────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_own" ON tasks
  FOR ALL USING (
    agent_id IN (
      SELECT id FROM agents WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- ── products ────────────────────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_own" ON products
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── customers ───────────────────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_own" ON customers
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── conversations ────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_own" ON conversations
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── events ──────────────────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_own" ON events
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── approvals ───────────────────────────────────────────────────────────────
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_own" ON approvals
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── templates ───────────────────────────────────────────────────────────────
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_own" ON templates
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── portfolio_thresholds ────────────────────────────────────────────────────
ALTER TABLE portfolio_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_thresholds_own" ON portfolio_thresholds
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── niche_research ───────────────────────────────────────────────────────────
ALTER TABLE niche_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "niche_research_own" ON niche_research
  FOR ALL USING (company_id IN (SELECT my_company_ids()));

-- ── pm_tool_calls (link via agent_id) ───────────────────────────────────────
ALTER TABLE pm_tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_tool_calls_own" ON pm_tool_calls
  FOR ALL USING (
    agent_id IN (
      SELECT id FROM agents WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- ── pm_context (link via agent_id) ──────────────────────────────────────────
ALTER TABLE pm_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_context_own" ON pm_context
  FOR ALL USING (
    agent_id IN (
      SELECT id FROM agents WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- ── product_assets (link via product_id → company_id) ───────────────────────
ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_assets_own" ON product_assets
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- ── listing_copy (link via product_id → company_id) ─────────────────────────
ALTER TABLE listing_copy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_copy_own" ON listing_copy
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- ── platform_listings (link via product_id → company_id) ────────────────────
ALTER TABLE platform_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_listings_own" ON platform_listings
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- ── channels (shared reference table — any authenticated user can read) ──────
-- No company ownership; channels like 'reddit', 'twitter' are global.
-- Block unauthenticated, allow all authenticated users to read, block writes.
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_read" ON channels
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- END OF MIGRATION 008
-- ============================================================================
