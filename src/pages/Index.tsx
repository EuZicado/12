import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VideoCard } from "@/components/feed/VideoCard";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Bell, Search, RefreshCw, Sparkles, Users, Filter, TrendingUp, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FeedType = "forYou" | "following" | "trending" | "recent";

type SortOption = "latest" | "popular" | "engagement" | "random";

const BreYKLogo = () => (
  <svg 
    viewBox="0 0 120 32" 
    className="h-7 w-auto"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="hsl(211, 100%, 50%)" />
        <stop offset="100%" stopColor="hsl(175, 80%, 40%)" />
      </linearGradient>
    </defs>
    <text 
      x="0" 
      y="24" 
      className="fill-foreground"
      style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '24px',
        fontWeight: 800,
        letterSpacing: '2px'
      }}
    >
      BR
    </text>
    <g transform="translate(42, 4)">
      <rect fill="url(#logoGradient)" x="0" y="4" width="14" height="3" rx="1.5" />
      <rect fill="url(#logoGradient)" x="0" y="11" width="14" height="3" rx="1.5" />
      <rect fill="url(#logoGradient)" x="0" y="18" width="14" height="3" rx="1.5" />
    </g>
    <text 
      x="62" 
      y="24" 
      className="fill-foreground"
      style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '24px',
        fontWeight: 800,
        letterSpacing: '2px'
      }}
    >
      YK
    </text>
  </svg>
);

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { posts, isLoading: feedLoading, likePost, loadMore, hasMore, refresh } = useFeed();
  const { unreadCount } = useNotifications();
  const [feedType, setFeedType] = useState<FeedType>("forYou");
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile && !profile.onboarding_completed) {
      navigate("/onboarding");
    }
  }, [user, profile, authLoading, navigate]);

  // Enhanced feed algorithms
  const fetchFollowingPosts = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingFollowing(true);
    
    try {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows || follows.length === 0) {
        setFollowingPosts([]);
        setIsLoadingFollowing(false);
        return;
      }

      const followingIds = follows.map(f => f.following_id);

      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          id,
          content_url,
          content_type,
          description,
          likes_count,
          comments_count,
          shares_count,
          saves_count,
          engagement_score,
          created_at,
          creator_id,
          profiles:creator_id (
            username,
            display_name,
            avatar_url,
            is_verified,
            verification_type
          )
        `)
        .in("creator_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching following posts:", error);
        setIsLoadingFollowing(false);
        return;
      }

      const postsWithInteractions = await Promise.all(
        (postsData || []).map(async (post: any) => {
          const { data: like } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();

          return {
            ...post,
            creator_username: post.profiles?.username,
            creator_display_name: post.profiles?.display_name,
            creator_avatar_url: post.profiles?.avatar_url,
            creator_is_verified: post.profiles?.is_verified,
            creator_verification_type: post.profiles?.verification_type,
            is_liked: !!like,
          };
        })
      );

      setFollowingPosts(sortPosts(postsWithInteractions, sortBy));
    } catch (error) {
      console.error("Error in fetchFollowingPosts:", error);
      toast.error("Erro ao carregar posts");
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [user, sortBy]);

  const fetchTrendingPosts = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingTrending(true);
    
    try {
      // Get posts from last 7 days with high engagement
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          id,
          content_url,
          content_type,
          description,
          likes_count,
          comments_count,
          shares_count,
          saves_count,
          engagement_score,
          created_at,
          creator_id,
          profiles:creator_id (
            username,
            display_name,
            avatar_url,
            is_verified,
            verification_type
          )
        `)
        .gte("created_at", oneWeekAgo.toISOString())
        .order("engagement_score", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching trending posts:", error);
        setIsLoadingTrending(false);
        return;
      }

      const postsWithLikes = await Promise.all(
        (postsData || []).map(async (post: any) => {
          const { data: like } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();

          return {
            ...post,
            creator_username: post.profiles?.username,
            creator_display_name: post.profiles?.display_name,
            creator_avatar_url: post.profiles?.avatar_url,
            creator_is_verified: post.profiles?.is_verified,
            creator_verification_type: post.profiles?.verification_type,
            is_liked: !!like,
          };
        })
      );

      setTrendingPosts(sortPosts(postsWithLikes, sortBy));
    } catch (error) {
      console.error("Error in fetchTrendingPosts:", error);
      toast.error("Erro ao carregar tendências");
    } finally {
      setIsLoadingTrending(false);
    }
  }, [user, sortBy]);

  const fetchRecentPosts = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingRecent(true);
    
    try {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          id,
          content_url,
          content_type,
          description,
          likes_count,
          comments_count,
          shares_count,
          saves_count,
          engagement_score,
          created_at,
          creator_id,
          profiles:creator_id (
            username,
            display_name,
            avatar_url,
            is_verified,
            verification_type
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching recent posts:", error);
        setIsLoadingRecent(false);
        return;
      }

      const postsWithLikes = await Promise.all(
        (postsData || []).map(async (post: any) => {
          const { data: like } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();

          return {
            ...post,
            creator_username: post.profiles?.username,
            creator_display_name: post.profiles?.display_name,
            creator_avatar_url: post.profiles?.avatar_url,
            creator_is_verified: post.profiles?.is_verified,
            creator_verification_type: post.profiles?.verification_type,
            is_liked: !!like,
          };
        })
      );

      setRecentPosts(sortPosts(postsWithLikes, sortBy));
    } catch (error) {
      console.error("Error in fetchRecentPosts:", error);
      toast.error("Erro ao carregar posts recentes");
    } finally {
      setIsLoadingRecent(false);
    }
  }, [user, sortBy]);

  // Sort posts helper function
  const sortPosts = (posts: any[], sortOption: SortOption): any[] => {
    switch (sortOption) {
      case "popular": 
        return [...posts].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      case "engagement": 
        return [...posts].sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0));
      case "random":
        return [...posts].sort(() => Math.random() - 0.5);
      case "latest":
      default:
        return [...posts].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  };

  useEffect(() => {
    if (!user) return;
    
    switch (feedType) {
      case "following":
        fetchFollowingPosts();
        break;
      case "trending":
        fetchTrendingPosts();
        break;
      case "recent":
        fetchRecentPosts();
        break;
      default:
        // forYou uses the existing useFeed hook
        break;
    }
  }, [feedType, user, fetchFollowingPosts, fetchTrendingPosts, fetchRecentPosts]);

  // Re-sort when sortBy changes
  useEffect(() => {
    if (feedType === "following") {
      setFollowingPosts(prev => sortPosts(prev, sortBy));
    } else if (feedType === "trending") {
      setTrendingPosts(prev => sortPosts(prev, sortBy));
    } else if (feedType === "recent") {
      setRecentPosts(prev => sortPosts(prev, sortBy));
    }
  }, [sortBy, feedType]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Load more for "forYou" feed
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !feedLoading && feedType === "forYou") {
      loadMore();
    }
    
    // Parallax effect for header
    const scrollPercent = Math.min(scrollTop / 100, 1);
    const header = document.querySelector('header');
    if (header) {
      header.style.transform = `translateY(${scrollPercent * -10}px)`;
      header.style.opacity = `${1 - scrollPercent}`;
    }
  };

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    
    // Only trigger if scrolling from top
    if (scrollRef.current.scrollTop === 0 && diff > 50) {
      e.preventDefault();
      // Visual feedback could be added here
    }
  };

  const handleTouchEnd = async () => {
    const diff = currentYRef.current - startYRef.current;
    
    if (diff > 100) { // Pull threshold
      await handleRefresh();
    }
    
    startYRef.current = 0;
    currentYRef.current = 0;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      switch (feedType) {
        case "forYou":
          await refresh();
          break;
        case "following":
          await fetchFollowingPosts();
          break;
        case "trending":
          await fetchTrendingPosts();
          break;
        case "recent":
          await fetchRecentPosts();
          break;
      }
      
      toast.success("Feed atualizado!");
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Erro ao atualizar");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (feedType === "forYou") {
      await likePost(postId);
    } else {
      setFollowingPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                is_liked: !post.is_liked,
                likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1,
              }
            : post
        )
      );

      const post = followingPosts.find(p => p.id === postId);
      if (post?.is_liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user?.id);
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user?.id,
        });
      }
    }
  };

  const handlePostDeleted = (postId: string) => {
    if (feedType === "following") {
      setFollowingPosts(prev => prev.filter(p => p.id !== postId));
    }
    refresh();
  };

  // Get current posts based on feed type
  const getCurrentPosts = () => {
    switch (feedType) {
      case "forYou": return posts;
      case "following": return followingPosts;
      case "trending": return trendingPosts;
      case "recent": return recentPosts;
      default: return posts;
    }
  };

  const getCurrentLoading = () => {
    switch (feedType) {
      case "forYou": return feedLoading;
      case "following": return isLoadingFollowing;
      case "trending": return isLoadingTrending;
      case "recent": return isLoadingRecent;
      default: return feedLoading;
    }
  };

  const currentPosts = getCurrentPosts();
  const isCurrentLoading = getCurrentLoading();

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 safe-top">
        <div className="glass-strong px-4 py-2.5">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <BreYKLogo />
            </motion.div>
            
            <div className="flex items-center gap-1.5">
              {/* Feed Toggle */}
              <div className="feed-toggle">
                <button
                  onClick={() => setFeedType("forYou")}
                  className={`feed-toggle-item ${
                    feedType === "forYou" ? "feed-toggle-item-active" : "feed-toggle-item-inactive"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Para Você</span>
                </button>
                <button
                  onClick={() => setFeedType("following")}
                  className={`feed-toggle-item ${
                    feedType === "following" ? "feed-toggle-item-active" : "feed-toggle-item-inactive"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Seguindo</span>
                </button>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/discover")}
                className="rounded-full w-9 h-9"
              >
                <Search className="w-5 h-5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/notifications")}
                className="relative rounded-full w-9 h-9"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold text-destructive-foreground"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 80 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-30 flex justify-center"
          >
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Atualizando...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Feed */}
      <div 
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        onScroll={handleScroll}
      >
        {isCurrentLoading && currentPosts.length === 0 ? (
          <div className="h-screen w-full flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando feed...</p>
          </div>
        ) : currentPosts.length === 0 ? (
          <div className="h-screen w-full flex flex-col items-center justify-center text-center px-8">
            {feedType === "following" ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="empty-state"
              >
                <div className="empty-state-icon">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <p className="text-xl font-semibold mb-2">Ninguém para seguir</p>
                <p className="text-muted-foreground mb-6 max-w-[280px]">
                  Siga pessoas para ver seus posts aqui
                </p>
                <Button 
                  onClick={() => navigate("/discover")}
                  className="rounded-full px-6"
                >
                  Descobrir Pessoas
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="empty-state"
              >
                <div className="empty-state-icon">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <p className="text-xl font-semibold mb-2">Nenhum post ainda</p>
                <p className="text-muted-foreground mb-6 max-w-[280px]">
                  Seja o primeiro a compartilhar algo incrível!
                </p>
                <Button 
                  onClick={() => navigate("/create")}
                  className="rounded-full px-6"
                >
                  Criar Post
                </Button>
              </motion.div>
            )}
          </div>
        ) : (
          currentPosts.map((post) => (
            <VideoCard
              key={post.id}
              id={post.id}
              creatorId={post.creator_id}
              username={post.creator_username || "unknown"}
              displayName={post.creator_display_name || "Usuário"}
              avatar={post.creator_avatar_url || ""}
              description={post.description || ""}
              likes={post.likes_count}
              comments={post.comments_count}
              shares={post.shares_count}
              isVerified={post.creator_is_verified}
              verificationBadge={post.creator_verification_type === "gold" ? "gold" : post.creator_verification_type === "staff" ? "staff" : "blue"}
              thumbnailUrl={post.content_url || ""}
              isLiked={post.is_liked}
              onLike={() => handleLikePost(post.id)}
              onDeleted={() => handlePostDeleted(post.id)}
            />
          ))
        )}
        
        {feedLoading && posts.length > 0 && feedType === "forYou" && (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
