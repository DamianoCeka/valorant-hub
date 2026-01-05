import { useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { Trophy, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Match {
  id: string;
  round: number;
  team1Id?: string;
  team2Id?: string;
  score1?: number;
  score2?: number;
  status: string;
}

interface Team {
  id: string;
  name: string;
}

export function Bracket() {
  const [match, params] = useRoute("/tournament/:id/bracket");

  const { data: tournament, isLoading: loadingTournament } = useQuery({
    queryKey: ["tournament", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}`);
      if (!res.ok) throw new Error("Tournament not found");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["matches", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}/matches`);
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}/teams`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const isLoading = loadingTournament || loadingMatches;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-3xl font-display">Tournament Not Found</h1>
        <p className="text-muted-foreground">The tournament you're looking for doesn't exist.</p>
      </div>
    );
  }

  const getTeamName = (id?: string) => {
    if (!id) return "TBD";
    return teams.find((t: Team) => t.id === id)?.name || "Unknown";
  };

  const rounds = [1, 2, 3, 4]; // Supports up to Ro16 for now
  
  if (matches.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <Trophy className="h-16 w-16 text-muted-foreground opacity-50" />
              <h1 className="text-3xl font-display text-muted-foreground">Bracket Not Generated</h1>
              <p className="text-muted-foreground/50">The tournament organizer has not started the bracket yet.</p>
          </div>
      );
  }

  return (
    <div className="overflow-x-auto pb-10">
      <h1 className="text-4xl font-display mb-8">Tournament Bracket</h1>
      
      <div className="flex gap-16 min-w-max px-4">
        {rounds.map((round) => {
            const roundMatches = matches.filter((m: Match) => m.round === round);
            if (roundMatches.length === 0) return null;

            return (
                <div key={round} className="flex flex-col justify-around gap-8">
                    <h3 className="text-center font-display text-muted-foreground uppercase tracking-widest mb-4">
                        {round === 1 ? "Ro16" : round === 2 ? "Quarterfinals" : round === 3 ? "Semifinals" : "Finals"}
                    </h3>
                    
                    {roundMatches.map((m: Match) => (
                        <MatchCard key={m.id} match={m} getTeamName={getTeamName} />
                    ))}
                </div>
            );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match, getTeamName }: { match: Match, getTeamName: (id?: string) => string }) {
    return (
        <div className="w-64 bg-card border border-white/10 rounded overflow-hidden relative group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10 group-hover:bg-primary transition-colors"></div>
            
            <div className="flex justify-between items-center p-3 border-b border-white/5 bg-white/5">
                <span className={cn("font-bold truncate", !match.team1Id && "text-muted-foreground italic")}>
                    {getTeamName(match.team1Id)}
                </span>
                <span className="font-mono bg-black/20 px-2 rounded">{match.score1 ?? '-'}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-card">
                <span className={cn("font-bold truncate", !match.team2Id && "text-muted-foreground italic")}>
                    {getTeamName(match.team2Id)}
                </span>
                <span className="font-mono bg-black/20 px-2 rounded">{match.score2 ?? '-'}</span>
            </div>
        </div>
    );
}
