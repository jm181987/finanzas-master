CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON public.push_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens" ON public.push_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tokens" ON public.push_tokens
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tokens" ON public.push_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tokens" ON public.push_tokens
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
