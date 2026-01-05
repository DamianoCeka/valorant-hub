import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Loader2, ChevronDown, ChevronUp, Heart, CornerDownRight, Image, X, Upload, Link } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

interface Comment {
  id: string;
  content: string;
  parentId: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "gif" | null;
  createdAt: string;
  likes: number;
  userLiked: boolean;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  } | null;
}

interface SelectedMedia {
  url: string;
  type: "image" | "gif";
}

interface CommentSectionProps {
  contentType: "meme" | "clip";
  contentId: string;
  userId?: string;
  isAuthenticated: boolean;
}

function CommentItem({ 
  comment, 
  replies, 
  onReply,
  onLike,
  isAuthenticated,
  isLiking
}: { 
  comment: Comment; 
  replies: Comment[];
  onReply: (parentId: string) => void;
  onLike: (commentId: string) => void;
  isAuthenticated: boolean;
  isLiking: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div 
        className="group relative backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
        data-testid={`comment-${comment.id}`}
      >
        <div className="flex gap-3">
          <div className="relative">
            {comment.user?.avatar ? (
              <img 
                src={comment.user.avatar} 
                alt={comment.user.username}
                className="h-10 w-10 rounded-full ring-2 ring-white/10 group-hover:ring-primary/30 transition-all duration-300"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-white/10" />
            )}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#0F1923]" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white text-sm">
                {comment.user?.username || "Anonimo"}
              </span>
              <span className="text-[11px] text-white/40">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: it })}
              </span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{comment.content}</p>
            
            {comment.mediaUrl && (
              <div className="mt-2">
                <img 
                  src={comment.mediaUrl} 
                  alt="Comment attachment"
                  className="max-w-full max-h-[300px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(comment.mediaUrl!, '_blank')}
                  data-testid={`media-${comment.id}`}
                />
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={() => onLike(comment.id)}
                disabled={!isAuthenticated || isLiking}
                className={`flex items-center gap-1.5 text-xs transition-all duration-200 ${
                  comment.userLiked 
                    ? "text-pink-400" 
                    : "text-white/40 hover:text-pink-400"
                } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                data-testid={`button-like-${comment.id}`}
              >
                <Heart className={`h-4 w-4 transition-all duration-200 ${comment.userLiked ? "fill-pink-400 scale-110" : ""}`} />
                <span className="font-medium">{comment.likes}</span>
              </button>
              
              {isAuthenticated && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="text-xs text-white/40 hover:text-primary transition-colors duration-200"
                  data-testid={`button-reply-${comment.id}`}
                >
                  Rispondi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {replies.length > 0 && (
        <div className="ml-6 space-y-2">
          {replies.map((reply) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="group relative flex gap-2 backdrop-blur-lg bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 hover:bg-white/[0.04] transition-all duration-300"
              data-testid={`reply-${reply.id}`}
            >
              <CornerDownRight className="h-3 w-3 text-white/20 flex-shrink-0 mt-1" />
              {reply.user?.avatar ? (
                <img 
                  src={reply.user.avatar} 
                  alt={reply.user.username}
                  className="h-7 w-7 rounded-full ring-1 ring-white/10 flex-shrink-0"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-white/10 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-white text-xs">
                    {reply.user?.username || "Anonimo"}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: it })}
                  </span>
                </div>
                <p className="text-white/60 text-xs leading-relaxed">{reply.content}</p>
                {reply.mediaUrl && (
                  <div className="mt-1.5">
                    <img 
                      src={reply.mediaUrl} 
                      alt="Reply attachment"
                      className="max-w-full max-h-[200px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(reply.mediaUrl!, '_blank')}
                      data-testid={`media-${reply.id}`}
                    />
                  </div>
                )}
                <button
                  onClick={() => onLike(reply.id)}
                  disabled={!isAuthenticated || isLiking}
                  className={`flex items-center gap-1 mt-2 text-[11px] transition-all duration-200 ${
                    reply.userLiked 
                      ? "text-pink-400" 
                      : "text-white/30 hover:text-pink-400"
                  }`}
                >
                  <Heart className={`h-3 w-3 ${reply.userLiked ? "fill-pink-400" : ""}`} />
                  <span>{reply.likes}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function CommentSection({ contentType, contentId, userId, isAuthenticated }: CommentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", contentType, contentId],
    queryFn: async () => {
      const url = userId 
        ? `/api/comments/${contentType}/${contentId}?userId=${userId}`
        : `/api/comments/${contentType}/${contentId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: isExpanded,
  });

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId, mediaUrl, mediaType }: { content: string; parentId: string | null; mediaUrl?: string; mediaType?: "image" | "gif" }) => {
      const res = await fetch(`/api/comments/${contentType}/${contentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, userId, parentId, mediaUrl, mediaType }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", contentType, contentId] });
      setNewComment("");
      setReplyingTo(null);
      setSelectedMedia(null);
      setShowMediaInput(false);
      setMediaUrlInput("");
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to like comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", contentType, contentId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;
    commentMutation.mutate({ 
      content: newComment.trim(), 
      parentId: replyingTo,
      mediaUrl: selectedMedia?.url,
      mediaType: selectedMedia?.type
    });
  };

  const handleAddMedia = () => {
    if (!mediaUrlInput.trim()) return;
    const url = mediaUrlInput.trim();
    const isGif = url.toLowerCase().endsWith('.gif') || url.includes('giphy.com') || url.includes('tenor.com');
    setSelectedMedia({ url, type: isGif ? 'gif' : 'image' });
    setShowMediaInput(false);
    setMediaUrlInput("");
    setUploadError(null);
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Tipo di file non supportato. Solo PNG, JPEG, GIF e WebP.');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError('File troppo grande. Massimo 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const response = await fetch('/api/uploads/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { uploadURL, objectPath, mediaType } = await response.json();
      setUploadProgress(30);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = 30 + (event.loaded / event.total) * 70;
          setUploadProgress(Math.round(progress));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload to storage failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('PUT', uploadURL);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setSelectedMedia({ url: objectPath, type: mediaType });
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Errore durante il caricamento');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
  };

  const handleLike = (commentId: string) => {
    if (!isAuthenticated) return;
    likeMutation.mutate(commentId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
    setSelectedMedia(null);
    setShowMediaInput(false);
    setMediaUrlInput("");
    setUploadError(null);
    setUploadProgress(0);
  };

  const topLevelComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);
  const replyingToComment = replyingTo ? comments.find(c => c.id === replyingTo) : null;
  const totalComments = comments.length;

  return (
    <div className="border-t border-white/[0.06] mt-4 pt-4">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-all duration-300 w-full group"
        data-testid={`button-toggle-comments-${contentId}`}
      >
        <div className="flex items-center gap-2 backdrop-blur-lg bg-white/[0.03] px-3 py-2 rounded-full border border-white/[0.06] group-hover:border-white/[0.12] transition-all duration-300">
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium">
            {totalComments > 0 ? `${totalComments} commenti` : "Commenti"}
          </span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                </div>
              ) : topLevelComments.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 backdrop-blur-lg bg-white/[0.02] rounded-2xl border border-white/[0.05]"
                >
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-white/20" />
                  <p className="text-white/40 text-sm">Nessun commento ancora</p>
                  <p className="text-white/30 text-xs mt-1">Sii il primo a commentare!</p>
                </motion.div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {topLevelComments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      replies={getReplies(comment.id)}
                      onReply={handleReply}
                      onLike={handleLike}
                      isAuthenticated={isAuthenticated}
                      isLiking={likeMutation.isPending}
                    />
                  ))}
                </div>
              )}

              {isAuthenticated ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {replyingTo && replyingToComment && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-center gap-2 text-xs text-white/50 backdrop-blur-lg bg-primary/10 px-3 py-2 rounded-xl border border-primary/20"
                    >
                      <span>Rispondendo a <span className="text-primary font-medium">{replyingToComment.user?.username || "Anonimo"}</span></span>
                      <button onClick={cancelReply} className="ml-auto text-primary hover:text-primary/80 font-medium transition-colors">
                        Annulla
                      </button>
                    </motion.div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid={`input-file-${contentId}`}
                  />

                  {isUploading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Caricamento in corso... {uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1.5" />
                    </motion.div>
                  )}

                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      <X className="h-3 w-3" />
                      <span>{uploadError}</span>
                      <button 
                        onClick={() => setUploadError(null)} 
                        className="ml-auto text-red-300 hover:text-red-200"
                      >
                        Chiudi
                      </button>
                    </motion.div>
                  )}

                  {selectedMedia && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative inline-block"
                    >
                      <img 
                        src={selectedMedia.url} 
                        alt="Preview" 
                        className="max-h-[150px] rounded-lg object-contain border border-white/10"
                        data-testid={`preview-media-${contentId}`}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                        data-testid={`button-remove-media-${contentId}`}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white/80 px-1.5 py-0.5 rounded uppercase">
                        {selectedMedia.type}
                      </span>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {showMediaInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2"
                      >
                        <input
                          value={mediaUrlInput}
                          onChange={(e) => setMediaUrlInput(e.target.value)}
                          placeholder="Incolla URL immagine o GIF..."
                          className="flex-1 h-10 px-3 text-sm bg-white/[0.03] backdrop-blur-lg border border-white/[0.08] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-all duration-300"
                          data-testid={`input-media-url-${contentId}`}
                        />
                        <Button
                          type="button"
                          onClick={handleAddMedia}
                          disabled={!mediaUrlInput.trim()}
                          className="h-10 px-3 bg-green-600/80 hover:bg-green-600 rounded-lg text-xs"
                          data-testid={`button-add-media-${contentId}`}
                        >
                          Aggiungi
                        </Button>
                        <Button
                          type="button"
                          onClick={() => { setShowMediaInput(false); setMediaUrlInput(""); }}
                          variant="ghost"
                          className="h-10 px-3 text-white/50 hover:text-white rounded-lg text-xs"
                          data-testid={`button-cancel-media-${contentId}`}
                        >
                          Annulla
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !!selectedMedia}
                      className={`h-11 w-11 flex items-center justify-center rounded-xl border transition-all duration-300 ${
                        selectedMedia 
                          ? "bg-green-500/20 border-green-500/40 text-green-400 cursor-not-allowed" 
                          : isUploading
                          ? "bg-white/[0.03] border-white/[0.08] text-white/30 cursor-not-allowed"
                          : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.12] hover:bg-primary/10"
                      }`}
                      title="Carica immagine"
                      data-testid={`button-upload-media-${contentId}`}
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMediaInput(!showMediaInput)}
                      disabled={isUploading}
                      className={`h-11 w-11 flex items-center justify-center rounded-xl border transition-all duration-300 ${
                        showMediaInput 
                          ? "bg-primary/20 border-primary/40 text-primary" 
                          : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.12]"
                      }`}
                      title="Incolla URL immagine"
                      data-testid={`button-toggle-media-${contentId}`}
                    >
                      <Link className="h-5 w-5" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={replyingTo ? "Scrivi una risposta..." : "Aggiungi un commento..."}
                        className="w-full h-11 px-4 text-sm bg-white/[0.03] backdrop-blur-lg border border-white/[0.08] rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                        data-testid={`input-comment-${contentId}`}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={!newComment.trim() || commentMutation.isPending || isUploading}
                      className="h-11 px-4 bg-primary/90 hover:bg-primary rounded-xl transition-all duration-300 disabled:opacity-50"
                      data-testid={`button-submit-comment-${contentId}`}
                    >
                      {commentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-white/30 py-4 backdrop-blur-lg bg-white/[0.02] rounded-xl border border-white/[0.05]"
                >
                  Accedi con Discord per commentare
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
