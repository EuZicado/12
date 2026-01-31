import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Play, 
  Grid3X3, 
  Heart, 
  Bookmark, 
  TrendingUp,
  Eye,
  MessageCircle,
  Clock,
  Award,
  Zap,
  Star,
  Calendar,
  Users,
  Lock
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Post {
  id: string;
  content_url: string | null;
  content_type: "video" | "image" | "text";
  description: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number | null;
  shares_count: number | null;
  saves_count: number | null;
  engagement_score: number | null;
  tags?: string[];
}

interface AdvancedStats {
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  avgEngagement: number;
  topPerformingPost?: Post;
  engagementRate: number;
  weeklyGrowth: number;
}

interface ProfileStats {
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  avgEngagement: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { savedPosts, isLoading: savedLoading } = useSavedPosts();

  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "liked">("posts");
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "engagement">("recent");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select("id, content_url, content_type, description, created_at, likes_count, comments_count, shares_count, saves_count")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data || []);
      }
      setIsLoadingPosts(false);
    };

    if (user) {
      fetchUserPosts();
    }
  }, [user]);

  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (!user || activeTab !== "liked") return;

      setIsLoadingLiked(true);

      const { data: likes, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (likesError) {
        console.error("Error fetching likes:", likesError);
        setIsLoadingLiked(false);
        return;
      }

      if (!likes || likes.length === 0) {
        setLikedPosts([]);
        setIsLoadingLiked(false);
        return;
      }

      const postIds = likes.map((l) => l.post_id);

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, content_url, content_type, description, created_at, likes_count, comments_count, shares_count, saves_count")
        .in("id", postIds);

      if (postsError) {
        console.error("Error fetching posts:", postsError);
      } else {
        setLikedPosts(postsData || []);
      }

      setIsLoadingLiked(false);
    };

    fetchLikedPosts();
  }, [user, activeTab]);

  // Calculate advanced profile stats
  const calculateAdvancedStats = useCallback((): AdvancedStats => {
    if (posts.length === 0) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalSaves: 0,
        totalShares: 0,
        avgEngagement: 0,
        engagementRate: 0,
        weeklyGrowth: 0
      };
    }

    const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const totalSaves = posts.reduce((sum, p) => sum + (p.saves_count || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
    
    const avgEngagement = Math.round((totalLikes + totalComments + totalSaves + totalShares) / posts.length);
    
    // Find top performing post
    const topPerformingPost = [...posts].sort((a, b) => 
      (b.engagement_score || 0) - (a.engagement_score || 0)
    )[0];
    
    // Engagement rate calculation (simplified)
    const totalInteractions = totalLikes + totalComments + totalSaves + totalShares;
    const engagementRate = posts.length > 0 ? 
      Math.round((totalInteractions / posts.length) * 100) / 100 : 0;
    
    // Weekly growth (last 7 posts vs previous 7)
    const recentPosts = posts.slice(0, Math.min(7, posts.length));
    const olderPosts = posts.slice(Math.min(7, posts.length), Math.min(14, posts.length));
    
    const recentAvg = recentPosts.length > 0 ? 
      recentPosts.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / recentPosts.length : 0;
    const olderAvg = olderPosts.length > 0 ? 
      olderPosts.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / olderPosts.length : 0;
    
    const weeklyGrowth = olderAvg > 0 ? 
      Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

    return {
      totalLikes,
      totalComments,
      totalSaves,
      totalShares,
      avgEngagement,
      topPerformingPost,
      engagementRate,
      weeklyGrowth
    };
  }, [posts]);

  useEffect(() => {
    if (posts.length > 0) {
      setAdvancedStats(calculateAdvancedStats());
    }
  }, [posts, calculateAdvancedStats]);

  const handleTabChange = (tab: "posts" | "saved" | "liked") => {
    setActiveTab(tab);
  };

  const getCurrentPostsInternal = (): Post[] => {
    switch (activeTab) {
      case "saved":
        return savedPosts
          .filter((sp) => sp.post)
          .map((sp) => ({
            id: sp.post!.id,
            content_url: sp.post!.content_url,
            content_type: sp.post!.content_type as "video" | "image" | "text",
            description: sp.post!.description,
            created_at: sp.created_at,
            likes_count: sp.post!.likes_count,
            comments_count: 0,
            shares_count: 0,
            saves_count: 0,
            engagement_score: 0,
          }));
      case "liked":
        return likedPosts;
      default:
        return posts;
    }
  };

  const sortedPosts = useMemo(() => {
    let sorted = [...getCurrentPostsInternal()];
    
    switch (sortBy) {
      case "popular": 
        return sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      case "engagement": 
        return sorted.sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0));
      case "recent":
      default:
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [sortBy, activeTab, savedPosts, likedPosts, posts]);

  const getCurrentPosts = (): Post[] => {
    switch (activeTab) {
      case "saved":
        return savedPosts
          .filter((sp) => sp.post)
          .map((sp) => ({
            id: sp.post!.id,
            content_url: sp.post!.content_url,
            content_type: sp.post!.content_type as "video" | "image" | "text",
            description: sp.post!.description,
            created_at: sp.created_at,
            likes_count: sp.post!.likes_count,
            comments_count: 0,
            shares_count: 0,
            saves_count: 0,
          }));
      case "liked":
        return likedPosts;
      default:
        return posts;
    }
  };

  const isCurrentLoading = () => {
    switch (activeTab) {
      case "saved":
        return savedLoading;
      case "liked":
        return isLoadingLiked;
      default:
        return isLoadingPosts;
    }
  };

  const getEmptyState = () => {
    switch (activeTab) {
      case "saved":
        return {
          icon: Bookmark,
          title: "Nenhum post salvo",
          subtitle: "Posts que você salvar aparecerão aqui",
        };
      case "liked":
        return {
          icon: Heart,
          title: "Nenhum post curtido",
          subtitle: "Posts que você curtir aparecerão aqui",
        };
      default:
        return {
          icon: Grid3X3,
          title: "Nenhuma publicação",
          subtitle: "Suas postagens aparecerão aqui",
        };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Perfil não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  const getVerificationType = (): "none" | "blue" | "gold" | "staff" => {
    return profile.verification_type || "none";
  };

  const currentPosts = getCurrentPosts();
  const loading = isCurrentLoading();
  const emptyState = getEmptyState();

  return (
    <AppLayout>
      <ProfileHeader
        userId={user?.id}
        username={profile.username || "usuario"}
        displayName={profile.display_name || "Usuário"}
        avatarUrl={profile.avatar_url || undefined}
        bannerUrl={profile.banner_url || undefined}
        bio={profile.bio || undefined}
        followersCount={profile.followers_count || 0}
        followingCount={profile.following_count || 0}
        postsCount={profile.posts_count || posts.length}
        isVerified={profile.is_verified || false}
        verificationBadge={getVerificationType()}
        isOwnProfile={true}
        walletBalance={profile.wallet_balance || 0}
        onTabChange={handleTabChange}
      />

      {/* Advanced Stats Section */}
      {activeTab === "posts" && posts.length > 0 && advancedStats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-4 space-y-4"
        >
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdvancedStatCard
              icon={<Heart className="w-5 h-5 text-red-400" />}
              value={advancedStats.totalLikes}
              label="Curtidas"
              change={advancedStats.weeklyGrowth}
            />
            <AdvancedStatCard
              icon={<MessageCircle className="w-5 h-5 text-blue-400" />}
              value={advancedStats.totalComments}
              label="Comentários"
            />
            <AdvancedStatCard
              icon={<Bookmark className="w-5 h-5 text-yellow-400" />}
              value={advancedStats.totalSaves}
              label="Salvos"
            />
            <AdvancedStatCard
              icon={<TrendingUp className="w-5 h-5 text-green-400" />}
              value={advancedStats.avgEngagement}
              label="Engajamento"
              subtitle={`${advancedStats.engagementRate} média`}
            />
          </div>

          {/* Top Performing Post Card */}
          {advancedStats.topPerformingPost && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-4 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold text-foreground">Melhor Post</h3>
              </div>
              <div className="flex gap-3">
                {advancedStats.topPerformingPost.content_type === "image" && advancedStats.topPerformingPost.content_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={advancedStats.topPerformingPost.content_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate mb-1">
                    {advancedStats.topPerformingPost.description || "Sem descrição"}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {advancedStats.topPerformingPost.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {advancedStats.topPerformingPost.comments_count || 0}
                    </span>
                    <span className="text-[10px]">
                      {formatDistanceToNow(new Date(advancedStats.topPerformingPost.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-muted/40 rounded-full p-1 flex-1 max-w-md">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex-1 py-2 px-3 text-xs rounded-full transition-all ${
                  viewMode === "grid" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid3X3 className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 py-2 px-3 text-xs rounded-full transition-all ${
                  viewMode === "list" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListIcon className="w-4 h-4 mx-auto" />
              </button>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-muted/40 text-foreground text-xs py-2 px-3 rounded-full min-w-[120px] border-0"
            >
              <option value="recent">Mais Recentes</option>
              <option value="popular">Mais Populares</option>
              <option value="engagement">Maior Engajamento</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Posts Content */}
      <div className="pb-24">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          ) : sortedPosts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="empty-state"
            >
              <div className="empty-state-icon">
                <emptyState.icon className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground">{emptyState.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{emptyState.subtitle}</p>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-0.5"
            >
              {sortedPosts.map((post, index) => (
                <PostGridItem 
                  key={post.id} 
                  post={post} 
                  index={index} 
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 space-y-4"
            >
              {sortedPosts.map((post, index) => (
                <PostListItem 
                  key={post.id} 
                  post={post} 
                  index={index} 
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

const AdvancedStatCard = ({
  icon,
  value,
  label,
  change,
  subtitle
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  change?: number;
  subtitle?: string;
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="glass-card p-3 rounded-xl flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        {icon}
        {change !== undefined && (
          <span className={`text-xs flex items-center gap-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-3 h-3 ${change < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <span className="font-bold text-lg text-foreground">{formatNumber(value)}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground/70">{subtitle}</span>
      )}
    </div>
  );
};

const PostGridItem = ({
  post,
  index,
  formatTimeAgo
}: {
  post: Post;
  index: number;
  formatTimeAgo: (date: string) => string;
  key?: string;
}) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.02 }}
    className="aspect-square relative overflow-hidden tap-highlight-none group"
    onClick={() => {
      /* TODO: Navigate to post */
    }}
  >
    {post.content_type === "image" && post.content_url ? (
      <img
        src={post.content_url}
        alt={post.description || ""}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
    ) : post.content_type === "video" && post.content_url ? (
      <div className="w-full h-full bg-muted relative">
        <video
          src={post.content_url}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center p-3">
        <p className="text-xs text-muted-foreground line-clamp-3 text-center">
          {post.description || "Texto"}
        </p>
      </div>
    )}

    {/* Hover overlay with stats */}
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
      <div className="flex items-center gap-3 text-white">
        <div className="flex items-center gap-1 text-sm font-medium">
          <Heart className="w-4 h-4 fill-white" />
          {post.likes_count}
        </div>
        <div className="flex items-center gap-1 text-sm font-medium">
          <MessageCircle className="w-4 h-4" />
          {post.comments_count || 0}
        </div>
      </div>
      <span className="text-xs text-white/70">
        {formatTimeAgo(post.created_at)}
      </span>
    </div>
  </motion.button>
);

const PostListItem = ({
  post,
  index,
  formatTimeAgo
}: {
  post: Post;
  index: number;
  formatTimeAgo: (date: string) => string;
  key?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="glass-card rounded-xl p-3 flex gap-3"
  >
    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
      {post.content_type === "image" && post.content_url ? (
        <img
          src={post.content_url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
    </div>
    
    <div className="flex-1 min-w-0">
      <p className="text-sm text-foreground line-clamp-2 mb-2">
        {post.description || "Sem descrição"}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {post.comments_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="w-3 h-3" />
            {post.saves_count || 0}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(post.created_at)}
        </span>
      </div>
    </div>
  </motion.div>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const FileText = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export default Profile;
