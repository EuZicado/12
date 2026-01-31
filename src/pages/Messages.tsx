import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatPreview } from "@/components/messages/ChatPreview";
import { ChatView } from "@/components/messages/ChatView";
import { NewConversationSheet } from "@/components/messages/NewConversationSheet";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Edit, 
  Loader2, 
  MessageCircle, 
  Plus, 
  AlertCircle, 
  X, 
  Archive,
  Bell,
  BellOff,
  MoreVertical,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConversationList } from "@/hooks/messages";
import { usePresence } from "@/hooks/usePresence";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Messages = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { conversations, isLoading: messagesLoading, error, refetch } = useConversationList();
  const { onlineUsers } = usePresence();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setShowNewConversation(false);
  };

  const handleBackFromChat = () => {
    setSelectedConversation(null);
    refetch();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalConversations = conversations.length;
    const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    const onlineCount = conversations.filter((c) =>
      onlineUsers.includes(c.otherUser?.id || "")
    ).length;

    return { totalConversations, unreadCount, onlineCount };
  }, [conversations, onlineUsers]);

  if (authLoading || messagesLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-muted-foreground text-center">{error}</p>
          <Button variant="outline" onClick={refetch} className="rounded-full">
            Tentar novamente
          </Button>
        </div>
      </AppLayout>
    );
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.otherUser?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineConversations = conversations.filter((conv) =>
    onlineUsers.includes(conv.otherUser?.id || "")
  );

  if (selectedConversation) {
    return (
      <AppLayout hideNav>
        <ChatView conversationId={selectedConversation} onBack={handleBackFromChat} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="ios-nav-bar">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mensagens</h1>
              {stats.unreadCount > 0 && (
                <p className="text-sm text-primary">
                  {stats.unreadCount} {stats.unreadCount === 1 ? "não lida" : "não lidas"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full w-9 h-9">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivadas
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BellOff className="w-4 h-4 mr-2" />
                    Silenciadas
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir todas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewConversation(true)}
                className="rounded-full w-9 h-9"
              >
                <Edit className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          {conversations.length > 0 && (
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-muted-foreground">
                  {stats.onlineCount} online
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {stats.totalConversations} conversas
                </span>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-10 bg-muted/40 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Online Users */}
      <AnimatePresence>
        {onlineConversations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b border-border/50"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Online agora
            </p>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
              {onlineConversations.map((conv, index) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedConversation(conv.id)}
                  className="flex flex-col items-center gap-1.5 tap-highlight-none min-w-[64px]"
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14 ring-2 ring-success ring-offset-2 ring-offset-background">
                      <AvatarImage
                        src={conv.otherUser?.avatar_url || undefined}
                        alt={conv.otherUser?.display_name || ""}
                      />
                      <AvatarFallback className="text-lg font-semibold">
                        {conv.otherUser?.display_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-background" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[64px]">
                    {conv.otherUser?.display_name?.split(" ")[0] || "Usuário"}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversations List */}
      <div className="pb-24">
        {filteredConversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state"
          >
            <div className="empty-state-icon">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <p className="text-xl font-semibold mb-1">
              {searchQuery ? "Nenhum resultado" : "Nenhuma conversa"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">
              {searchQuery
                ? `Nenhuma conversa encontrada para "${searchQuery}"`
                : "Inicie uma conversa com alguém para começar"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowNewConversation(true)} className="rounded-full px-6">
                <Plus className="w-4 h-4 mr-2" />
                Nova Mensagem
              </Button>
            )}
          </motion.div>
        ) : (
          <div>
            {/* Unread Section */}
            {stats.unreadCount > 0 && (
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">
                  Não lidas ({stats.unreadCount})
                </p>
              </div>
            )}
            
            {filteredConversations
              .sort((a, b) => b.unreadCount - a.unreadCount)
              .map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <ChatPreview
                    id={conv.id}
                    username={conv.otherUser?.username || "usuario"}
                    displayName={conv.otherUser?.display_name || "Usuário"}
                    avatar={conv.otherUser?.avatar_url || undefined}
                    lastMessage={
                      conv.lastMessage?.audio_url
                        ? "🎤 Mensagem de voz"
                        : conv.lastMessage?.sticker_url
                        ? "🎨 Sticker"
                        : conv.lastMessage?.content || ""
                    }
                    timestamp={
                      conv.lastMessage?.created_at ? formatTime(conv.lastMessage.created_at) : ""
                    }
                    unreadCount={conv.unreadCount}
                    isOnline={onlineUsers.includes(conv.otherUser?.id || "")}
                    isVerified={conv.otherUser?.is_verified || false}
                    verificationBadge={conv.otherUser?.verification_type || "blue"}
                    index={index}
                    onClick={() => setSelectedConversation(conv.id)}
                  />
                  {index < filteredConversations.length - 1 && (
                    <div className="h-px bg-border/30 ml-[78px]" />
                  )}
                </motion.div>
              ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <AnimatePresence>
        {filteredConversations.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNewConversation(true)}
            className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/25 flex items-center justify-center z-20"
          >
            <Edit className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* New Conversation Sheet */}
      <NewConversationSheet
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onConversationCreated={handleConversationCreated}
      />
    </AppLayout>
  );
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default Messages;
