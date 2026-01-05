import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Trophy, ImageIcon, Video, ThumbsUp, Calendar, MessageSquare, Award, User, Flame, Zap, Target, Gift, CheckCircle, Send, Hourglass, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BADGES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface UserProfile {
  id: string;
  username: string;
  avatar: string | null;
  points: number;
  badges: string[];
  createdAt: string;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastLoginDate: string;
  } | null;
  stats: {
    memesCount: number;
    clipsCount: number;
    totalUpvotes: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
    votesGiven: number;
    messagesCount: number;
  };
  recentMemes: Array<{ id: string; title: string; imageUrl: string; upvotes: number }>;
  recentClips: Array<{ id: string; title: string; thumbnailUrl: string | null; upvotes: number }>;
}

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  
  const profileId = id || currentUser?.id;
  const isOwnProfile = !id || id === currentUser?.id;
  
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${profileId}/profile`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!profileId,
  });

  const { data: missionsData } = useQuery({
    queryKey: ["my-missions"],
    queryFn: async () => {
      const res = await fetch("/api/missions/me");
      if (!res.ok) return { active: [], completed: [] };
      return res.json();
    },
    enabled: isOwnProfile,
  });

  const claimMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const res = await fetch(`/api/missions/${missionId}/claim`, { method: "POST" });
      if (!res.ok) throw new Error("Claim failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reward riscattato!", description: `+${data.reward?.value} ${data.reward?.type}` });
      queryClient.invalidateQueries({ queryKey: ["my-missions"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
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
      queryClient.invalidateQueries({ queryKey: ["my-missions"] });
    },
  });

  const handleSubmitProof = () => {
    if (!selectedMission || !proofUrl.trim()) return;
    submitProofMutation.mutate({ missionId: selectedMission.id, proofUrl, note: proofNote });
  };

  if (!profileId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="frosted-card p-12">
          <User className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-display mb-2">Accedi per vedere il profilo</h2>
          <p className="text-white/50">Connetti Discord per visualizzare il tuo profilo</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20">
        <div className="frosted-card p-12">
          <User className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">Profilo non trovato</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="frosted-card p-8"
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-28 h-28 md:w-36 md:h-36 rounded-full ring-4 ring-primary/30"
              />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/30">
                <span className="text-4xl md:text-5xl font-bold text-primary">
                  {profile.username[0].toUpperCase()}
                </span>
              </div>
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-2 -right-2 bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg"
            >
              {profile.points} pts
            </motion.div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-display mb-2" data-testid="text-profile-username">
              {profile.username}
            </h1>
            <p className="text-white/50 mb-5">
              Membro dal {new Date(profile.createdAt).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
            </p>

            {profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {profile.badges.map((badgeId) => {
                  const badge = BADGES[badgeId as keyof typeof BADGES];
                  if (!badge) return null;
                  return (
                    <motion.div
                      key={badgeId}
                      whileHover={{ scale: 1.05 }}
                      className="glass px-4 py-1.5 rounded-full text-sm flex items-center gap-1.5"
                      title={badge.description}
                    >
                      <span>{badge.icon}</span>
                      <span className="text-white/80">{badge.name}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Login Streak Card */}
      {profile.streak && profile.streak.currentStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="frosted-card p-6"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Flame className="h-8 w-8 text-white" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full"
                >
                  {profile.streak.currentStreak}
                </motion.div>
              </div>
              <div>
                <h3 className="text-xl font-bold">Login Streak</h3>
                <p className="text-white/60">
                  {profile.streak.currentStreak === 1 
                    ? "1 giorno consecutivo" 
                    : `${profile.streak.currentStreak} giorni consecutivi`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-2xl font-bold">{profile.streak.longestStreak}</span>
                </div>
                <p className="text-xs text-white/40">Record</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
        {[
          { icon: ImageIcon, label: "Memes", value: profile.stats.memesCount, color: "text-pink-400" },
          { icon: Video, label: "Clips", value: profile.stats.clipsCount, color: "text-blue-400" },
          { icon: ThumbsUp, label: "Upvotes", value: profile.stats.totalUpvotes, color: "text-green-400" },
          { icon: Trophy, label: "Tornei", value: profile.stats.tournamentsPlayed, color: "text-yellow-400" },
          { icon: Award, label: "Vittorie", value: profile.stats.tournamentsWon, color: "text-primary" },
          { icon: Calendar, label: "Voti Dati", value: profile.stats.votesGiven, color: "text-purple-400" },
          { icon: MessageSquare, label: "Messaggi", value: profile.stats.messagesCount, color: "text-cyan-400" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -4 }}
            className="frosted-card-hover p-4 text-center"
          >
            <stat.icon className={`h-5 w-5 md:h-6 md:w-6 mx-auto mb-2 ${stat.color}`} />
            <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-white/40">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Missioni Section - Solo per il proprio profilo */}
      {isOwnProfile && missionsData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="frosted-card p-6"
        >
          <h2 className="text-xl md:text-2xl font-display mb-5 flex items-center gap-2">
            <Target className="h-5 w-5 text-green-400" />
            Le tue Missioni
          </h2>
          
          {missionsData.active?.length === 0 && missionsData.completed?.length === 0 ? (
            <div className="text-center py-10 glass-subtle rounded-xl">
              <Target className="h-10 w-10 mx-auto mb-2 text-white/20" />
              <p className="text-white/40">Nessuna missione disponibile</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Missioni Attive */}
              {missionsData.active?.length > 0 && (
                <div>
                  <h3 className="text-sm uppercase text-white/40 mb-3 tracking-wider">Attive</h3>
                  <div className="space-y-3">
                    {missionsData.active.map((mission: any) => {
                      const progress = mission.userProgress?.progress || 0;
                      const isCompleted = !!mission.userProgress?.completedAt;
                      const isClaimed = !!mission.userProgress?.claimedAt;
                      const hasPendingSubmission = !!mission.pendingSubmission;
                      const progressPercent = Math.min(100, (progress / mission.targetValue) * 100);
                      
                      return (
                        <div key={mission.id} className="p-4 rounded-xl bg-white/5 border border-white/10" data-testid={`mission-profile-${mission.id}`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs uppercase ${mission.scope === 'event' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                                  {mission.scope}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs uppercase ${mission.type === 'proof' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {mission.type}
                                </span>
                              </div>
                              <h4 className="font-bold">{mission.title}</h4>
                              <p className="text-sm text-white/50">{mission.description}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Gift className="h-4 w-4 text-yellow-400" />
                              <span className="text-yellow-400 font-bold">+{mission.rewardValue} {mission.rewardType}</span>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                            <div 
                              className={`h-full transition-all ${isClaimed ? 'bg-white/30' : isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/50">{progress}/{mission.targetValue}</span>
                            
                            <div className="flex items-center gap-2">
                              {mission.linkUrl && !isCompleted && (
                                <a 
                                  href={mission.linkUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="val-btn val-btn-sm val-btn-ghost"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Apri link
                                </a>
                              )}
                              
                              {hasPendingSubmission && (
                                <span className="text-sm text-yellow-400 flex items-center gap-1.5">
                                  <Hourglass className="h-4 w-4" />
                                  In revisione
                                </span>
                              )}
                              
                              {mission.type === "proof" && !isCompleted && !hasPendingSubmission && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setSelectedMission(mission); setSubmitModalOpen(true); }}
                                >
                                  <Send className="h-3.5 w-3.5 mr-1" />
                                  Invia prova
                                </Button>
                              )}
                              
                              {isCompleted && !isClaimed && (
                                <Button
                                  size="sm"
                                  onClick={() => claimMutation.mutate(mission.id)}
                                  disabled={claimMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Gift className="h-3.5 w-3.5 mr-1" />
                                  Riscatta
                                </Button>
                              )}
                              
                              {isClaimed && (
                                <span className="text-sm text-green-400 flex items-center gap-1.5">
                                  <CheckCircle className="h-4 w-4" />
                                  Riscattato
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Missioni Completate Recentemente */}
              {missionsData.completed?.length > 0 && (
                <div>
                  <h3 className="text-sm uppercase text-white/40 mb-3 tracking-wider">Completate di recente</h3>
                  <div className="space-y-2">
                    {missionsData.completed.slice(0, 5).map((mission: any) => (
                      <div key={mission.id} className="p-3 rounded-lg bg-white/5 border border-white/10 opacity-60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span>{mission.title}</span>
                          </div>
                          <span className="text-xs text-white/40">
                            +{mission.rewardValue} {mission.rewardType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
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
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Note (opzionale)</label>
                <Textarea
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Aggiungi dettagli..."
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setSubmitModalOpen(false)}>Annulla</Button>
              <Button 
                onClick={handleSubmitProof} 
                disabled={!proofUrl.trim() || submitProofMutation.isPending}
              >
                {submitProofMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invia"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="frosted-card p-6"
        >
          <h2 className="text-xl md:text-2xl font-display mb-5 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-pink-400" />
            Memes Recenti
          </h2>
          {profile.recentMemes.length === 0 ? (
            <div className="text-center py-10 glass-subtle rounded-xl">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 text-white/20" />
              <p className="text-white/40">Nessun meme ancora</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {profile.recentMemes.map((meme) => (
                <a
                  key={meme.id}
                  href="/memes"
                  className="group relative aspect-square rounded-xl overflow-hidden glass-subtle"
                >
                  <img
                    src={meme.imageUrl}
                    alt={meme.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="text-sm">
                      <p className="font-bold line-clamp-1">{meme.title}</p>
                      <p className="text-green-400 text-xs">+{meme.upvotes}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="frosted-card p-6"
        >
          <h2 className="text-xl md:text-2xl font-display mb-5 flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-400" />
            Clips Recenti
          </h2>
          {profile.recentClips.length === 0 ? (
            <div className="text-center py-10 glass-subtle rounded-xl">
              <Video className="h-10 w-10 mx-auto mb-2 text-white/20" />
              <p className="text-white/40">Nessuna clip ancora</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {profile.recentClips.map((clip) => (
                <a
                  key={clip.id}
                  href="/clips"
                  className="group relative aspect-video rounded-xl overflow-hidden glass-subtle"
                >
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-8 w-8 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="text-sm">
                      <p className="font-bold line-clamp-1">{clip.title}</p>
                      <p className="text-green-400 text-xs">+{clip.upvotes}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* All Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="frosted-card p-6"
      >
        <h2 className="text-xl md:text-2xl font-display mb-5 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Tutti i Badge
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.values(BADGES).map((badge) => {
            const hasBadge = profile.badges.includes(badge.id);
            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-2xl text-center transition-all ${
                  hasBadge
                    ? "frosted-card border-primary/30"
                    : "glass-subtle opacity-40"
                }`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <div className="font-bold text-sm text-white/80">{badge.name}</div>
                <div className="text-xs text-white/40 mt-1">{badge.description}</div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
