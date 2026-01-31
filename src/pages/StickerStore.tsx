import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useStickers } from "@/hooks/useStickers";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Search, 
  Filter, 
  ShoppingCart, 
  Crown, 
  Star, 
  Coins,
  TrendingUp,
  Clock,
  User,
  Package,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface StickerPack {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  is_public: boolean;
  is_approved: boolean;
  sales_count: number;
  created_at: string;
  stickers?: Sticker[];
  creator?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  is_owned?: boolean;
}

interface Sticker {
  id: string;
  pack_id: string;
  image_url: string;
  emoji: string | null;
}

type SortOption = "popular" | "newest" | "price-low" | "price-high";
type FilterOption = "all" | "free" | "paid" | "owned";

const StickerStore = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { publicPacks, myPacks, ownedPacks, isLoading } = useStickers();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Combine all packs for display
  const allPacks = useMemo(() => {
    const ownedPackIds = new Set(ownedPacks.map(p => p.id));
    const myPackIds = new Set(myPacks.map(p => p.id));
    
    return publicPacks.map(pack => ({
      ...pack,
      is_owned: ownedPackIds.has(pack.id) || myPackIds.has(pack.id)
    }));
  }, [publicPacks, ownedPacks, myPacks]);

  // Filter and sort packs
  const filteredAndSortedPacks = useMemo(() => {
    let result = [...allPacks];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(pack => 
        pack.name.toLowerCase().includes(term) ||
        (pack.description && pack.description.toLowerCase().includes(term)) ||
        (pack.creator?.display_name && pack.creator.display_name.toLowerCase().includes(term)) ||
        (pack.creator?.username && pack.creator.username.toLowerCase().includes(term))
      );
    }
    
    // Apply category filter
    if (selectedCategory !== "all") {
      // In a real app, you'd have categories in the database
    }
    
    // Apply price filter
    switch (filterBy) {
      case "free":
        result = result.filter(pack => pack.price === 0);
        break;
      case "paid":
        result = result.filter(pack => pack.price > 0);
        break;
      case "owned":
        result = result.filter(pack => pack.is_owned);
        break;
      default:
        break;
    }
    
    // Apply sorting
    switch (sortBy) {
      case "popular":
        result.sort((a, b) => b.sales_count - a.sales_count);
        break;
      case "newest":
        result.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
    }
    
    return result;
  }, [allPacks, searchTerm, selectedCategory, filterBy, sortBy]);

  const categories = [
    { id: "all", name: "Todos", icon: Package },
    { id: "trending", name: "Em Alta", icon: TrendingUp },
    { id: "new", name: "Novos", icon: Clock },
    { id: "free", name: "Grátis", icon: Star },
    { id: "premium", name: "Premium", icon: Crown },
  ];

  const handlePurchase = async (pack: StickerPack) => {
    if (!user) {
      toast.error("Faça login para comprar");
      navigate("/auth");
      return;
    }

    if (pack.is_owned) {
      toast.info("Você já possui este pack!");
      return;
    }

    if (pack.price === 0) {
      // Free pack - direct download
      try {
        const { error } = await supabase
          .from("user_purchases")
          .insert({
            user_id: user.id,
            pack_id: pack.id,
            amount: 0,
            payment_id: "free_download"
          });

        if (error) throw error;
        
        toast.success("Pack adicionado à sua coleção!");
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error("Error claiming free pack:", error);
        toast.error("Erro ao adicionar pack");
      }
      return;
    }

    // Paid pack - redirect to checkout
    try {
      const response = await fetch("/functions/v1/sticker-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pack_id: pack.id,
          user_id: user.id,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erro no checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erro ao processar pagamento");
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? "Grátis" : `R$ ${price.toFixed(2)}`;
  };

  const PackCard = ({ pack }: { pack: StickerPack }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      className="glass-card rounded-xl overflow-hidden cursor-pointer group"
      onClick={() => navigate(`/stickers/pack/${pack.id}`)}
    >
      {/* Cover Image */}
      <div className="relative aspect-square bg-muted">
        {pack.cover_url ? (
          <img
            src={pack.cover_url}
            alt={pack.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Price Badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
          pack.price === 0 
            ? "bg-green-500/20 text-green-400 border border-green-500/30" 
            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
        }`}>
          {formatPrice(pack.price)}
        </div>
        
        {/* Owned Badge */}
        {pack.is_owned && (
          <div className="absolute top-3 right-3 bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded-full text-xs">
            Possuído
          </div>
        )}
        
        {/* Sales Count */}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white flex items-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          {pack.sales_count}
        </div>
      </div>
      
      {/* Pack Info */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{pack.name}</h3>
        
        {pack.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pack.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {pack.creator?.avatar_url ? (
              <img 
                src={pack.creator.avatar_url} 
                alt="" 
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              @{pack.creator?.username || "Criador"}
            </span>
          </div>
          
          <Button
            size="sm"
            variant={pack.is_owned ? "outline" : "default"}
            onClick={(e) => {
              e.stopPropagation();
              handlePurchase(pack);
            }}
            disabled={pack.is_owned && pack.price > 0}
            className="rounded-full text-xs h-8"
          >
            {pack.is_owned 
              ? (pack.price === 0 ? "Adicionado" : "Comprado") 
              : (pack.price === 0 ? "Adquirir" : "Comprar")
            }
          </Button>
        </div>
      </div>
    </motion.div>
  );

  if (!user) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <Package className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Loja de Stickers</h1>
            <p className="text-muted-foreground mb-6">
              Faça login para explorar e comprar pacotes de stickers incríveis
            </p>
            <Button 
              onClick={() => navigate("/auth")}
              className="rounded-full px-8"
            >
              Entrar
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Loja de Stickers</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedPacks.length} packs disponíveis
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-full"
            >
              <Filter className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/stickers/create")}
              className="rounded-full"
            >
              <Package className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar packs, criadores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </header>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card mx-4 mt-2 rounded-xl overflow-hidden"
          >
            <div className="p-4">
              {/* Categories */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Categorias</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                          selectedCategory === category.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Filters */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {([
                  { id: "all", label: "Todos" },
                  { id: "free", label: "Grátis" },
                  { id: "paid", label: "Pagos" },
                  { id: "owned", label: "Possuídos" }
                ] as const).map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterBy(filter.id)}
                    className={`py-2 px-3 rounded-lg text-sm transition-all ${
                      filterBy === filter.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {/* Sort Options */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Ordenar por</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "popular", label: "Mais Populares" },
                    { id: "newest", label: "Mais Recentes" },
                    { id: "price-low", label: "Menor Preço" },
                    { id: "price-high", label: "Maior Preço" }
                  ] as const).map((sort) => (
                    <button
                      key={sort.id}
                      onClick={() => setSortBy(sort.id)}
                      className={`py-2 px-3 rounded-lg text-sm transition-all ${
                        sortBy === sort.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="w-full mt-3"
              >
                Fechar Filtros
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="px-4 pb-24 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">Carregando stickers...</p>
          </div>
        ) : filteredAndSortedPacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pack encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Tente ajustar seus filtros ou buscar por algo diferente
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setFilterBy("all");
                setSelectedCategory("all");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-4"
          >
            <AnimatePresence>
              {filteredAndSortedPacks.map((pack) => (
                <PackCard key={pack.id} pack={pack} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate("/stickers/create")}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-lg flex items-center justify-center z-20"
      >
        <Package className="w-6 h-6 text-white" />
      </motion.button>
    </AppLayout>
  );
};

export default StickerStore;