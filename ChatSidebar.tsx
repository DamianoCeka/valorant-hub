import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  } | null;
}

interface ChatSidebarProps {
  userId?: string;
  isAuthenticated: boolean;
}

export function ChatSidebar({ userId, isAuthenticated }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["chat"],
    queryFn: async () => {
      const res = await fetch("/api/chat?limit=50");
      if (!res.ok) throw new Error("Failed to fetch chat");
      return res.json();
    },
    refetchInterval: isOpen ? 3000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, userId }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      setNewMessage("");
    },
  });

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;
    sendMutation.mutate(newMessage.trim());
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed right-4 bottom-4 z-40 glass-elevated p-4 rounded-2xl shadow-xl transition-all ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        data-testid="button-open-chat-sidebar"
      >
        <MessageCircle className="h-6 w-6 text-primary" />
        <span className="absolute top-2 right-2 bg-green-500 h-2.5 w-2.5 rounded-full animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Chat panel */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-80 lg:w-[360px] glass-elevated z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">Chat Community</h2>
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl glass-hover text-white/40 hover:text-white"
                  data-testid="button-close-chat-sidebar"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 text-white/20" />
                    <p className="text-white/40 text-sm">Nessun messaggio</p>
                    <p className="text-white/30 text-xs mt-1">Inizia la conversazione!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5 group" 
                      data-testid={`sidebar-message-${msg.id}`}
                    >
                      {msg.user?.avatar ? (
                        <img 
                          src={msg.user.avatar} 
                          alt={msg.user.username}
                          className="h-8 w-8 rounded-full ring-2 ring-white/10 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/20 ring-2 ring-white/10 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-medium text-white text-sm truncate">
                            {msg.user?.username || "Anonimo"}
                          </span>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: it })}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 break-words leading-relaxed">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/[0.06]">
                {isAuthenticated ? (
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Scrivi un messaggio..."
                      className="flex-1 input-glass text-sm"
                      data-testid="input-sidebar-chat"
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!newMessage.trim() || sendMutation.isPending}
                      className="p-3 bg-primary rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-primary/90"
                      data-testid="button-send-sidebar"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </motion.button>
                  </form>
                ) : (
                  <p className="text-sm text-white/40 text-center py-2">
                    Accedi con Discord per chattare
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
