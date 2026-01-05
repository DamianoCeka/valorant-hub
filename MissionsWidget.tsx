import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Flame, Gift, Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Mission {
  id: string;
  missionType: string;
  progress: number;
  target: number;
  completed: boolean;
  points: number;
  name: string;
  icon: string;
  description: string;
}

interface StreakData {
  currentStreak: number;
  maxStreak: number;
  pointsEarned?: number;
  newBadge?: { name: string; icon: string } | null;
}

export function MissionsWidget() {
  const queryClient = useQueryClient();

  const { data: missions = [], isLoading: missionsLoading } = useQuery<Mission[]>({
    queryKey: ["missions"],
    queryFn: async () => {
      const res = await fetch("/api/missions");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: streak } = useQuery<StreakData>({
    queryKey: ["streak"],
    queryFn: async () => {
      const res = await fetch("/api/streak");
      if (!res.ok) return { currentStreak: 0, maxStreak: 0 };
      return res.json();
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/streak/check-in", { method: "POST" });
      if (!res.ok) throw new Error("Check-in failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  const completedCount = missions.filter(m => m.completed).length;
  const totalPoints = missions.reduce((acc, m) => acc + (m.completed ? m.points : 0), 0);

  if (missionsLoading) {
    return (
      <div className="frosted-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (missions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="frosted-card p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Missioni Giornaliere
        </h3>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="text-lg font-bold text-orange-500">{streak?.currentStreak || 0}</span>
          <span className="text-sm text-white/40">giorni</span>
        </div>
      </div>

      {streak?.currentStreak === 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => checkInMutation.mutate()}
          disabled={checkInMutation.isPending}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          data-testid="button-daily-checkin"
        >
          {checkInMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Flame className="h-5 w-5" />
              Check-in Giornaliero (+5 punti)
            </>
          )}
        </motion.button>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {missions.map((mission, idx) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-4 rounded-xl border transition-all ${
                mission.completed
                  ? "bg-green-500/10 border-green-500/30"
                  : "glass-subtle border-white/10"
              }`}
              data-testid={`mission-card-${mission.missionType}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mission.icon}</span>
                  <div>
                    <h4 className="font-bold text-white">{mission.name}</h4>
                    <p className="text-xs text-white/50">{mission.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mission.completed ? (
                    <div className="flex items-center gap-1 text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-bold">+{mission.points}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-primary">
                      <Gift className="h-4 w-4" />
                      <span className="text-sm font-bold">+{mission.points}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Progress 
                  value={(mission.progress / mission.target) * 100} 
                  className="flex-1 h-2"
                />
                <span className="text-xs text-white/60 font-tech w-12 text-right">
                  {mission.progress}/{mission.target}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {completedCount > 0 && (
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-white/50">
            {completedCount}/{missions.length} completate
          </span>
          <span className="text-sm font-bold text-green-400">
            +{totalPoints} punti guadagnati
          </span>
        </div>
      )}
    </motion.div>
  );
}
