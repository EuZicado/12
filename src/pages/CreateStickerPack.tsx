import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Package, 
  Image, 
  Crown,
  DollarSign,
  Save,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface StickerFile {
  id: string;
  file: File;
  preview: string;
  emoji: string;
}

const CreateStickerPack = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [packName, setPackName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [isPublic, setIsPublic] = useState(true);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [stickers, setStickers] = useState<StickerFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processStickerFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files) as File[];
      processStickerFiles(files);
    }
  };

  const processStickerFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      toast.error("Por favor, selecione apenas arquivos de imagem");
      return;
    }

    if (stickers.length + imageFiles.length > 50) {
      toast.error("Máximo de 50 stickers por pack");
      return;
    }

    const newStickers = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      emoji: ""
    }));

    setStickers(prev => [...prev, ...newStickers]);
  };

  const removeSticker = (id: string) => {
    setStickers(prev => {
      const sticker = prev.find(s => s.id === id);
      if (sticker) {
        URL.revokeObjectURL(sticker.preview);
      }
      return prev.filter(s => s.id !== id);
    });
  };

  const updateStickerEmoji = (id: string, emoji: string) => {
    setStickers(prev => 
      prev.map(sticker => 
        sticker.id === id ? { ...sticker, emoji } : sticker
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Faça login para criar um pack");
      return;
    }

    if (!packName.trim()) {
      toast.error("Nome do pack é obrigatório");
      return;
    }

    if (stickers.length === 0) {
      toast.error("Adicione pelo menos 1 sticker");
      return;
    }

    if (stickers.length < 3) {
      toast.error("Mínimo de 3 stickers por pack");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload cover image
      let coverUrl = null;
      if (coverImage) {
        const coverFileName = `${user.id}/${Date.now()}-cover-${coverImage.name}`;
        const { data: coverData, error: coverError } = await supabase.storage
          .from("stickers")
          .upload(coverFileName, coverImage);

        if (coverError) throw coverError;
        
        const { data: coverUrlData } = supabase.storage
          .from("stickers")
          .getPublicUrl(coverData.path);
        
        coverUrl = coverUrlData.publicUrl;
      }

      // Create pack
      const { data: packData, error: packError } = await supabase
        .from("sticker_packs")
        .insert({
          creator_id: user.id,
          name: packName.trim(),
          description: description.trim() || null,
          cover_url: coverUrl,
          price: parseFloat(price) || 0,
          is_public: isPublic,
          is_approved: price === "0" // Free packs auto-approved
        })
        .select()
        .single();

      if (packError) throw packError;

      // Upload stickers
      const uploadedStickers = [];
      for (const sticker of stickers) {
        const fileName = `${user.id}/${packData.id}/${Date.now()}-${sticker.file.name}`;
        const { data: fileData, error: fileError } = await supabase.storage
          .from("stickers")
          .upload(fileName, sticker.file);

        if (fileError) throw fileError;

        const { data: urlData } = supabase.storage
          .from("stickers")
          .getPublicUrl(fileData.path);

        uploadedStickers.push({
          pack_id: packData.id,
          image_url: urlData.publicUrl,
          emoji: sticker.emoji || null
        });
      }

      // Insert stickers
      const { error: stickersError } = await supabase
        .from("stickers")
        .insert(uploadedStickers);

      if (stickersError) throw stickersError;

      toast.success("Pack criado com sucesso!");
      
      // Clean up object URLs
      stickers.forEach(sticker => URL.revokeObjectURL(sticker.preview));
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      
      // Navigate to store
      navigate("/stickers");
      
    } catch (error) {
      console.error("Error creating pack:", error);
      toast.error("Erro ao criar pack");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StickerItem = ({ sticker }: { sticker: StickerFile }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative group"
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/20">
        <img
          src={sticker.preview}
          alt="Sticker preview"
          className="w-full h-full object-cover"
        />
      </div>
      
      <button
        onClick={() => removeSticker(sticker.id)}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      
      <div className="mt-2">
        <Input
          placeholder="Emoji"
          value={sticker.emoji}
          onChange={(e) => updateStickerEmoji(sticker.id, e.target.value)}
          className="text-center text-lg h-10"
          maxLength={2}
        />
      </div>
    </motion.div>
  );

  if (!user) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <Package className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Criar Pack de Stickers</h1>
            <p className="text-muted-foreground mb-6">
              Faça login para criar seu próprio pack de stickers
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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div>
            <h1 className="text-xl font-bold">Criar Pack</h1>
            <p className="text-sm text-muted-foreground">
              {stickers.length} stickers adicionados
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24 pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pack Details */}
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalhes do Pack
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome do Pack *</label>
                <Input
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  placeholder="Nome do seu pack de stickers"
                  maxLength={50}
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva seu pack (opcional)"
                  rows={3}
                  maxLength={200}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Preço</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.50"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {price === "0" ? "Pack gratuito" : `R$ ${parseFloat(price).toFixed(2)}`}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Visibilidade</h3>
                  <p className="text-sm text-muted-foreground">
                    {isPublic ? "Visível na loja" : "Apenas para você"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={isPublic ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPublic(!isPublic)}
                  className="rounded-full"
                >
                  {isPublic ? "Público" : "Privado"}
                </Button>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Imagem de Capa
            </h2>
            
            <div>
              {coverPreview ? (
                <div className="relative inline-block">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-32 h-32 rounded-lg object-cover border-2 border-dashed border-muted-foreground/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverPreview(null);
                      if (coverInputRef.current) coverInputRef.current.value = "";
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground text-center">Capa</span>
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Stickers Upload */}
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Adicionar Stickers
            </h2>
            
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragActive 
                    ? "border-primary bg-primary/10" 
                    : "border-muted-foreground/20 hover:border-primary/50"
                }`}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">
                  Arraste stickers ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, WEBP • Máx. 50 stickers
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleStickerUpload}
                  className="hidden"
                />
              </div>

              {/* Stickers Grid */}
              {stickers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">
                      Stickers ({stickers.length}/50)
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        stickers.forEach(s => URL.revokeObjectURL(s.preview));
                        setStickers([]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar Todos
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    <AnimatePresence>
                      {stickers.map((sticker) => (
                        <StickerItem key={sticker.id} sticker={sticker} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || stickers.length < 3}
            className="w-full rounded-full py-6 text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {price === "0" ? "Publicar Grátis" : "Publicar com Preço"}
              </>
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateStickerPack;