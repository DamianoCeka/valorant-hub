import { useRoute } from "wouter";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function Participants() {
  const [match, params] = useRoute("/tournament/:id/participants");
  const [search, setSearch] = useState("");

  const { data: tournament } = useQuery({
    queryKey: ["tournament", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}`);
      if (!res.ok) throw new Error("Tournament not found");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}/teams`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    enabled: !!params?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-3xl font-display">Tournament Not Found</h1>
        <p className="text-muted-foreground">The tournament you're looking for doesn't exist.</p>
      </div>
    );
  }

  const filteredTeams = teams.filter((team: any) => {
    const matchesSearch = team.name.toLowerCase().includes(search.toLowerCase()) || 
                          team.captainName.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display">Participants</h1>
          <p className="text-muted-foreground">
            {teams.length} teams registered. {teams.filter((t: any) => t.status === 'approved').length} approved.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search teams..." 
                    className="pl-8 val-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)} 
                />
             </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.length === 0 ? (
            <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-lg">
                <p className="text-muted-foreground">No teams found.</p>
            </div>
        ) : (
            filteredTeams.map((team: any) => (
              <div key={team.id} className="bg-card border border-white/10 rounded-lg p-5 hover:border-primary/50 transition-all group relative overflow-hidden">
                {/* Status Indicator */}
                <div className="absolute top-0 right-0 p-3">
                    {team.status === 'approved' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {team.status === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
                    {team.status === 'rejected' && <XCircle className="h-5 w-5 text-destructive" />}
                </div>

                <div className="mb-4">
                    <h3 className="text-xl font-bold font-display tracking-wide group-hover:text-primary transition-colors">{team.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className={cn(
                            "text-xs uppercase px-2 py-0.5 rounded font-bold tracking-wider",
                            team.isCheckedIn ? "bg-green-500/20 text-green-400" : "bg-white/5 text-muted-foreground"
                        )}>
                            {team.isCheckedIn ? "READY" : "OFFLINE"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Captain</span>
                        <div className="font-bold">{team.captainName}</div>
                        <div className="text-xs text-primary">{team.captainRank}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Duo</span>
                        <div className="font-bold">{team.duoName}</div>
                        <div className="text-xs text-primary">{team.duoRank}</div>
                    </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
