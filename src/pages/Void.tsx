import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VoidBubble } from "@/components/void/VoidBubble";
import { CreateVoidSheet } from "@/components/void/CreateVoidSheet";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Sparkles, Loader2, Plus, Flame, Zap, Filter, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVoid } from "@/hooks/useVoid";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Void = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { content, isLoading, getTimeRemaining } = useVoid();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [viewMode, setViewMode] = useState<"content" | "thoughts">("content");
  const [sortBy, setSortBy] = useState<"recent" | "expiring">("recent");
  const [showThoughtDialog, setShowThoughtDialog] = useState(false);
  const [quickThought, setQuickThought] = useState("");
  const [isCreatingThought, setIsCreatingThought] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="glass-strong px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Flame className="w-6 h-6 text-orange-500" />
              </motion.div>
              <h1 className="text-xl font-bold font-display">The Void</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowThoughtDialog(true)}
                className="rounded-full"
              >
                <Zap className="w-5 h-5" />
              </Button>
              <Button
                variant="neon"
                size="sm"
                onClick={() => setShowCreateSheet(true)}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Novo</span>
              </Button>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex bg-muted/40 rounded-full p-1 mb-3">
            <button
              onClick={() => setViewMode("content")}
              className={`flex-1 py-2 px-3 text-sm rounded-full transition-all ${
                viewMode === "content" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground"
              }`}
            >
              Conteúdos
            </button>
            <button
              onClick={() => setViewMode("thoughts")}
              className={`flex-1 py-2 px-3 text-sm rounded-full transition-all ${
                viewMode === "thoughts" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground"
              }`}
            >
              Pensamentos
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {content.length} itens efêmeros
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass-input text-xs py-1 px-2 rounded-full"
            >
              <option value="recent">Mais Recentes</option>
              <option value="expiring">Expirando</option>
            </select>
          </div>
        </div>
      </header>

      {/* Void Content Grid */}
      <div className="px-4 py-4 pb-24">
        {viewMode === "content" ? (
          <AnimatePresence mode="popLayout">
            {content.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Flame className="w-16 h-16 text-orange-500/50 mb-4" />
                </motion.div>
                <p className="text-lg font-medium text-muted-foreground mb-2">O Void está vazio</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Seja o primeiro a compartilhar!
                </p>
                <Button
                  variant="neon"
                  onClick={() => setShowCreateSheet(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar conteúdo
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-2 gap-3"
              >
                {content.map((item, index) => (
                  <VoidBubble
                    key={item.id}
                    id={item.id}
                    content={item.content_type === "text" ? item.text_content || "" : item.content_url || ""}
                    username={item.creator?.username || "unknown"}
                    avatar={item.creator?.avatar_url || ""}
                    expiresIn={getTimeRemaining(item.expires_at)}
                    type={item.content_type as "text" | "image"}
                    index={index}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Quick Thoughts View */
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Zap className="w-12 h-12 text-yellow-500/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pensamentos Rápidos</h3>
              <p className="text-muted-foreground mb-6 max-w-xs">
                Compartilhe pensamentos que expiram em 6 horas
              </p>
              <Button 
                onClick={() => setShowThoughtDialog(true)}
                className="rounded-full gap-2"
              >
                <Zap className="w-4 h-4" />
                Criar Pensamento
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => viewMode === "content" ? setShowCreateSheet(true) : setShowThoughtDialog(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-orange-500 flex items-center justify-center shadow-lg z-40"
      >
        {viewMode === "content" ? (
          <Plus className="w-6 h-6 text-primary-foreground" />
        ) : (
          <Zap className="w-6 h-6 text-primary-foreground" />
        )}
      </motion.button>

      {/* Gradient Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-void opacity-20" />

      {/* Create Sheet */}
      <CreateVoidSheet open={showCreateSheet} onClose={() => setShowCreateSheet(false)} />

      {/* Quick Thought Dialog */}
      {/* This would be implemented as a proper dialog component */}
      {showThoughtDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50 p-4">
          <div 
            className="bg-background w-full rounded-t-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Pensamento Rápido
              </h3>
              <button 
                onClick={() => setShowThoughtDialog(false)}
                className="p-2 hover:bg-muted rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <textarea
              value={quickThought}
              onChange={(e) => setQuickThought(e.target.value)}
              placeholder="O que está pensando?"
              className="w-full bg-muted rounded-xl p-4 mb-4 min-h-[120px] resize-none"
              maxLength={280}
            />
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-muted-foreground">
                {quickThought.length}/280
              </span>
              <span className="text-xs text-orange-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expira em 6h
              </span>
            </div>
            
            <Button
              onClick={async () => {
                if (!quickThought.trim()) return;
                setIsCreatingThought(true);
                try {
                  // Simulate API call
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  toast.success("Pensamento criado!");
                  setQuickThought("");
                  setShowThoughtDialog(false);
                } catch (error) {
                  toast.error("Erro ao criar pensamento");
                } finally {
                  setIsCreatingThought(false);
                }
              }}
              disabled={!quickThought.trim() || isCreatingThought}
              className="w-full rounded-full"
            >
              {isCreatingThought ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {isCreatingThought ? "Criando..." : "Publicar"}
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Void;
