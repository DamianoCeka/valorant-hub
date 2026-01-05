import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ThumbsUp, ThumbsDown, Quote as QuoteIcon, Flame, Trophy, X, MessageSquareQuote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Quote {
  id: string;
  userId: string;
  content: string;
  author: string;
  context: string | null;
  upvotes: number;
  downvotes: number;
  featured: boolean;
  createdAt: string;
}

export function Quotes() {
  const [sortBy, setSortBy] = useState<"hot" | "new" | "top">("hot");
  const [showSubmit, setShowSubmit] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["quotes"],
    queryFn: async () => {
      const res = await fetch("/api/quotes");
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json();
    },
  });

  const sortedQuotes = [...quotes].sort((a: Quote, b: Quote) => {
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
          <h1 className="text-4xl md:text-5xl font-display flex items-center gap-3" data-testid="text-quotes-title">
            Quote Zone
          </h1>
          <p className="text-white/50 mt-2">Le citazioni più memorabili della community</p>
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
        <MessageSquareQuote className="h-10 w-10 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-display mb-2">Hai una citazione epica?</h3>
        <p className="text-white/50 mb-5">
          {isAuthenticated 
            ? `Ciao ${user?.username}! Condividi le citazioni più divertenti!`
            : "Connetti Discord per condividere le tue citazioni!"}
        </p>
        {isAuthenticated ? (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="val-btn inline-flex items-center gap-2"
            onClick={() => setShowSubmit(true)}
            data-testid="button-submit-quote"
          >
            <QuoteIcon className="h-4 w-4" />
            Aggiungi Citazione
          </motion.button>
        ) : (
          <span className="text-sm text-white/40">In attesa della connessione Discord...</span>
        )}
      </motion.div>

      {quotes.length === 0 ? (
        <div className="text-center py-20 frosted-card">
          <MessageSquareQuote className="h-12 w-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/50 text-lg">Nessuna citazione ancora. Sii il primo!</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {sortedQuotes.map((quote: Quote) => (
            <QuoteCard key={quote.id} quote={quote} userId={user?.id} isAuthenticated={isAuthenticated} />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showSubmit && (
          <SubmitQuoteModal 
            onClose={() => setShowSubmit(false)} 
            userId={user?.id || ""} 
            onSuccess={() => {
              setShowSubmit(false);
              queryClient.invalidateQueries({ queryKey: ["quotes"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuoteCard({ quote, userId, isAuthenticated }: { quote: Quote; userId?: string; isAuthenticated: boolean }) {
  const queryClient = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: async (voteType: "up" | "down") => {
      const res = await fetch(`/api/quotes/${quote.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType, userId }),
      });
      if (!res.ok) throw new Error("Failed to vote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <motion.div
      variants={cardVariants}
      className="frosted-card p-6 flex flex-col gap-4 hover:border-primary/30 transition-all"
      data-testid={`card-quote-${quote.id}`}
    >
      <div className="flex-1">
        <blockquote className="text-lg md:text-xl italic text-white/90 mb-3">
          "{quote.content}"
        </blockquote>
        <p className="text-primary font-medium">— {quote.author}</p>
        {quote.context && (
          <p className="text-white/40 text-sm mt-1">{quote.context}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => isAuthenticated && voteMutation.mutate("up")}
            disabled={!isAuthenticated || voteMutation.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              isAuthenticated 
                ? "hover:bg-green-500/20 text-green-400" 
                : "text-white/30 cursor-not-allowed"
            }`}
            data-testid={`button-upvote-${quote.id}`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="font-bold">{quote.upvotes}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => isAuthenticated && voteMutation.mutate("down")}
            disabled={!isAuthenticated || voteMutation.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              isAuthenticated 
                ? "hover:bg-red-500/20 text-red-400" 
                : "text-white/30 cursor-not-allowed"
            }`}
            data-testid={`button-downvote-${quote.id}`}
          >
            <ThumbsDown className="h-4 w-4" />
            <span className="font-bold">{quote.downvotes}</span>
          </motion.button>
        </div>
        <span className="text-white/30 text-xs">{formatDate(quote.createdAt)}</span>
      </div>
    </motion.div>
  );
}

function SubmitQuoteModal({ onClose, userId, onSuccess }: { onClose: () => void; userId: string; onSuccess: () => void }) {
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          author, 
          context: context || null,
          userId 
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit quote");
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
    if (!content.trim()) {
      setError("Inserisci la citazione");
      return;
    }
    if (!author.trim()) {
      setError("Inserisci l'autore della citazione");
      return;
    }
    submitMutation.mutate();
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
        className="frosted-card p-6 md:p-8 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-display">Nuova Citazione</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white" data-testid="button-close-modal">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">La citazione *</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Non ho mai detto questa cosa..."
              className="w-full h-24"
              data-testid="input-quote-content"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Chi l'ha detta *</label>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="ITSME, Streamer, ecc."
              data-testid="input-quote-author"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Contesto (opzionale)</label>
            <Input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Durante lo streaming, in ranked, ecc."
              data-testid="input-quote-context"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="flex-1 val-btn"
              data-testid="button-submit-quote-form"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Pubblica"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
