-- ============================================================
-- DecideFlow — Supabase Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- Enums (idempotent — skip if already exists)
-- ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_type') THEN
    CREATE TYPE vote_type AS ENUM ('simple', 'weighted', 'anonymous', 'two_round');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'decision_status') THEN
    CREATE TYPE decision_status AS ENUM ('draft', 'voting', 'passed', 'rejected', 'archived');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status') THEN
    CREATE TYPE execution_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
  END IF;
END $$;

-- ──────────────────────────────────────────────
-- Tables
-- ──────────────────────────────────────────────

-- 1. 用户资料 (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 团队
CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 团队成员
CREATE TABLE public.team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'member',
  weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
  nickname TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4. 决策
CREATE TABLE public.decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (length(title) <= 200),
  description TEXT,
  vote_type vote_type DEFAULT 'simple',
  status decision_status DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ,
  pass_threshold INTEGER DEFAULT 50 CHECK (pass_threshold >= 1 AND pass_threshold <= 100),
  total_score INTEGER,
  final_result TEXT CHECK (final_result IN ('passed', 'rejected')),
  round INTEGER DEFAULT 1 CHECK (round >= 1 AND round <= 2),
  ai_insight JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 投票选项
CREATE TABLE public.options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 500),
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 投票记录
CREATE TABLE public.votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  weight INTEGER DEFAULT 1 CHECK (weight >= 1),
  comment TEXT,
  round INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 每个用户在每轮只能投一票
  UNIQUE(decision_id, user_id, round)
);

-- 7. 评论
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 2000),
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 执行追踪
CREATE TABLE public.executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  status execution_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────
CREATE INDEX idx_decisions_team_id ON public.decisions(team_id);
CREATE INDEX idx_decisions_status ON public.decisions(status);
CREATE INDEX idx_decisions_created_at ON public.decisions(created_at DESC);
CREATE INDEX idx_options_decision_id ON public.options(decision_id);
CREATE INDEX idx_votes_decision_id ON public.votes(decision_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE INDEX idx_comments_decision_id ON public.comments(decision_id);
CREATE INDEX idx_executions_decision_id ON public.executions(decision_id);
CREATE INDEX idx_executions_assignee ON public.executions(assignee_id);

-- ──────────────────────────────────────────────
-- Row Level Security (RLS)
-- ──────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────
-- RLS Policies (idempotent — skip if already exists)
-- ──────────────────────────────────────────────

-- Profiles
DO $$ BEGIN
  CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Teams
DO $$ BEGIN
  CREATE POLICY "Team members can view team" ON public.teams
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Team Members
DO $$ BEGIN
  CREATE POLICY "Team members visible to members" ON public.team_members
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Decisions
DO $$ BEGIN
  CREATE POLICY "Team members can view decisions" ON public.decisions
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.team_members WHERE team_id = decisions.team_id AND user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Team members can create decisions" ON public.decisions
    FOR INSERT WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins and owner can update decisions" ON public.decisions
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = decisions.team_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
      OR auth.uid() = decisions.created_by
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Options
DO $$ BEGIN
  CREATE POLICY "Team members can view options" ON public.options
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.decisions d WHERE d.id = options.decision_id)
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Decision creators can manage options" ON public.options
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.decisions d
        WHERE d.id = options.decision_id AND d.created_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Votes
DO $$ BEGIN
  CREATE POLICY "Team members can view own votes" ON public.votes
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Team members can view anonymous aggregate" ON public.votes
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.decisions dec
        JOIN public.team_members tm ON tm.team_id = dec.team_id
        WHERE dec.id = votes.decision_id AND tm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Team members can vote" ON public.votes
    FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.decisions d
        JOIN public.team_members tm ON tm.team_id = d.team_id
        WHERE d.id = votes.decision_id AND tm.user_id = auth.uid()
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Comments
DO $$ BEGIN
  CREATE POLICY "Team members can comment" ON public.comments
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.decisions d
        JOIN public.team_members tm ON tm.team_id = d.team_id
        WHERE d.id = comments.decision_id AND tm.user_id = auth.uid()
      )
      OR auth.uid() = user_id
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Executions
DO $$ BEGIN
  CREATE POLICY "Team members can manage executions" ON public.executions
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.decisions d
        JOIN public.team_members tm ON tm.team_id = d.team_id
        WHERE d.id = executions.decision_id AND tm.user_id = auth.uid()
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ──────────────────────────────────────────────
-- Functions & Triggers
-- ──────────────────────────────────────────────

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_decisions_updated_at') THEN
    CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON public.decisions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_executions_updated_at') THEN
    CREATE TRIGGER update_executions_updated_at BEFORE UPDATE ON public.executions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_updated_at') THEN
    CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_members_updated_at') THEN
    CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Auto-close voting when time expires (optional, uses pg_cron or can be called manually)
--
-- NOTE: This function only handles time-based expiry. Vote result calculation (passed/rejected)
-- must be done by the vote route when a user votes and the threshold is met.
-- This function marks expired votings as 'rejected' if they haven't been closed yet.
CREATE OR REPLACE FUNCTION public.close_expired_votings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.decisions
  SET
    status = 'rejected',
    final_result = 'rejected'
  WHERE status = 'voting'
    AND voting_end IS NOT NULL
    AND voting_end < NOW();
END;
$$;

-- Grant usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
