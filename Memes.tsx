import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ThumbsUp, ThumbsDown, ImagePlus, Flame, Trophy, X, Upload, Share2 } from "lucide-react";
import { CommentSection } from "@/components/CommentSection";
import { ReportButton } from "@/components/ReportButton";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/hooks/use-upload";

interface Meme {
  id: string;
  userId: string;
  title: string;
  imageUrl: string;
  upvotes: number;
  downvotes: number;
  featured: boolean;
  createdAt: string;
}

export function Memes() {
  const [sortBy, setSortBy] = useState<"hot" | "new" | "top">("hot");
  const [showUpload, setShowUpload] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: memes = [], isLoading } = useQuery<Meme[]>({
    queryKey: ["memes"],
    queryFn: async () => {
      const res = await fetch("/api/memes");
      if (!res.ok) throw new Error("Failed to fetch memes");
      return res.json();
    },
  });

  const sortedMemes = [...memes].sort((a: Meme, b: Meme) => {
    if (sortBy === "top") return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
    if (sortBy === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const aScore = (a.upvotes - a.downvotes) / Math.pow((Date.now() - new Date(a.createdAt).getTime()) / 3600000 + 2, 1.5);
    const bScore = (b.upvotes - b.downvotes) / Math.pow((Date.now() - new Date(b.createdAt).getTime()) / 3600000 + 2, 1.5);
    return bScore - aScore;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-display flex items-center gap-3" data-testid="text-memes-title">
            Meme Zone
          </h1>
          <p className="text-white/50 mt-2">I migliori meme della community VALORANT</p>
        </div>

        <div className="flex gap-2">
          {[
            { id: "hot", label: "Hot", icon: Flame },
            { id: "new", label: "New", icon: null },
            { id: "top", label: "Top", icon: Trophy },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSortBy(tab.id as "hot" | "new" | "top")}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                sortBy === tab.id 
                  ? "bg-primary text-white" 
                  : "glass-hover text-white/60"
              }`}
              data-testid={`button-sort-${tab.id}`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="frosted-card p-6 md:p-8 text-center"
      >
        <ImagePlus className="h-10 w-10 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-display mb-2">Hai un meme epico?</h3>
        <p className="text-white/50 mb-5">
          {isAuthenticated 
            ? `Ciao ${user?.username}! Trascina un'immagine o clicca per caricare!`
            : "Connetti Discord per condividere i tuoi meme!"}
        </p>
        {isAuthenticated ? (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="val-btn inline-flex items-center gap-2"
            onClick={() => setShowUpload(true)}
            data-testid="button-upload-meme"
          >
            <Upload className="h-4 w-4" />
            Carica Meme
          </motion.button>
        ) : (
          <span className="text-sm text-white/40">In attesa della connessione Discord...</span>
        )}
      </motion.div>

      {memes.length === 0 ? (
        <div className="text-center py-20 frosted-card">
          <ImagePlus className="h-12 w-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/50 text-lg">Nessun meme ancora. Sii il primo!</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {sortedMemes.map((meme: Meme) => (
            <MemeCard key={meme.id} meme={meme} userId={user?.id} isAuthenticated={isAuthenticated} />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showUpload && (
          <UploadMemeModal 
            onClose={() => setShowUpload(false)} 
            userId={user?.id || ""} 
            onSuccess={() => {
              setShowUpload(false);
              queryClient.invalidateQueries({ queryKey: ["memes"] });
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

function UploadMemeModal({ onClose, userId, onSuccess }: { onClose: () => void; userId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      const fullUrl = window.location.origin + response.objectPath;
      setImageUrl(response.objectPath);
      setPreviewUrl(fullUrl);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/memes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, imageUrl, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload meme");
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Per favore seleziona un'immagine");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("L'immagine deve essere meno di 10MB");
      return;
    }
    setError("");
    await uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Inserisci un titolo");
      return;
    }
    if (!imageUrl) {
      setError("Carica un'immagine");
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-elevated rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-display">Carica Meme</h2>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose} 
            className="text-white/40 hover:text-white p-2 rounded-xl glass-hover"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Titolo</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Il meme più divertente di sempre..."
              className="w-full input-glass"
              data-testid="input-meme-title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Immagine</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? "border-primary bg-primary/10" 
                  : "border-white/10 hover:border-white/20 glass-subtle"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                data-testid="input-meme-file"
              />
              
              {isUploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-white/50">Caricamento... {progress}%</p>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-xl" />
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-white/30" />
                  <p className="text-white/50">Trascina un'immagine o clicca per selezionare</p>
                  <p className="text-xs text-white/30">Max 10MB</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full val-btn"
            disabled={uploadMutation.isPending || isUploading || !imageUrl}
            data-testid="button-submit-meme"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ImagePlus className="h-4 w-4 mr-2" />
            )}
            Pubblica Meme
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function MemeCard({ meme, userId, isAuthenticated }: { meme: Meme; userId?: string; isAuthenticated: boolean }) {
  const queryClient = useQueryClient();
  const score = meme.upvotes - meme.downvotes;

  const voteMutation = useMutation({
    mutationFn: async (voteType: "up" | "down") => {
      if (!userId) throw new Error("Must be logged in to vote");
      const res = await fetch(`/api/memes/${meme.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType, userId }),
      });
      if (!res.ok) throw new Error("Failed to vote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memes"] });
    },
  });

  const handleVote = (voteType: "up" | "down") => {
    if (!isAuthenticated) return;
    voteMutation.mutate(voteType);
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith("/objects/")) {
      return url;
    }
    return url;
  };

  const shareOnTwitter = () => {
    const text = `Check out this meme: "${meme.title}" on ITSME Tournament Hub!`;
    const url = `${window.location.origin}/memes?highlight=${meme.id}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className="group frosted-card-hover overflow-hidden"
      data-testid={`card-meme-${meme.id}`}
    >
      {meme.featured && (
        <div className="absolute top-3 right-3 z-10 bg-primary/90 backdrop-blur-sm px-3 py-1 rounded-xl text-xs font-bold">
          FEATURED
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={shareOnTwitter}
        className="absolute top-3 left-3 z-10 glass p-2.5 rounded-xl text-white/50 hover:text-white transition-colors"
        title="Condividi su Twitter"
        data-testid={`button-share-${meme.id}`}
      >
        <Share2 className="h-4 w-4" />
      </motion.button>

      {/* Image container with proper aspect ratio and contain */}
      <div className="aspect-square overflow-hidden bg-gradient-to-br from-white/[0.03] to-transparent flex items-center justify-center">
        <img 
          src={getImageUrl(meme.imageUrl)} 
          alt={meme.title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-5">
        <h3 className="font-bold text-white mb-4 line-clamp-2">{meme.title}</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleVote("up")}
              disabled={!isAuthenticated || voteMutation.isPending}
              className={`flex items-center gap-1.5 transition-all ${
                isAuthenticated ? "text-green-400 hover:text-green-300 cursor-pointer" : "text-green-400/40 cursor-not-allowed"
              }`}
              data-testid={`button-upvote-${meme.id}`}
            >
              <ThumbsUp className="h-5 w-5" />
              <span className="text-sm font-bold">{meme.upvotes}</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleVote("down")}
              disabled={!isAuthenticated || voteMutation.isPending}
              className={`flex items-center gap-1.5 transition-all ${
                isAuthenticated ? "text-red-400 hover:text-red-300 cursor-pointer" : "text-red-400/40 cursor-not-allowed"
              }`}
              data-testid={`button-downvote-${meme.id}`}
            >
              <ThumbsDown className="h-5 w-5" />
              <span className="text-sm font-bold">{meme.downvotes}</span>
            </motion.button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`text-lg font-bold ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-white/40"}`}>
              {score > 0 ? "+" : ""}{score}
            </div>
            {isAuthenticated && <ReportButton contentType="meme" contentId={meme.id} />}
          </div>
        </div>

        <CommentSection 
          contentType="meme" 
          contentId={meme.id} 
          userId={userId} 
          isAuthenticated={isAuthenticated} 
        />
      </div>
    </motion.div>
  );
}
