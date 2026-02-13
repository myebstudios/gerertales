
-- System Configuration Table for Global Engine Settings
CREATE TABLE IF NOT EXISTS public.system_config (
    id TEXT PRIMARY KEY DEFAULT 'global_settings',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read the config (needed for the app to function)
CREATE POLICY "System config is viewable by everyone" ON public.system_config FOR SELECT USING (true);

-- Only admins can update the config
-- Note: This assumes the 'profiles' table has an 'is_admin' or 'is_super_admin' flag
CREATE POLICY "Only admins can update system config" ON public.system_config 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
);

-- Insert initial default settings if not exists
INSERT INTO public.system_config (id, config)
VALUES ('global_settings', '{
  "textModel": "local-gemma",
  "imageModel": "imagen-3",
  "imageResolution": "1K",
  "ttsModel": "tts-1",
  "ttsProvider": "ai",
  "theme": "nordic-dark"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
