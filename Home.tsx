import { Link, useLocation } from "wouter";
import { Trophy, ChevronRight, Flame, Crown, Users, Clock, CheckCircle, Swords, Award, Loader2, Calendar, FileText, ExternalLink, Target, Gift, Send, Hourglass } from "lucide-react";
import logoImage from "@assets/generated_images/itsme_circular_logo_with_crown_and_red_seal_stamp.png";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";
import type { Tournament, Team } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface TournamentWithTeams extends Tournament {
  teams?: Team[];
  userTeam?: Team | null;
  userMatch?: any;
}

interface LeaderboardUser {
  id: string;
  username: string;
  avatar: string | null;
  points: number;
}

type TournamentStatus = "upcoming" | "registration" | "checkin" | "live" | "completed";

function getTournamentStatus(t: TournamentWithTeams): TournamentStatus {
  if (t.status === "completed") return "completed";
  if (t.status === "live") return "live";
  if (t.checkInOpen) return "checkin";
  if (t.registrationOpen) return "registration";
  return "upcoming";
}

const statusConfig: Record<TournamentStatus, { label: string; color: string; bgColor: string }> = {
  upcoming: { label: "Prossimamente", color: "text-white/60", bgColor: "bg-white/10" },
  registration: { label: "Iscrizioni Aperte", color: "text-green-400", bgColor: "bg-green-500/20" },
  checkin: { label: "Check-in Aperto", color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  live: { label: "LIVE", color: "text-primary", bgColor: "bg-primary/20" },
  completed: { label: "Completato", color: "text-white/40", bgColor: "bg-white/10" },
};

export function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: activeTournament, isLoading: loadingTournament } = useQuery<TournamentWithTeams | null>({
    queryKey: ["active-tournament", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/tournaments/active");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardUser[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard?limit=5");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats/home");
      if (!res.ok) return { totalUsers: 0, totalTournaments: 0, totalMatches: 0 };
      return res.json();
    },
  });

  const { data: missionsData } = useQuery({
    queryKey: ["active-missions"],
    queryFn: async () => {
      const res = await fetch("/api/missions/active");
      if (!res.ok) return { daily: [], event: [] };
      return res.json();
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");

  const claimMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const res = await fetch(`/api/missions/${missionId}/claim`, { method: "POST" });
      if (!res.ok) throw new Error("Claim failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reward riscattato!", description: `+${data.reward?.value} ${data.reward?.type}` });
      queryClient.invalidateQueries({ queryKey: ["active-missions"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });

  const submitProofMutation = useMutation({
    mutationFn: async ({ missionId, proofUrl, note }: { missionId: string; proofUrl: string; note?: string }) => {
      const res = await fetch(`/api/missions/${missionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofUrl, note }),
      });
      if (!res.ok) throw new Error("Submit failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Prova inviata!", description: "In attesa di approvazione" });
      setSubmitModalOpen(false);
      setProofUrl("");
      setProofNote("");
      queryClient.invalidateQueries({ queryKey: ["active-missions"] });
    },
  });

  const handleSubmitProof = () => {
    if (!selectedMission || !proofUrl.trim()) return;
    submitProofMutation.mutate({ missionId: selectedMission.id, proofUrl, note: proofNote });
  };

  const getCTAConfig = () => {
    if (!activeTournament) {
      return {
        text: "Scopri i Tornei",
        subtext: "Nessun torneo attivo al momento",
        context: "Esplora i prossimi eventi",
        href: "/tournaments",
        icon: Trophy,
        variant: "outline" as const,
      };
    }

    const t = activeTournament;

    if (t.userMatch && (t.userMatch.status === "ready" || t.userMatch.status === "live")) {
      return {
        text: "Vai al Match",
        subtext: `Match Round ${t.userMatch.round} in corso`,
        context: "Il tuo avversario ti aspetta",
        href: `/match/${t.userMatch.id}`,
        icon: Swords,
        variant: "primary" as const,
      };
    }

    if (t.userTeam && t.checkInOpen && !t.userTeam.isCheckedIn) {
      return {
        text: "Fai Check-in",
        subtext: "Check-in aperto!",
        context: "Non perdere il tuo posto nel bracket",
        href: `/tournament/${t.id}/check-in`,
        icon: CheckCircle,
        variant: "primary" as const,
      };
    }

    if (t.userTeam && t.userTeam.isCheckedIn) {
      return {
        text: "Vedi Bracket",
        subtext: "Sei pronto!",
        context: "Check-in completato, attendi il bracket",
        href: `/tournament/${t.id}/bracket`,
        icon: Crown,
        variant: "secondary" as const,
      };
    }

    if (t.userTeam) {
      return {
        text: "Vedi Torneo",
        subtext: "Sei iscritto",
        context: "Il check-in aprirà a breve",
        href: `/tournament/${t.id}`,
        icon: Clock,
        variant: "secondary" as const,
      };
    }

    if (t.registrationOpen) {
      return {
        text: "Iscriviti Ora",
        subtext: "Iscrizioni aperte",
        context: `Posti disponibili: ${t.maxTeams - (t.teams?.length || 0)}`,
        href: `/tournament/${t.id}/register`,
        icon: Trophy,
        variant: "primary" as const,
      };
    }

    if (t.status === "completed") {
      return {
        text: "Vedi Risultati",
        subtext: "Torneo concluso",
        context: "Hall of Fame",
        href: `/tournament/${t.id}/bracket`,
        icon: Award,
        variant: "outline" as const,
      };
    }

    return {
      text: "Vedi Torneo",
      subtext: t.name,
      context: "Dettagli evento",
      href: `/tournament/${t.id}`,
      icon: Trophy,
      variant: "outline" as const,
    };
  };

  const cta = getCTAConfig();
  const rankEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const status = activeTournament ? getTournamentStatus(activeTournament) : null;
  const statusStyle = status ? statusConfig[status] : null;

  return (
    <div className="space-y-6">
      {/* Compact Hero with Glass Effect */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-hero p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="relative z-10">
          {/* Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-4">
              <img src={logoImage} alt="ITSME" className="w-14 h-14 rounded-full ring-2 ring-primary/40" />
              <div>
                <h1 className="text-2xl md:text-3xl font-display">
                  ITSME <span className="text-primary">Hub</span>
                </h1>
                <p className="text-white/50 text-sm">Tornei VALORANT DuoQ</p>
              </div>
            </div>

            {isAuthenticated && user && (
              <Link href="/profile">
                <div className="flex items-center gap-2 surface-card px-3 py-2 cursor-pointer hover:border-primary/30 transition-colors" data-testid="link-user-profile">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{user.username}</span>
                  <span className="text-primary font-bold text-sm">{user.points || 0} pts</span>
                </div>
              </Link>
            )}
          </div>

          {/* Tournament Info + CTA */}
          {loadingTournament ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeTournament ? (
            <div className="space-y-4">
              {/* Status Badge + Tournament Name */}
              <div className="flex items-center gap-3 flex-wrap">
                {statusStyle && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusStyle.bgColor} ${statusStyle.color}`}>
                    {statusStyle.label}
                  </span>
                )}
                <h2 className="text-xl font-bold">{activeTournament.name}</h2>
              </div>

              {/* Info Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                {activeTournament.prizePool && activeTournament.prizePool > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 font-bold">€{activeTournament.prizePool}</span>
                    <span>premio</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{activeTournament.teams?.length || 0}/{activeTournament.maxTeams} team</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(activeTournament.date), "d MMM HH:mm", { locale: it })}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={cta.href}>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`val-btn ${cta.variant === "primary" ? "val-btn-primary" : cta.variant === "secondary" ? "val-btn-secondary" : "val-btn-outline"}`}
                    data-testid="button-main-cta"
                  >
                    <cta.icon className="h-5 w-5" />
                    {cta.text}
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </Link>
                <Link href={`/tournament/${activeTournament.id}`}>
                  <button className="val-btn val-btn-ghost" data-testid="button-tournament-details">
                    Dettagli Torneo
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-white/30" />
              <p className="text-white/50 mb-4">Nessun torneo attivo</p>
              <Link href="/tournaments">
                <button className="val-btn val-btn-outline">
                  <Trophy className="h-5 w-5" />
                  Scopri i Tornei
                </button>
              </Link>
            </div>
          )}
        </div>
      </motion.section>

      {/* 3-Column Grid: Action, Tournament, Leaderboard */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Card 1: La tua prossima azione */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="surface-card p-5"
        >
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-3">
            <Flame className="h-4 w-4 text-primary" />
            La Tua Prossima Azione
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${cta.variant === "primary" ? "bg-primary/20" : "bg-white/10"}`}>
              <cta.icon className={`h-5 w-5 ${cta.variant === "primary" ? "text-primary" : "text-white/60"}`} />
            </div>
            <div>
              <h3 className="font-bold">{cta.text}</h3>
              <p className="text-sm text-white/50">{cta.subtext}</p>
            </div>
          </div>
          <p className="text-xs text-white/40 mb-3">{cta.context}</p>
          <Link href={cta.href}>
            <button className="w-full val-btn val-btn-sm val-btn-primary" data-testid="button-action-card-cta">
              {cta.text}
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
        </motion.section>

        {/* Card 2: Prossimo Torneo */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="surface-card p-5"
        >
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-3">
            <Trophy className="h-4 w-4 text-yellow-400" />
            {activeTournament ? "Torneo Attivo" : "Prossimo Torneo"}
          </div>
          {activeTournament ? (
            <>
              <h3 className="font-bold mb-1 truncate">{activeTournament.name}</h3>
              <p className="text-sm text-white/50 mb-2">
                {format(new Date(activeTournament.date), "EEEE d MMM", { locale: it })}
              </p>
              <div className="flex items-center justify-between text-sm mb-3">
                {statusStyle && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.color}`}>
                    {statusStyle.label}
                  </span>
                )}
                <span className="text-white/40">{activeTournament.teams?.length || 0}/{activeTournament.maxTeams}</span>
              </div>
              {activeTournament.userTeam && (
                <div className="flex items-center gap-2 text-xs text-green-400 mb-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Iscritto: {activeTournament.userTeam.name}</span>
                </div>
              )}
              <Link href={`/tournament/${activeTournament.id}`}>
                <button className="w-full val-btn val-btn-sm val-btn-ghost" data-testid="button-view-tournament">
                  Vai al Torneo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </Link>
            </>
          ) : (
            <div className="text-center py-4">
              <Trophy className="h-10 w-10 mx-auto mb-2 text-white/20" />
              <p className="text-sm text-white/40">Nessun torneo</p>
            </div>
          )}
        </motion.section>

        {/* Card 3: Top Players */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="surface-card p-5"
        >
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-3">
            <Crown className="h-4 w-4 text-yellow-400" />
            Top Players
          </div>
          <div className="space-y-1.5">
            {leaderboard.length === 0 ? (
              <p className="text-white/40 text-center py-4 text-sm">Nessun player ancora</p>
            ) : (
              leaderboard.slice(0, 5).map((player, idx) => (
                <Link key={player.id} href={`/profile/${player.id}`}>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" data-testid={`link-player-${player.id}`}>
                    <span className="text-sm w-5">{rankEmojis[idx]}</span>
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.username} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {player.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className="flex-1 text-sm font-medium truncate">{player.username}</span>
                    <span className="text-primary text-sm font-bold">{player.points}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.section>
      </div>

      {/* Community Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="surface-card p-5"
      >
        <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-4">
          <Flame className="h-4 w-4 text-primary" />
          Statistiche Community
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-primary">{stats?.totalUsers || 0}</div>
            <div className="text-xs text-white/50">Utenti</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-yellow-400">{stats?.totalTournaments || 0}</div>
            <div className="text-xs text-white/50">Tornei</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-green-400">{stats?.totalMatches || 0}</div>
            <div className="text-xs text-white/50">Match</div>
          </div>
        </div>
      </motion.section>

      {/* Missioni di Oggi */}
      {missionsData && (missionsData.daily?.length > 0 || missionsData.event?.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="surface-card p-5"
        >
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-4">
            <Target className="h-4 w-4 text-green-400" />
            Missioni di Oggi
          </div>
          <div className="space-y-3">
            {[...(missionsData.daily || []), ...(missionsData.event || [])].slice(0, 3).map((mission: any) => {
              const progress = mission.userProgress?.progress || 0;
              const isCompleted = !!mission.userProgress?.completedAt;
              const isClaimed = !!mission.userProgress?.claimedAt;
              const hasPendingSubmission = !!mission.pendingSubmission;
              const progressPercent = Math.min(100, (progress / mission.targetValue) * 100);
              
              return (
                <div key={mission.id} className="p-3 rounded-lg bg-white/5 border border-white/10" data-testid={`mission-card-${mission.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{mission.title}</h4>
                      <p className="text-xs text-white/50 mt-0.5">{mission.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Gift className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">+{mission.rewardValue} {mission.rewardType}</span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full transition-all ${isClaimed ? 'bg-white/30' : isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{progress}/{mission.targetValue}</span>
                    
                    <div className="flex items-center gap-2">
                      {mission.linkUrl && !isCompleted && (
                        <a 
                          href={mission.linkUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="val-btn val-btn-xs val-btn-ghost"
                          data-testid={`button-mission-link-${mission.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Apri link
                        </a>
                      )}
                      
                      {hasPendingSubmission && (
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <Hourglass className="h-3 w-3" />
                          In revisione
                        </span>
                      )}
                      
                      {mission.type === "proof" && !isCompleted && !hasPendingSubmission && (
                        <button
                          onClick={() => { setSelectedMission(mission); setSubmitModalOpen(true); }}
                          className="val-btn val-btn-xs val-btn-ghost"
                          data-testid={`button-submit-proof-${mission.id}`}
                        >
                          <Send className="h-3 w-3" />
                          Invia prova
                        </button>
                      )}
                      
                      {isCompleted && !isClaimed && (
                        <button
                          onClick={() => claimMutation.mutate(mission.id)}
                          disabled={claimMutation.isPending}
                          className="val-btn val-btn-xs val-btn-primary"
                          data-testid={`button-claim-${mission.id}`}
                        >
                          <Gift className="h-3 w-3" />
                          Riscatta
                        </button>
                      )}
                      
                      {isClaimed && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Riscattato
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {isAuthenticated && (
            <Link href="/profile">
              <button className="w-full val-btn val-btn-sm val-btn-ghost mt-3" data-testid="button-all-missions">
                Vedi tutte le missioni
                <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
          )}
        </motion.section>
      )}

      {/* Submit Proof Modal */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSubmitModalOpen(false)}>
          <div 
            className="bg-card border border-white/10 rounded-lg p-6 w-full max-w-md" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">Invia prova</h3>
            <p className="text-sm text-white/60 mb-4">
              {selectedMission?.title} - Carica uno screenshot o link come prova
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">URL della prova (screenshot/immagine)</label>
                <Input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://i.imgur.com/..."
                  className="bg-white/5 border-white/10"
                  data-testid="input-proof-url"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Note (opzionale)</label>
                <Textarea
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Aggiungi dettagli..."
                  className="bg-white/5 border-white/10"
                  data-testid="input-proof-note"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setSubmitModalOpen(false)}>Annulla</Button>
              <Button 
                onClick={handleSubmitProof} 
                disabled={!proofUrl.trim() || submitProofMutation.isPending}
                data-testid="button-submit-proof-confirm"
              >
                {submitProofMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invia"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { href: "/tournaments", icon: Trophy, label: "Tornei", color: "text-primary" },
          { href: "/community", icon: Users, label: "Community", color: "text-blue-400" },
          { href: "/profile", icon: Crown, label: "Profilo", color: "text-yellow-400" },
          { href: "/rules", icon: FileText, label: "Regolamento", color: "text-green-400" },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <motion.div
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="surface-card p-3 text-center cursor-pointer hover:border-white/20 transition-all"
              data-testid={`link-quick-${link.label.toLowerCase()}`}
            >
              <link.icon className={`h-6 w-6 mx-auto mb-1.5 ${link.color}`} />
              <span className="text-sm font-medium">{link.label}</span>
            </motion.div>
          </Link>
        ))}
      </motion.section>
    </div>
  );
}
