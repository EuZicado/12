-- =============================================
-- LONIX - Auto Configuration SQL Script
-- Progressive Web App Social Ecosystem
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE TABLES
-- =============================================

-- Profiles table (enhanced)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_type TEXT CHECK (verification_type IN ('none', 'blue', 'gold', 'staff')) DEFAULT 'none',
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  is_private BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table (enhanced)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_url TEXT,
  content_type TEXT CHECK (content_type IN ('video', 'image', 'text')) NOT NULL,
  description TEXT,
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(10,2) DEFAULT 0.00,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ephemeral Content (The Void)
CREATE TABLE IF NOT EXISTS public.ephemeral_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_url TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('video', 'image', 'text')) NOT NULL,
  description TEXT,
  duration_hours INTEGER NOT NULL CHECK (duration_hours IN (6, 12, 24)),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Post Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Post Saves
CREATE TABLE IF NOT EXISTS public.post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment Likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system')) NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  sticker_url TEXT,
  audio_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Typing Indicators
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sticker Packs
CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_public BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stickers
CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES public.sticker_packs(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Purchases
CREATE TABLE IF NOT EXISTS public.user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pack_id UUID REFERENCES public.sticker_packs(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'moderator', 'admin')) DEFAULT 'user',
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Report Types
CREATE TABLE IF NOT EXISTS public.report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  report_type_id UUID REFERENCES public.report_types(id) NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'resolved', 'dismissed')) DEFAULT 'pending',
  moderator_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment/decrement counters
CREATE OR REPLACE FUNCTION increment_counter(table_name TEXT, column_name TEXT, id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = %I + 1 WHERE id = $1', table_name, column_name, column_name) USING id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_counter(table_name TEXT, column_name TEXT, id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = GREATEST(0, %I - 1) WHERE id = $1', table_name, column_name, column_name) USING id;
END;
$$ LANGUAGE plpgsql;

-- Calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(post_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  score DECIMAL(10,2);
BEGIN
  SELECT 
    COALESCE(likes_count, 0) * 1.0 +
    COALESCE(comments_count, 0) * 3.0 +
    COALESCE(shares_count, 0) * 5.0 +
    COALESCE(saves_count, 0) * 10.0
  INTO score
  FROM posts
  WHERE id = post_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON public.posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON public.conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sticker_packs_updated_at 
  BEFORE UPDATE ON public.sticker_packs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update engagement score on likes/comments
CREATE OR REPLACE FUNCTION update_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET engagement_score = calculate_engagement_score(NEW.post_id)
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET engagement_score = calculate_engagement_score(OLD.post_id)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_engagement_after_like
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION update_engagement_score();

CREATE TRIGGER update_post_engagement_after_comment
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_engagement_score();

-- Update counters
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_counter('profiles', 'following_count', NEW.follower_id);
    PERFORM increment_counter('profiles', 'followers_count', NEW.following_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_counter('profiles', 'following_count', OLD.follower_id);
    PERFORM decrement_counter('profiles', 'followers_count', OLD.following_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts_trigger
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Update post counts
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_counter('profiles', 'posts_count', NEW.creator_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_counter('profiles', 'posts_count', OLD.creator_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_post_count
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_post_count();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Disable RLS temporarily for setup
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_packs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Public posts are viewable by everyone" ON public.posts
  FOR SELECT USING (NOT is_private OR creator_id = auth.uid());

CREATE POLICY "Users can insert their own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = creator_id);

-- Ephemeral content policies
CREATE POLICY "Ephemeral content is viewable by everyone" ON public.ephemeral_content
  FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Users can insert their own ephemeral content" ON public.ephemeral_content
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Post interactions policies
CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Post saves are viewable by owner" ON public.post_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" ON public.post_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON public.post_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (TRUE);

-- Conversations policies
CREATE POLICY "Users can view conversations they're in" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id 
      AND user_id = auth.uid()
      AND left_at IS NULL
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
      AND left_at IS NULL
    )
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
      AND left_at IS NULL
    )
  );

-- Stickers policies
CREATE POLICY "Anyone can view approved public sticker packs" ON public.sticker_packs
  FOR SELECT USING (is_public = TRUE AND is_approved = TRUE);

CREATE POLICY "Users can view their own sticker packs" ON public.sticker_packs
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create sticker packs" ON public.sticker_packs
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their sticker packs" ON public.sticker_packs
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their sticker packs" ON public.sticker_packs
  FOR DELETE USING (auth.uid() = creator_id);

-- User purchases policies
CREATE POLICY "Users can view their purchases" ON public.user_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert purchases" ON public.user_purchases
  FOR INSERT WITH CHECK (TRUE);

-- Reports policies
CREATE POLICY "Users can report content" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AUTHENTICATION TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default report types
INSERT INTO public.report_types (name, description, severity) VALUES
  ('Spam', 'Unwanted commercial content or repetitive posts', 'low'),
  ('Harassment', 'Bullying or targeted harassment', 'high'),
  ('Hate Speech', 'Discriminatory content based on protected characteristics', 'high'),
  ('Violence', 'Threats of violence or harmful content', 'high'),
  ('Impersonation', 'Pretending to be someone else', 'medium'),
  ('Copyright', 'Unauthorized use of copyrighted material', 'medium'),
  ('Inappropriate Content', 'Sexually explicit or otherwise inappropriate content', 'medium')
ON CONFLICT (name) DO NOTHING;

-- Insert admin user (solone.suporte@gmail.com)
-- NOTE: This requires the user to already exist in auth.users
-- You can manually assign admin role after user registration:
-- INSERT INTO public.user_roles (user_id, role) 
-- SELECT id, 'admin' FROM auth.users WHERE email = 'solone.suporte@gmail.com';

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', TRUE),
  ('banners', 'banners', TRUE),
  ('posts', 'posts', TRUE),
  ('void', 'void', TRUE),
  ('stickers', 'stickers', TRUE),
  ('audio', 'audio', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Users can upload banners" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their banners" ON storage.objects
  FOR DELETE USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view posts" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload posts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their posts" ON storage.objects
  FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view void content" ON storage.objects
  FOR SELECT USING (bucket_id = 'void');

CREATE POLICY "Users can upload void content" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'void' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their void content" ON storage.objects
  FOR DELETE USING (bucket_id = 'void' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view stickers" ON storage.objects
  FOR SELECT USING (bucket_id = 'stickers');

CREATE POLICY "Users can upload stickers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their stickers" ON storage.objects
  FOR DELETE USING (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio');

CREATE POLICY "Users can upload audio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their audio" ON storage.objects
  FOR DELETE USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON public.posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement_score ON public.posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_ephemeral_expires_at ON public.ephemeral_content(expires_at);
CREATE INDEX IF NOT EXISTS idx_ephemeral_creator_id ON public.ephemeral_content(creator_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

CREATE INDEX IF NOT EXISTS idx_sticker_packs_creator_id ON public.sticker_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_is_public ON public.sticker_packs(is_public);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_sales_count ON public.sticker_packs(sales_count DESC);

CREATE INDEX IF NOT EXISTS idx_stickers_pack_id ON public.stickers(pack_id);

CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON public.user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_pack_id ON public.user_purchases(pack_id);

-- =============================================
-- CRON JOB SETUP (requires pg_cron extension)
-- =============================================

-- This should be run separately or via Supabase dashboard
-- SELECT cron.schedule(
--   'cleanup-ephemeral-content',
--   '*/15 * * * *', -- Every 15 minutes
--   $$DELETE FROM public.ephemeral_content WHERE expires_at < NOW()$$
-- );

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- \echo '✅ LONIX database schema successfully configured!'
-- \echo 'Next steps:'
-- \echo '1. Run the application and register the admin user (solone.suporte@gmail.com)'
-- \echo '2. Manually assign admin role: UPDATE user_roles SET role = ''admin'' WHERE user_id = (SELECT id FROM auth.users WHERE email = ''solone.suporte@gmail.com'')'
-- \echo '3. Configure Mercado Pago credentials in environment variables'
-- \echo '4. Set up cron job for ephemeral content cleanup'
