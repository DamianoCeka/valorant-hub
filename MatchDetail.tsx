import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, Trophy, Swords, Flag, CheckCircle, XCircle, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Match {
  id: string;
  tournamentId: string;
  round: number;
  team1Id: string | null;
  team2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  status: string;
  team1?: { id: string; name: string };
  team2?: { id: string; name: string };
  canModify?: boolean;
  userTeamId?: string | null;
}

export function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  const { data: match, isLoading, error } = useQuery<Match>({
    queryKey: ["match", id],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${id}`);
      if (!res.ok) throw new Error("Match non trovato");
      return res.json();
    },
    enabled: !!id,
  });

  const reportMutation = useMutation({
    mutationFn: async (data: { score1: number; score2: number }) => {
      const res = await fetch(`/api/matches/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Errore nel report");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", id] });
      toast({ title: "Risultato inviato", description: "In attesa di conferma" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile inviare il risultato", variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/matches/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Errore nella conferma");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", id] });
      toast({ title: "Risultato confermato!" });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/matches/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Errore nella disputa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", id] });
      toast({ title: "Disputa aperta", description: "Un admin esaminerà il caso" });
      setShowDispute(false);
    },
  });

  const handleReport = () => {
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      toast({ title: "Errore", description: "Inserisci punteggi validi", variant: "destructive" });
      return;
    }
    reportMutation.mutate({ score1: s1, score2: s2 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="text-center py-20">
        <div className="surface-card p-12 max-w-md mx-auto">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-white/60">Match non trovato</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/tournaments")}>
            Torna ai tornei
          </Button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-400",
    ready: "bg-blue-500/20 text-blue-400",
    live: "bg-green-500/20 text-green-400",
    reported: "bg-yellow-500/20 text-yellow-400",
    disputed: "bg-red-500/20 text-red-400",
    resolved: "bg-primary/20 text-primary",
  };

  const statusLabels: Record<string, string> = {
    pending: "In Attesa",
    ready: "Pronto",
    live: "In Corso",
    reported: "Risultato Inviato",
    disputed: "In Disputa",
    resolved: "Concluso",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Indietro
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            Round {match.round}
          </h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[match.status]}`}>
            {statusLabels[match.status]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center mb-8">
          <div className="text-center">
            <div className="surface-card p-4 rounded-xl">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-bold text-lg">{match.team1?.name || "TBD"}</p>
            </div>
          </div>
          
          <div className="text-center">
            {match.status === "resolved" || match.status === "reported" ? (
              <div className="text-3xl font-bold">
                <span className={match.winnerId === match.team1Id ? "text-green-400" : "text-white/60"}>
                  {match.score1 ?? "-"}
                </span>
                <span className="mx-2 text-white/30">:</span>
                <span className={match.winnerId === match.team2Id ? "text-green-400" : "text-white/60"}>
                  {match.score2 ?? "-"}
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-white/30">VS</span>
            )}
          </div>
          
          <div className="text-center">
            <div className="surface-card p-4 rounded-xl">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-blue-400" />
              <p className="font-bold text-lg">{match.team2?.name || "TBD"}</p>
            </div>
          </div>
        </div>

        {match.canModify && (match.status === "ready" || match.status === "live") ? (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Inserisci Risultato</h3>
            <div className="grid grid-cols-3 gap-4 items-center">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="text-center text-2xl font-bold"
                data-testid="input-score1"
              />
              <span className="text-center text-white/30">:</span>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="text-center text-2xl font-bold"
                data-testid="input-score2"
              />
            </div>
            <Button 
              className="w-full val-btn" 
              onClick={handleReport}
              disabled={reportMutation.isPending}
              data-testid="button-report"
            >
              {reportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Invia Risultato
            </Button>
          </div>
        ) : match.canModify && match.status === "reported" ? (
          <div className="space-y-4">
            <p className="text-center text-white/60">
              In attesa di conferma dall'altro team
            </p>
            <div className="flex gap-3">
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                data-testid="button-confirm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Conferma
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setShowDispute(true)}
                data-testid="button-open-dispute"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Contesta
              </Button>
            </div>
          </div>
        ) : match.status === "reported" && !match.canModify ? (
          <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
            <p className="font-bold text-yellow-400">Risultato in Attesa</p>
            <p className="text-sm text-white/60 mt-1">In attesa di conferma dai team</p>
          </div>
        ) : match.status === "disputed" ? (
          <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <Flag className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="font-bold text-red-400">Match in Disputa</p>
            <p className="text-sm text-white/60 mt-1">Un admin sta esaminando il caso</p>
          </div>
        ) : match.status === "resolved" && match.winnerId ? (
          <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
            <p className="font-bold text-green-400">Match Concluso</p>
            <p className="text-lg mt-2">
              Vincitore: <span className="text-primary font-bold">
                {match.winnerId === match.team1Id ? match.team1?.name : match.team2?.name}
              </span>
            </p>
          </div>
        ) : null}
      </motion.div>

      {showDispute && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-400" />
            Apri Disputa
          </h3>
          <Textarea
            placeholder="Descrivi il motivo della disputa..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={4}
            data-testid="textarea-dispute-reason"
          />
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDispute(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive"
              onClick={() => disputeMutation.mutate(disputeReason)}
              disabled={!disputeReason.trim() || disputeMutation.isPending}
              data-testid="button-submit-dispute"
            >
              Invia Disputa
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
