-- WeGrow Jobz CRM - Dedicated Supabase Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/gnysuxuizoehzyvttctu/sql

-- 1. Create JOBZ_LEADS (Candidates) table
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
    call_recording_uri TEXT,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobz_leads_phone ON public.jobz_leads(phone);
CREATE INDEX IF NOT EXISTS idx_jobz_leads_assigned_caller ON public.jobz_leads(assigned_caller);
CREATE INDEX IF NOT EXISTS idx_jobz_leads_stage ON public.jobz_leads(stage);

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
    qualification TEXT,
    passed_out_year TEXT,
    college_name TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT,
    status TEXT DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobz_followups_date ON public.jobz_follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobz_followups_caller ON public.jobz_follow_ups(caller_name);

-- 4. Create JOBZ_ATTENDANCE table
CREATE TABLE IF NOT EXISTS public.jobz_attendance (
    id TEXT PRIMARY KEY,
    caller_name TEXT NOT NULL,
    date TEXT NOT NULL,
    login_time TEXT,
    logout_time TEXT,
    punch_in_timestamp BIGINT,
    punch_out_timestamp BIGINT,
    working_hours_formatted TEXT,
    total_calls_today INTEGER DEFAULT 0,
    spoken_seconds INTEGER DEFAULT 0,
    idle_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Punched In',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobz_att_date_caller ON public.jobz_attendance(date, caller_name);

-- 5. Enable Row Level Security (RLS) & Public Policies
ALTER TABLE public.jobz_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobz_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobz_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobz_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for jobz_leads" ON public.jobz_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for jobz_calls" ON public.jobz_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for jobz_follow_ups" ON public.jobz_follow_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for jobz_attendance" ON public.jobz_attendance FOR ALL USING (true) WITH CHECK (true);

-- 6. Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobz_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobz_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobz_follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobz_attendance;
