-- Create profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  banner_url text,
  bio text,
  is_verified boolean default false,
  verification_type text,
  followers_count integer default 0,
  following_count integer default 0,
  posts_count integer default 0,
  wallet_balance numeric default 0,
  is_online boolean default false,
  last_seen_at timestamp with time zone default now(),
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create user_settings table
create table if not exists user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique not null,
  privacy jsonb,
  notifications jsonb,
  appearance jsonb,
  security jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create relationships table
create table if not exists relationships (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  status text default 'accepted' check (status in ('pending', 'accepted', 'blocked', 'muted')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(follower_id, following_id)
);

-- Create posts table
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  media_urls jsonb,
  media_type text,
  hashtags text[],
  mentions text[],
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  views_count integer default 0,
  visibility text default 'public' check (visibility in ('public', 'followers', 'private')),
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create likes table
create table if not exists likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  post_id uuid references posts(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

-- Create bookmarks table
create table if not exists bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  post_id uuid references posts(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

-- Create comments table
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  parent_id uuid references comments(id) on delete cascade,
  replies_count integer default 0,
  likes_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create conversations table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  participant_ids uuid[] not null,
  last_message_id uuid,
  unread_count integer default 0,
  is_archived boolean default false,
  is_muted boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text,
  media_url text,
  media_type text,
  audio_duration integer,
  sticker_url text,
  is_read boolean default false,
  is_delivered boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create message_reactions table
create table if not exists message_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references messages(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamp with time zone default now(),
  unique(message_id, user_id, emoji)
);

-- Create notifications table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null,
  actor_id uuid references profiles(id) on delete cascade,
  target_id text,
  target_type text,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now(),
  read_at timestamp with time zone
);

-- Create hashtags table
create table if not exists hashtags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  posts_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_profiles_username on profiles(username);
create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_relationships_follower on relationships(follower_id);
create index if not exists idx_relationships_following on relationships(following_id);
create index if not exists idx_posts_user_id on posts(user_id);
create index if not exists idx_posts_created_at on posts(created_at);
create index if not exists idx_likes_post_id on likes(post_id);
create index if not exists idx_comments_post_id on comments(post_id);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_hashtags_name on hashtags(name);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table relationships enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table bookmarks enable row level security;
alter table comments enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table message_reactions enable row level security;
alter table notifications enable row level security;
alter table hashtags enable row level security;

-- Profiles RLS policies
create policy "Profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- User settings RLS policies
create policy "Users can view their own settings" on user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert their own settings" on user_settings
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own settings" on user_settings
  for update using (auth.uid() = user_id);

-- Relationships RLS policies
create policy "Relationships are viewable by participants" on relationships
  for select using (auth.uid() = follower_id or auth.uid() = following_id);

create policy "Users can insert relationships" on relationships
  for insert with check (auth.uid() = follower_id);

create policy "Users can update relationships they participate in" on relationships
  for update using (auth.uid() = follower_id or auth.uid() = following_id);

-- Posts RLS policies
create policy "Public posts are viewable by everyone" on posts
  for select using (visibility = 'public');

create policy "Users can view followers-only posts" on posts
  for select using (
    visibility = 'followers' and 
    (user_id = auth.uid() or 
     exists (select 1 from relationships 
             where follower_id = auth.uid() 
             and following_id = posts.user_id 
             and status = 'accepted'))
  );

create policy "Users can view their own posts" on posts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own posts" on posts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own posts" on posts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own posts" on posts
  for delete using (auth.uid() = user_id);

-- Likes RLS policies
create policy "Likes are viewable by everyone" on likes
  for select using (true);

create policy "Users can insert their own likes" on likes
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own likes" on likes
  for delete using (auth.uid() = user_id);

-- Bookmarks RLS policies
create policy "Users can view their own bookmarks" on bookmarks
  for select using (auth.uid() = user_id);

create policy "Users can insert their own bookmarks" on bookmarks
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own bookmarks" on bookmarks
  for delete using (auth.uid() = user_id);

-- Comments RLS policies
create policy "Comments are viewable by everyone" on comments
  for select using (true);

create policy "Users can insert comments" on comments
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own comments" on comments
  for update using (auth.uid() = user_id);

create policy "Users can delete their own comments" on comments
  for delete using (auth.uid() = user_id);

-- Conversations RLS policies
create policy "Users can view their conversations" on conversations
  for select using (auth.uid() = any(participant_ids));

create policy "Users can insert conversations they participate in" on conversations
  for insert with check (auth.uid() = any(participant_ids));

create policy "Users can update their conversations" on conversations
  for update using (auth.uid() = any(participant_ids));

-- Messages RLS policies
create policy "Users can view messages in their conversations" on messages
  for select using (
    exists (select 1 from conversations 
            where id = messages.conversation_id 
            and auth.uid() = any(participant_ids))
  );

create policy "Users can insert messages in their conversations" on messages
  for insert with check (
    exists (select 1 from conversations 
            where id = messages.conversation_id 
            and auth.uid() = any(participant_ids))
  );

create policy "Users can update message read status" on messages
  for update using (auth.uid() = sender_id or auth.uid() = any(
    (select participant_ids from conversations where id = messages.conversation_id)
  ));

-- Notifications RLS policies
create policy "Users can view their own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "System can insert notifications" on notifications
  for insert with check (true);

create policy "Users can update their own notifications" on notifications
  for update using (auth.uid() = user_id);

-- Hashtags RLS policies
create policy "Hashtags are viewable by everyone" on hashtags
  for select using (true);

create policy "Authenticated users can insert hashtags" on hashtags
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update hashtags" on hashtags
  for update using (auth.role() = 'authenticated');