import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, MessageSquare, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export function Chat() {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["chat"],
    queryFn: async () => {
      const res = await fetch("/api/chat?limit=100");
      if (!res.ok) throw new Error("Failed to fetch chat");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, userId: user?.id }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      setMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isAuthenticated) return;
    sendMutation.mutate(message.trim());
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-4xl font-display flex items-center gap-3" data-testid="text-chat-title">
            <MessageSquare className="h-10 w-10 text-primary" />
            Community Chat
          </h1>
          <p className="text-muted-foreground mt-1">Chatta con la community ITSME</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span>{messages.length} messaggi</span>
        </div>
      </motion.div>

      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessun messaggio ancora. Inizia la conversazione!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.user?.id === user?.id ? "flex-row-reverse" : ""}`}
                >
                  {msg.user?.avatar ? (
                    <img
                      src={msg.user.avatar}
                      alt={msg.user.username}
                      className="w-10 h-10 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {msg.user?.username?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                  <div className={`max-w-[70%] ${msg.user?.id === user?.id ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{msg.user?.username || "Utente"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: it })}
                      </span>
                    </div>
                    <div
                      className={`inline-block px-4 py-2 rounded-2xl ${
                        msg.user?.id === user?.id
                          ? "bg-primary text-white rounded-tr-sm"
                          : "bg-white/10 rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          {isAuthenticated ? (
            <form onSubmit={handleSend} className="flex gap-3">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi un messaggio..."
                className="flex-1 val-input"
                disabled={sendMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                className="val-btn"
                disabled={!message.trim() || sendMutation.isPending}
                data-testid="button-send-message"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-2 text-muted-foreground">
              Connetti Discord per partecipare alla chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
