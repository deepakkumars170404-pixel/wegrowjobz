-- WeGrow CRM Jobz - Supabase SQL Schema for Dedicated Jobz Tables
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/gnysuxuizoehzyvttctu/sql)

-- 1. Create JOBZ_LEADS table
CREATE TABLE IF NOT EXISTS public.jobz_leads (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    course_interested TEXT,
    preferred_domain TEXT,
    experience_years TEXT,
    current_company TEXT,
    expected_salary TEXT,
    notice_period TEXT,
    lead_source TEXT DEFAULT 'Job Portal',
    status TEXT DEFAULT 'Interested',
    priority TEXT DEFAULT 'Warm',
    stage TEXT DEFAULT 'Interested',
    assigned_caller TEXT,
    city TEXT DEFAULT 'Tamil Nadu',
    enquiry_date TEXT,
    next_follow_up_date TEXT,
    next_follow_up_time TEXT,
    call_count INTEGER DEFAULT 0,
    qualification TEXT,
    passed_out_year TEXT,
    college_name TEXT,
    last_call_date TEXT,
    last_call_outcome TEXT,
    call_recording_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for phone number search and assigned staff
CREATE INDEX IF NOT EXISTS idx_jobz_leads_phone ON public.jobz_leads(phone);
CREATE INDEX IF NOT EXISTS idx_jobz_leads_assigned_caller ON public.jobz_leads(assigned_caller);
CREATE INDEX IF NOT EXISTS idx_jobz_leads_status ON public.jobz_leads(status);

-- 2. Create JOBZ_CALLS table
CREATE TABLE IF NOT EXISTS public.jobz_calls (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES public.jobz_leads(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    caller_name TEXT NOT NULL,
    call_date TEXT NOT NULL,
    call_time TEXT,
    duration TEXT,
    duration_formatted TEXT,
    duration_seconds INTEGER DEFAULT 0,
    from_time TEXT,
    end_time TEXT,
    outcome TEXT DEFAULT 'Attended Call',
    mindset TEXT DEFAULT 'Interested',
    course_interested TEXT,
    preferred_domain TEXT,
    experience_years TEXT,
    qualification TEXT,
    passed_out_year TEXT,
    college_name TEXT,
    remarks TEXT,
    call_recording_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for calls
CREATE INDEX IF NOT EXISTS idx_jobz_calls_lead_id ON public.jobz_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_jobz_calls_phone ON public.jobz_calls(phone);
CREATE INDEX IF NOT EXISTS idx_jobz_calls_caller_name ON public.jobz_calls(caller_name);
CREATE INDEX IF NOT EXISTS idx_jobz_calls_created_at ON public.jobz_calls(created_at DESC);

-- 3. Create JOBZ_FOLLOW_UPS table
CREATE TABLE IF NOT EXISTS public.jobz_follow_ups (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES public.jobz_leads(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    caller_name TEXT NOT NULL,
    course TEXT,
    preferred_domain TEXT,
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT,
    status TEXT DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobz_followups_scheduled_date ON public.jobz_follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobz_followups_caller_name ON public.jobz_follow_ups(caller_name);

-- 4. Enable Supabase Realtime for instant Web + Mobile updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobz_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobz_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobz_follow_ups;

-- 5. Open Row Level Security policies (Public read/write for telecalling app & web CRM)
ALTER TABLE public.jobz_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobz_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobz_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for jobz_leads" ON public.jobz_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for jobz_calls" ON public.jobz_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for jobz_follow_ups" ON public.jobz_follow_ups FOR ALL USING (true) WITH CHECK (true);
