import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ThumbsUp, ThumbsDown, Play, VideoIcon, Flame, Trophy, Target, Skull, Laugh, Frown, X, Share2 } from "lucide-react";
import { CommentSection } from "@/components/CommentSection";
import { ReportButton } from "@/components/ReportButton";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Clip {
  id: string;
  userId: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  upvotes: number;
  downvotes: number;
  featured: boolean;
  createdAt: string;
}

const categories = [
  { id: "all", label: "Tutti", icon: VideoIcon },
  { id: "ace", label: "Ace", icon: Skull },
  { id: "clutch", label: "Clutch", icon: Target },
  { id: "funny", label: "Funny", icon: Laugh },
  { id: "fail", label: "Fails", icon: Frown },
];

const uploadCategories = [
  { id: "highlight", label: "Highlight" },
  { id: "ace", label: "Ace" },
  { id: "clutch", label: "Clutch" },
  { id: "funny", label: "Funny" },
  { id: "fail", label: "Fail" },
];

export function Clips() {
  const [sortBy, setSortBy] = useState<"hot" | "new" | "top">("hot");
  const [category, setCategory] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: clips = [], isLoading } = useQuery<Clip[]>({
    queryKey: ["clips"],
    queryFn: async () => {
      const res = await fetch("/api/clips");
      if (!res.ok) throw new Error("Failed to fetch clips");
      return res.json();
    },
  });

  const filteredClips = clips.filter((c: Clip) => category === "all" || c.category === category);

  const sortedClips = [...filteredClips].sort((a: Clip, b: Clip) => {
    if (sortBy === "top") return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
    if (sortBy === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const aScore = (a.upvotes - a.downvotes) / Math.pow((Date.now() - new Date(a.createdAt).getTime()) / 3600000 + 2, 1.5);
    const bScore = (b.upvotes - b.downvotes) / Math.pow((Date.now() - new Date(b.createdAt).getTime()) / 3600000 + 2, 1.5);
    return bScore - aScore;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
          <h1 className="text-5xl font-display flex items-center gap-3" data-testid="text-clips-title">
            Clip Gallery
          </h1>
          <p className="text-muted-foreground mt-2">Le migliori clip VALORANT della community</p>
        </div>

        <div className="flex gap-2">
          {[
            { id: "hot", label: "Hot" },
            { id: "new", label: "New" },
            { id: "top", label: "Top" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id as "hot" | "new" | "top")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                sortBy === tab.id 
                  ? "bg-primary text-white" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
              data-testid={`button-sort-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-wrap gap-2"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              category === cat.id 
                ? "bg-white/20 text-white border border-primary/50" 
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
            data-testid={`button-category-${cat.id}`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl p-6 text-center"
      >
        <VideoIcon className="h-10 w-10 mx-auto mb-3 text-primary" />
        <h3 className="text-xl font-display mb-2">Hai una clip epica?</h3>
        <p className="text-muted-foreground mb-4">
          {isAuthenticated 
            ? `Ciao ${user?.username}! Condividi le tue clip con la community!`
            : "Connetti Discord per condividere le tue clip!"}
        </p>
        {isAuthenticated ? (
          <Button 
            className="val-btn"
            onClick={() => setShowUpload(true)}
            data-testid="button-upload-clip"
          >
            <VideoIcon className="h-4 w-4 mr-2" />
            Carica Clip
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">In attesa della connessione Discord...</span>
        )}
      </motion.div>

      {sortedClips.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
          <p className="text-muted-foreground text-lg">Nessuna clip in questa categoria. Sii il primo!</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {sortedClips.map((clip: Clip) => (
            <ClipCard key={clip.id} clip={clip} userId={user?.id} isAuthenticated={isAuthenticated} />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showUpload && (
          <UploadClipModal 
            onClose={() => setShowUpload(false)} 
            userId={user?.id || ""} 
            onSuccess={() => {
              setShowUpload(false);
              queryClient.invalidateQueries({ queryKey: ["clips"] });
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

function UploadClipModal({ onClose, userId, onSuccess }: { onClose: () => void; userId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [clipCategory, setClipCategory] = useState("highlight");
  const [error, setError] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          videoUrl, 
          thumbnailUrl: thumbnailUrl || null,
          category: clipCategory,
          userId 
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload clip");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) {
      setError("Compila titolo e URL del video");
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-display">Carica Clip</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Titolo</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ace incredibile su Ascent..."
              className="val-input"
              data-testid="input-clip-title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL Video</label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://clips.twitch.tv/... o YouTube"
              className="val-input"
              data-testid="input-clip-url"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Link a Twitch Clip, YouTube, o Medal.tv
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Thumbnail (opzionale)</label>
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://i.imgur.com/..."
              className="val-input"
              data-testid="input-clip-thumbnail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              {uploadCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setClipCategory(cat.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    clipCategory === cat.id 
                      ? "bg-primary text-white" 
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                  data-testid={`button-select-category-${cat.id}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {thumbnailUrl && (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <img src={thumbnailUrl} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full val-btn"
            disabled={uploadMutation.isPending}
            data-testid="button-submit-clip"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <VideoIcon className="h-4 w-4 mr-2" />
            )}
            Pubblica Clip
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ClipCard({ clip, userId, isAuthenticated }: { clip: Clip; userId?: string; isAuthenticated: boolean }) {
  const queryClient = useQueryClient();
  const score = clip.upvotes - clip.downvotes;

  const voteMutation = useMutation({
    mutationFn: async (voteType: "up" | "down") => {
      if (!userId) throw new Error("Must be logged in to vote");
      const res = await fetch(`/api/clips/${clip.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType, userId }),
      });
      if (!res.ok) throw new Error("Failed to vote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clips"] });
    },
  });

  const handleVote = (voteType: "up" | "down") => {
    if (!isAuthenticated) return;
    voteMutation.mutate(voteType);
  };

  const getCategoryBadge = () => {
    switch(clip.category) {
      case "ace": return "ACE";
      case "clutch": return "CLUTCH";
      case "funny": return "FUNNY";
      case "fail": return "FAIL";
      default: return "HIGHLIGHT";
    }
  };

  const openClip = () => {
    window.open(clip.videoUrl, "_blank", "noopener,noreferrer");
  };

  const shareOnTwitter = () => {
    const text = `Check out this ${getCategoryBadge()} clip: "${clip.title}" on ITSME Tournament Hub! 🎮`;
    const url = clip.videoUrl;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      whileHover={{ translateY: -8 }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm hover:border-primary/50 transition-all"
      data-testid={`card-clip-${clip.id}`}
    >
      {clip.featured && (
        <div className="absolute top-3 left-3 z-10 bg-primary px-2 py-1 rounded text-xs font-bold">
          FEATURED
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); shareOnTwitter(); }}
        className="absolute top-12 left-3 z-10 bg-black/50 hover:bg-primary p-2 rounded-full transition-colors"
        title="Condividi su Twitter"
        data-testid={`button-share-${clip.id}`}
      >
        <Share2 className="h-4 w-4" />
      </button>

      <div className="absolute top-3 right-3 z-10 bg-black/70 px-2 py-1 rounded text-xs font-bold">
        {getCategoryBadge()}
      </div>

      <div className="aspect-video overflow-hidden relative cursor-pointer" onClick={openClip}>
        {clip.thumbnailUrl ? (
          <img 
            src={clip.thumbnailUrl} 
            alt={clip.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <VideoIcon className="h-12 w-12 text-primary/50" />
          </div>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white mb-3 line-clamp-2">{clip.title}</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleVote("up")}
              disabled={!isAuthenticated || voteMutation.isPending}
              className={`flex items-center gap-1 transition-transform ${
                isAuthenticated ? "text-green-400 hover:scale-110 cursor-pointer" : "text-green-400/50 cursor-not-allowed"
              }`}
              data-testid={`button-upvote-${clip.id}`}
            >
              <ThumbsUp className="h-5 w-5" />
              <span className="text-sm font-bold">{clip.upvotes}</span>
            </button>
            <button 
              onClick={() => handleVote("down")}
              disabled={!isAuthenticated || voteMutation.isPending}
              className={`flex items-center gap-1 transition-transform ${
                isAuthenticated ? "text-red-400 hover:scale-110 cursor-pointer" : "text-red-400/50 cursor-not-allowed"
              }`}
              data-testid={`button-downvote-${clip.id}`}
            >
              <ThumbsDown className="h-5 w-5" />
              <span className="text-sm font-bold">{clip.downvotes}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`text-lg font-bold ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {score > 0 ? "+" : ""}{score}
            </div>
            {isAuthenticated && <ReportButton contentType="clip" contentId={clip.id} />}
          </div>
        </div>

        <CommentSection 
          contentType="clip" 
          contentId={clip.id} 
          userId={userId} 
          isAuthenticated={isAuthenticated} 
        />
      </div>
    </motion.div>
  );
}
