import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, Play, Download, Loader2, Flag, Trash2, Check, X, AlertTriangle, Plus, Edit, Gift, Ticket, Award, Image, Users, Crown, UserCog, 
  Search, Ban, Star, MessageSquare, Video, Quote, Eye, EyeOff,
  Trophy, Zap, Heart, Flame, Sparkles, Medal, Target, Bookmark, ThumbsUp, ThumbsDown
} from "lucide-react";
import type { Tournament, Team } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

const LUCIDE_ICONS = [
  { value: "Trophy", label: "Trophy", icon: Trophy },
  { value: "Award", label: "Award", icon: Award },
  { value: "Medal", label: "Medal", icon: Medal },
  { value: "Star", label: "Star", icon: Star },
  { value: "Crown", label: "Crown", icon: Crown },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "Heart", label: "Heart", icon: Heart },
  { value: "Flame", label: "Flame", icon: Flame },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
  { value: "Target", label: "Target", icon: Target },
  { value: "Bookmark", label: "Bookmark", icon: Bookmark },
  { value: "Gift", label: "Gift", icon: Gift },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Users", label: "Users", icon: Users },
];

const RARITY_COLORS: Record<string, string> = {
  common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  legendary: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function getLucideIcon(iconName: string) {
  const found = LUCIDE_ICONS.find(i => i.value === iconName);
  if (found) {
    const IconComponent = found.icon;
    return <IconComponent className="h-5 w-5" />;
  }
  return <Award className="h-5 w-5" />;
}

export function Admin() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Shield className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-display">Accesso Admin</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Devi effettuare il login con Discord per accedere al pannello di amministrazione.
        </p>
        <a href="/api/auth/discord">
          <Button className="val-btn" data-testid="button-admin-login">
            Accedi con Discord
          </Button>
        </a>
      </div>
    );
  }

  if (user.role !== "admin" && user.role !== "mod") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-display">Accesso Negato</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Non hai i permessi necessari per accedere al pannello di amministrazione.
        </p>
        <Link href="/">
          <Button variant="outline">Torna alla Home</Button>
        </Link>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-display">Pannello Admin</h1>
          <span className={`px-2 py-1 rounded text-xs font-medium ${isAdmin ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
            {isAdmin ? 'Admin' : 'Moderatore'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.username}</span>
          <Button variant="outline" onClick={() => logout()}>Logout</Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className={`grid w-full bg-secondary ${isAdmin ? 'grid-cols-9' : 'grid-cols-7'}`}>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="tournaments">Tornei</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="missions">Missioni</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          {isAdmin && <TabsTrigger value="badges">Badge</TabsTrigger>}
          <TabsTrigger value="moderation">Moderazione</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Utenti</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-6">
          <DashboardTab 
            selectedTournamentId={selectedTournamentId} 
            setSelectedTournamentId={setSelectedTournamentId} 
          />
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-4 mt-6">
          <TournamentsTab />
        </TabsContent>

        <TabsContent value="teams" className="space-y-4 mt-6">
          <TeamsTab tournamentId={selectedTournamentId} />
        </TabsContent>

        <TabsContent value="bracket" className="space-y-4 mt-6">
          <BracketTab tournamentId={selectedTournamentId} />
        </TabsContent>

        <TabsContent value="missions" className="space-y-4 mt-6">
          <MissionsAdminTab />
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4 mt-6">
          <RewardsAdminTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="badges" className="space-y-4 mt-6">
            <BadgesAdminTab />
          </TabsContent>
        )}

        <TabsContent value="moderation" className="space-y-4 mt-6">
          <ModerationTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="space-y-4 mt-6">
            <UsersManagementTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function DashboardTab({ 
  selectedTournamentId, 
  setSelectedTournamentId 
}: { 
  selectedTournamentId: string | null;
  setSelectedTournamentId: (id: string | null) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/tournaments");
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams", selectedTournamentId],
    queryFn: async () => {
      if (!selectedTournamentId) return [];
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/teams`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    enabled: !!selectedTournamentId,
  });

  const updateTournamentMutation = useMutation({
    mutationFn: async (updates: Partial<Tournament>) => {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament updated" });
    },
  });

  const generateBracketMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/generate-bracket`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate bracket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", selectedTournamentId] });
      toast({ title: "Bracket Generated", description: "Matches have been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded border border-white/10">
        <h3 className="text-xl font-display mb-4">Select Tournament</h3>
        <select
          value={selectedTournamentId || ""}
          onChange={(e) => setSelectedTournamentId(e.target.value || null)}
          className="w-full p-3 bg-secondary border border-white/10 rounded text-white"
          data-testid="select-tournament"
        >
          <option value="">Choose a tournament...</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTournament && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded border border-white/10 space-y-4">
            <h3 className="text-xl font-display mb-4">Quick Actions</h3>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded">
              <span>Registration Status</span>
              <Switch 
                checked={selectedTournament.registrationOpen}
                onCheckedChange={(c) => updateTournamentMutation.mutate({ registrationOpen: c })}
                data-testid="switch-registration"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded">
              <span>Check-in Status</span>
              <Switch 
                checked={selectedTournament.checkInOpen}
                onCheckedChange={(c) => updateTournamentMutation.mutate({ checkInOpen: c })}
                data-testid="switch-checkin"
              />
            </div>

            <Button 
              className="w-full mt-4 bg-primary hover:bg-primary/90"
              onClick={() => generateBracketMutation.mutate()}
              disabled={generateBracketMutation.isPending}
              data-testid="button-generate-bracket"
            >
              {generateBracketMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Tournament (Generate Bracket)
            </Button>
          </div>

          <div className="bg-card p-6 rounded border border-white/10">
            <h3 className="text-xl font-display mb-4">Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Registered Teams:</span>
                <span className="font-mono text-primary">{teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Checked-in:</span>
                <span className="font-mono text-green-400">
                  {teams.filter(t => t.isCheckedIn).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Approved:</span>
                <span className="font-mono text-blue-400">
                  {teams.filter(t => t.status === 'approved').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamsTab({ tournamentId }: { tournamentId: string | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["teams", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    enabled: !!tournamentId,
  });

  const approveTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const res = await fetch(`/api/teams/${teamId}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to approve team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", tournamentId] });
      toast({ title: "Team approved" });
    },
  });

  const rejectTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const res = await fetch(`/api/teams/${teamId}/reject`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to reject team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", tournamentId] });
      toast({ title: "Team rejected" });
    },
  });

  const downloadCSV = () => {
    const headers = ["ID", "Name", "Captain", "Duo", "Email", "Discord", "CheckInCode", "Status"];
    const rows = teams.map(t => [t.id, t.name, t.captainName, t.duoName, t.email, t.discordId, t.checkInCode, t.status].join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "teams_export.csv");
    document.body.appendChild(link);
    link.click();
  };

  if (!tournamentId) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Please select a tournament first
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={downloadCSV} data-testid="button-export-csv">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      
      {teams.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-lg">
          No teams registered yet
        </div>
      ) : (
        <div className="rounded-md border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="p-3">Team Name</th>
                <th className="p-3">Captain</th>
                <th className="p-3">Duo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Check-in</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-t border-white/5" data-testid={`row-team-${team.id}`}>
                  <td className="p-3 font-medium">{team.name}</td>
                  <td className="p-3">{team.captainName} ({team.captainRank})</td>
                  <td className="p-3">{team.duoName} ({team.duoRank})</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      team.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      team.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {team.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={team.isCheckedIn ? 'text-green-400' : 'text-muted-foreground'}>
                      {team.isCheckedIn ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-3">
                    {team.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-500"
                          onClick={() => approveTeamMutation.mutate(team.id)}
                          disabled={approveTeamMutation.isPending}
                          data-testid={`button-approve-${team.id}`}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => rejectTeamMutation.mutate(team.id)}
                          disabled={rejectTeamMutation.isPending}
                          data-testid={`button-reject-${team.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BracketTab({ tournamentId }: { tournamentId: string | null }) {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`);
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
    enabled: !!tournamentId,
  });

  if (!tournamentId) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Please select a tournament first
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-lg">
          No bracket generated yet. Generate the bracket from the Dashboard tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match: any) => (
            <div 
              key={match.id} 
              className="bg-card p-4 rounded border border-white/10"
              data-testid={`card-match-${match.id}`}
            >
              <div className="text-xs text-muted-foreground mb-2">Round {match.round}</div>
              <div className="space-y-2">
                <div className={`p-2 rounded ${match.winnerId === match.team1Id ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5'}`}>
                  Team 1: {match.team1Id || 'TBD'}
                </div>
                <div className="text-center text-xs text-muted-foreground">vs</div>
                <div className={`p-2 rounded ${match.winnerId === match.team2Id ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5'}`}>
                  Team 2: {match.team2Id || 'TBD'}
                </div>
              </div>
              {match.score1 !== null && match.score2 !== null && (
                <div className="mt-2 text-center text-lg font-bold">
                  {match.score1} - {match.score2}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: "",
    date: "",
    maxTeams: 16,
    teamSize: 2,
    format: "2v2",
    bracketSize: 16,
  });

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/tournaments");
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTournament) => {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date: new Date(data.date) }),
      });
      if (!res.ok) throw new Error("Failed to create tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament created!" });
      setShowCreateForm(false);
      setNewTournament({ name: "", date: "", maxTeams: 16, teamSize: 2, format: "2v2", bracketSize: 16 });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tornei ({tournaments.length})</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-1" /> Nuovo Torneo
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-white/5 p-4 rounded-xl space-y-4">
          <h3 className="font-bold">Crea nuovo torneo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={newTournament.name} onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="datetime-local" value={newTournament.date} onChange={(e) => setNewTournament({ ...newTournament, date: e.target.value })} />
            </div>
            <div>
              <Label>Max Teams</Label>
              <Input type="number" value={newTournament.maxTeams} onChange={(e) => setNewTournament({ ...newTournament, maxTeams: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Format</Label>
              <select 
                value={newTournament.format} 
                onChange={(e) => setNewTournament({ ...newTournament, format: e.target.value })}
                className="w-full val-input"
              >
                <option value="1v1">1v1</option>
                <option value="2v2">2v2</option>
                <option value="3v3">3v3</option>
                <option value="5v5">5v5</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate(newTournament)} disabled={createMutation.isPending || !newTournament.name}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crea"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Annulla</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tournaments.map((t) => (
          <div key={t.id} className="bg-card p-4 rounded-xl border border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold">{t.name}</h4>
                <p className="text-sm text-white/60">
                  {new Date(t.date).toLocaleDateString()} • {t.format} • Max {t.maxTeams} teams
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                t.status === 'live' ? 'bg-green-500/20 text-green-400' :
                t.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Report {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  reporter?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

function ModerationTab() {
  const [activeSubTab, setActiveSubTab] = useState<"reports" | "memes" | "clips" | "quotes" | "comments">("reports");
  
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {[
          { id: "reports", label: "Segnalazioni", icon: Flag },
          { id: "memes", label: "Memes", icon: Image },
          { id: "clips", label: "Clips", icon: Video },
          { id: "quotes", label: "Quotes", icon: Quote },
          { id: "comments", label: "Commenti", icon: MessageSquare },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeSubTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab(tab.id as any)}
            data-testid={`tab-moderation-${tab.id}`}
          >
            <tab.icon className="h-4 w-4 mr-1" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeSubTab === "reports" && <ReportsSubTab />}
      {activeSubTab === "memes" && <MemesSubTab />}
      {activeSubTab === "clips" && <ClipsSubTab />}
      {activeSubTab === "quotes" && <QuotesSubTab />}
      {activeSubTab === "comments" && <CommentsSubTab />}
    </div>
  );
}

function ReportsSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      const url = filter === "pending" ? "/api/admin/reports?status=pending" : "/api/admin/reports";
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ reportId, status, action }: { reportId: string; status: string; action?: string }) => {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, action }),
      });
      if (!res.ok) throw new Error("Failed to update report");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Azione completata" });
    },
  });

  const REASON_LABELS: Record<string, string> = {
    spam: "Spam o pubblicità",
    offensive: "Contenuto offensivo",
    inappropriate: "Contenuto inappropriato",
    copyright: "Violazione copyright",
    other: "Altro",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Segnalazioni</h3>
        <div className="flex gap-2">
          <Button 
            variant={filter === "pending" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("pending")}
          >
            In Attesa
          </Button>
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tutte
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-lg">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nessuna segnalazione {filter === "pending" ? "in attesa" : ""}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div 
              key={report.id}
              className={`p-4 rounded-xl border ${
                report.status === "pending" 
                  ? "bg-red-500/10 border-red-500/30" 
                  : "bg-white/5 border-white/10"
              }`}
              data-testid={`report-card-${report.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      report.status === "pending" ? "bg-orange-500/20 text-orange-400" :
                      report.status === "resolved" ? "bg-green-500/20 text-green-400" :
                      "bg-white/10 text-white/60"
                    }`}>
                      {report.status === "pending" ? "In Attesa" : 
                       report.status === "resolved" ? "Risolto" : "Ignorato"}
                    </span>
                    <span className="text-xs text-white/40">{report.contentType}</span>
                  </div>
                  <p className="font-medium">{REASON_LABELS[report.reason] || report.reason}</p>
                  {report.details && <p className="text-sm text-white/60 mt-1">{report.details}</p>}
                  <p className="text-xs text-white/40 mt-2">
                    Segnalato da {report.reporter?.username} • {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {report.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => actionMutation.mutate({ 
                        reportId: report.id, 
                        status: "resolved",
                        action: "delete"
                      })}
                      disabled={actionMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Elimina
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => actionMutation.mutate({ 
                        reportId: report.id, 
                        status: "dismissed"
                      })}
                      disabled={actionMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" /> Ignora
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemesSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: memes = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-memes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/memes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const featureMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/memes/${id}/feature`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-memes"] });
      toast({ title: "Stato aggiornato" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/memes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-memes"] });
      toast({ title: "Meme eliminato" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="rounded-md border border-white/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Thumbnail</th>
            <th className="p-3">Titolo</th>
            <th className="p-3">Autore</th>
            <th className="p-3">Voti</th>
            <th className="p-3">Featured</th>
            <th className="p-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {memes.map((meme) => (
            <tr key={meme.id} className="border-t border-white/5">
              <td className="p-3">
                <img src={meme.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
              </td>
              <td className="p-3 font-medium">{meme.title}</td>
              <td className="p-3">{meme.user?.username || "Unknown"}</td>
              <td className="p-3">
                <span className="text-green-400">+{meme.upvotes}</span>
                <span className="text-white/40 mx-1">/</span>
                <span className="text-red-400">-{meme.downvotes}</span>
              </td>
              <td className="p-3">
                {meme.featured ? (
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs">Featured</span>
                ) : (
                  <span className="text-white/40 text-xs">No</span>
                )}
              </td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => featureMutation.mutate(meme.id)}
                    disabled={featureMutation.isPending}
                  >
                    {meme.featured ? <EyeOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(meme.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {memes.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">Nessun meme</div>
      )}
    </div>
  );
}

function ClipsSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clips = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-clips"],
    queryFn: async () => {
      const res = await fetch("/api/admin/clips");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const featureMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/clips/${id}/feature`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clips"] });
      toast({ title: "Stato aggiornato" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/clips/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clips"] });
      toast({ title: "Clip eliminata" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="rounded-md border border-white/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Thumbnail</th>
            <th className="p-3">Titolo</th>
            <th className="p-3">Autore</th>
            <th className="p-3">Categoria</th>
            <th className="p-3">Featured</th>
            <th className="p-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {clips.map((clip) => (
            <tr key={clip.id} className="border-t border-white/5">
              <td className="p-3">
                {clip.thumbnailUrl ? (
                  <img src={clip.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover" />
                ) : (
                  <div className="h-10 w-16 rounded bg-white/10 flex items-center justify-center">
                    <Video className="h-4 w-4 text-white/40" />
                  </div>
                )}
              </td>
              <td className="p-3 font-medium">{clip.title}</td>
              <td className="p-3">{clip.user?.username || "Unknown"}</td>
              <td className="p-3">
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{clip.category}</span>
              </td>
              <td className="p-3">
                {clip.featured ? (
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs">Featured</span>
                ) : (
                  <span className="text-white/40 text-xs">No</span>
                )}
              </td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => featureMutation.mutate(clip.id)}
                    disabled={featureMutation.isPending}
                  >
                    {clip.featured ? <EyeOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(clip.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {clips.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">Nessuna clip</div>
      )}
    </div>
  );
}

function QuotesSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/quotes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const featureMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/quotes/${id}/feature`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast({ title: "Stato aggiornato" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast({ title: "Quote eliminata" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="rounded-md border border-white/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Contenuto</th>
            <th className="p-3">Autore</th>
            <th className="p-3">Voti</th>
            <th className="p-3">Featured</th>
            <th className="p-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id} className="border-t border-white/5">
              <td className="p-3 font-medium max-w-xs truncate">"{quote.content}"</td>
              <td className="p-3">{quote.author}</td>
              <td className="p-3">
                <span className="text-green-400">+{quote.upvotes}</span>
                <span className="text-white/40 mx-1">/</span>
                <span className="text-red-400">-{quote.downvotes}</span>
              </td>
              <td className="p-3">
                {quote.featured ? (
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs">Featured</span>
                ) : (
                  <span className="text-white/40 text-xs">No</span>
                )}
              </td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => featureMutation.mutate(quote.id)}
                    disabled={featureMutation.isPending}
                  >
                    {quote.featured ? <EyeOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(quote.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {quotes.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">Nessuna quote</div>
      )}
    </div>
  );
}

function CommentsSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/comments");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      toast({ title: "Commento eliminato" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="rounded-md border border-white/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Contenuto</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Autore</th>
            <th className="p-3">Likes</th>
            <th className="p-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {comments.map((comment) => (
            <tr key={comment.id} className="border-t border-white/5">
              <td className="p-3 max-w-xs truncate">{comment.content}</td>
              <td className="p-3">
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{comment.contentType}</span>
              </td>
              <td className="p-3">{comment.user?.username || "Unknown"}</td>
              <td className="p-3">{comment.likes || 0}</td>
              <td className="p-3">
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(comment.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {comments.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">Nessun commento</div>
      )}
    </div>
  );
}

function BadgesAdminTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState("");

  const [newBadge, setNewBadge] = useState({
    name: "",
    displayName: "",
    description: "",
    icon: "Trophy",
    rarity: "common",
    autoUnlock: false,
    unlockCondition: "",
  });

  const { data: badges = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const res = await fetch("/api/admin/badges");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-users", userSearch],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?search=${userSearch}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showAssignDialog,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newBadge) => {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast({ title: "Badge creato!" });
      setShowCreateDialog(false);
      setNewBadge({ name: "", displayName: "", description: "", icon: "Trophy", rarity: "common", autoUnlock: false, unlockCondition: "" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/badges/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast({ title: "Badge aggiornato!" });
      setEditingBadge(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/badges/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast({ title: "Badge eliminato" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/badges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Badge assegnato!" });
      setShowAssignDialog(false);
      setSelectedUserId("");
      setSelectedBadgeId("");
    },
    onError: () => toast({ title: "Errore nell'assegnazione", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="h-5 w-5" />
          Gestione Badge ({badges.length})
        </h2>
        <div className="flex gap-2">
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Gift className="h-4 w-4 mr-1" /> Assegna Badge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assegna Badge a Utente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cerca Utente</Label>
                  <Input 
                    placeholder="Nome utente..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  {users.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {users.slice(0, 10).map((u) => (
                        <div 
                          key={u.id}
                          className={`p-2 rounded cursor-pointer flex items-center gap-2 ${selectedUserId === u.id ? 'bg-primary/20' : 'hover:bg-white/5'}`}
                          onClick={() => setSelectedUserId(u.id)}
                        >
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="h-6 w-6 rounded-full" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                              {u.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <span>{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Seleziona Badge</Label>
                  <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Scegli badge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {badges.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => assignMutation.mutate({ userId: selectedUserId, badgeId: selectedBadgeId })}
                  disabled={!selectedUserId || !selectedBadgeId || assignMutation.isPending}
                >
                  {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assegna"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Crea Badge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Badge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome (ID)</Label>
                    <Input 
                      value={newBadge.name}
                      onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                      placeholder="badge_id"
                    />
                  </div>
                  <div>
                    <Label>Nome Display</Label>
                    <Input 
                      value={newBadge.displayName}
                      onChange={(e) => setNewBadge({ ...newBadge, displayName: e.target.value })}
                      placeholder="Badge Name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrizione</Label>
                  <Textarea 
                    value={newBadge.description}
                    onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                    placeholder="Descrizione del badge..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Icona</Label>
                    <Select value={newBadge.icon} onValueChange={(v) => setNewBadge({ ...newBadge, icon: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LUCIDE_ICONS.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            <div className="flex items-center gap-2">
                              <icon.icon className="h-4 w-4" />
                              {icon.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rarità</Label>
                    <Select value={newBadge.rarity} onValueChange={(v) => setNewBadge({ ...newBadge, rarity: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="autoUnlock"
                    checked={newBadge.autoUnlock}
                    onCheckedChange={(c) => setNewBadge({ ...newBadge, autoUnlock: !!c })}
                  />
                  <Label htmlFor="autoUnlock">Auto Unlock</Label>
                </div>
                <div>
                  <Label>Condizione Sblocco</Label>
                  <Input 
                    value={newBadge.unlockCondition}
                    onChange={(e) => setNewBadge({ ...newBadge, unlockCondition: e.target.value })}
                    placeholder="es: first_meme, votes_50..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createMutation.mutate(newBadge)}
                  disabled={!newBadge.name || !newBadge.displayName || createMutation.isPending}
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crea"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {badges.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-lg">
          Nessun badge nel catalogo. Crea il primo badge!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div 
              key={badge.id}
              className={`p-4 rounded-xl border ${RARITY_COLORS[badge.rarity] || RARITY_COLORS.common}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center">
                    {getLucideIcon(badge.icon)}
                  </div>
                  <div>
                    <h4 className="font-bold">{badge.displayName}</h4>
                    <p className="text-xs text-white/60">{badge.name}</p>
                  </div>
                </div>
                <span className="text-xs uppercase font-bold">{badge.rarity}</span>
              </div>
              <p className="text-sm text-white/70 mt-3">{badge.description}</p>
              {badge.autoUnlock && (
                <span className="inline-block mt-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                  Auto-unlock: {badge.unlockCondition}
                </span>
              )}
              <div className="flex gap-2 mt-4">
                <Dialog open={editingBadge?.id === badge.id} onOpenChange={(open) => !open && setEditingBadge(null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setEditingBadge({ ...badge })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Modifica Badge</DialogTitle>
                    </DialogHeader>
                    {editingBadge && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nome Display</Label>
                            <Input 
                              value={editingBadge.displayName}
                              onChange={(e) => setEditingBadge({ ...editingBadge, displayName: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Rarità</Label>
                            <Select value={editingBadge.rarity} onValueChange={(v) => setEditingBadge({ ...editingBadge, rarity: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="common">Common</SelectItem>
                                <SelectItem value="rare">Rare</SelectItem>
                                <SelectItem value="epic">Epic</SelectItem>
                                <SelectItem value="legendary">Legendary</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Descrizione</Label>
                          <Textarea 
                            value={editingBadge.description}
                            onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Icona</Label>
                          <Select value={editingBadge.icon} onValueChange={(v) => setEditingBadge({ ...editingBadge, icon: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LUCIDE_ICONS.map((icon) => (
                                <SelectItem key={icon.value} value={icon.value}>
                                  <div className="flex items-center gap-2">
                                    <icon.icon className="h-4 w-4" />
                                    {icon.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      <Button 
                        onClick={() => updateMutation.mutate({ id: editingBadge.id, data: editingBadge })}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Eliminare questo badge?")) {
                      deleteMutation.mutate(badge.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showBanDialog, setShowBanDialog] = useState<any>(null);
  const [showPointsDialog, setShowPointsDialog] = useState<any>(null);
  const [showBadgesDialog, setShowBadgesDialog] = useState<any>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<number | null>(null);
  const [newPoints, setNewPoints] = useState(0);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin", "users", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: allBadges = [] } = useQuery<any[]>({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const res = await fetch("/api/admin/badges");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: userBadges = [], refetch: refetchUserBadges } = useQuery<any[]>({
    queryKey: ["admin-user-badges", showBadgesDialog?.id],
    queryFn: async () => {
      if (!showBadgesDialog?.id) return [];
      const res = await fetch(`/api/admin/users/${showBadgesDialog.id}/badges`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!showBadgesDialog?.id,
  });

  const roleOptions = [
    { value: "user", label: "Utente" },
    { value: "moderator", label: "Moderatore" },
    { value: "admin", label: "Admin" },
  ];

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Ruolo aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ userId, points }: { userId: string; points: number }) => {
      const res = await fetch(`/api/admin/users/${userId}/points`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Punti aggiornati" });
      setShowPointsDialog(null);
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason, duration }: { userId: string; reason: string; duration: number | null }) => {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, duration }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Utente bannato" });
      setShowBanDialog(null);
      setBanReason("");
      setBanDuration(null);
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/unban`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Utente sbannato" });
    },
  });

  const awardBadgeMutation = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/badges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      refetchUserBadges();
      toast({ title: "Badge assegnato" });
    },
  });

  const revokeBadgeMutation = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/badges/${badgeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      refetchUserBadges();
      toast({ title: "Badge revocato" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestione Utenti ({users.length})
        </h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          placeholder="Cerca utenti per nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-users"
        />
      </div>

      <div className="bg-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-4 font-medium">Utente</th>
              <th className="text-left p-4 font-medium">Ruolo</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Punti</th>
              <th className="text-left p-4 font-medium">Badge</th>
              <th className="text-left p-4 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.username} className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{u.username?.[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <span className="font-medium">{u.username}</span>
                  </div>
                </td>
                <td className="p-4">
                  <Select 
                    value={u.role} 
                    onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    u.status === "banned" ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {u.status === "banned" ? "Bannato" : "Attivo"}
                  </span>
                  {u.bannedUntil && (
                    <span className="text-xs text-white/40 ml-2">
                      fino al {new Date(u.bannedUntil).toLocaleDateString()}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-primary font-bold">{u.points}</span>
                </td>
                <td className="p-4">
                  <span className="text-white/60">{u.badges?.length || 0}</span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setShowPointsDialog(u);
                        setNewPoints(u.points);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {u.status === "banned" ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-green-400 border-green-400/30"
                        onClick={() => unbanMutation.mutate(u.id)}
                        disabled={unbanMutation.isPending}
                      >
                        Unban
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => setShowBanDialog(u)}
                        disabled={u.role === "admin"}
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowBadgesDialog(u)}
                    >
                      <Award className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">Nessun utente trovato</div>
        )}
      </div>

      <Dialog open={!!showBanDialog} onOpenChange={(open) => !open && setShowBanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banna Utente: {showBanDialog?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo del ban</Label>
              <Textarea 
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Inserisci il motivo..."
              />
            </div>
            <div>
              <Label>Durata (giorni)</Label>
              <Input 
                type="number"
                value={banDuration || ""}
                onChange={(e) => setBanDuration(e.target.value ? Number(e.target.value) : null)}
                placeholder="Lascia vuoto per ban permanente"
              />
              <p className="text-xs text-white/40 mt-1">Lascia vuoto per un ban permanente</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(null)}>Annulla</Button>
            <Button 
              variant="destructive"
              onClick={() => banMutation.mutate({ 
                userId: showBanDialog.id, 
                reason: banReason, 
                duration: banDuration 
              })}
              disabled={!banReason || banMutation.isPending}
            >
              {banMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Banna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPointsDialog} onOpenChange={(open) => !open && setShowPointsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Punti: {showPointsDialog?.username}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Punti</Label>
            <Input 
              type="number"
              value={newPoints}
              onChange={(e) => setNewPoints(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPointsDialog(null)}>Annulla</Button>
            <Button 
              onClick={() => updatePointsMutation.mutate({ userId: showPointsDialog.id, points: newPoints })}
              disabled={updatePointsMutation.isPending}
            >
              {updatePointsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showBadgesDialog} onOpenChange={(open) => !open && setShowBadgesDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestisci Badge: {showBadgesDialog?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Badge Attuali</Label>
              {userBadges.length === 0 ? (
                <p className="text-sm text-white/40 mt-2">Nessun badge assegnato</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {userBadges.map((ub: any) => (
                    <div key={ub.id} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <div className="flex items-center gap-2">
                        {getLucideIcon(ub.badge?.icon || "Award")}
                        <span>{ub.badge?.displayName || "Badge"}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => revokeBadgeMutation.mutate({ 
                          userId: showBadgesDialog.id, 
                          badgeId: ub.badgeId 
                        })}
                        disabled={revokeBadgeMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Assegna Nuovo Badge</Label>
              <div className="flex gap-2 mt-2">
                <Select onValueChange={(badgeId) => {
                  if (badgeId) {
                    awardBadgeMutation.mutate({ userId: showBadgesDialog.id, badgeId });
                  }
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleziona badge..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allBadges
                      .filter((b) => !userBadges.some((ub: any) => ub.badgeId === b.id))
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.displayName}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBadgesDialog(null)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RewardsAdminTab() {
  return (
    <div className="space-y-6">
      <InvitesAdminSection />
      <RaffleAdminSection />
      <PowerAdminSection />
      <ProofsAdminSection />
    </div>
  );
}

function InvitesAdminSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async () => {
      const res = await fetch("/api/admin/invites");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(`/api/admin/invites/${inviteId}/confirm`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
      toast({ title: "Invite confermato" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Inviti Pendenti ({invites.length})
      </h3>
      {invites.length === 0 ? (
        <p className="text-white/60">Nessun invito da confermare</p>
      ) : (
        <div className="space-y-2">
          {invites.map((inv: any) => (
            <div key={inv.id} className="bg-white/5 p-3 rounded flex justify-between items-center">
              <div>
                <span className="font-medium">{inv.inviter?.username}</span>
                <span className="text-white/60 mx-2">ha invitato</span>
                <span className="text-primary">{inv.invitedDiscordUserId}</span>
              </div>
              {inv.status === "eligible" && (
                <Button size="sm" onClick={() => confirmMutation.mutate(inv.id)} disabled={confirmMutation.isPending}>
                  <Check className="h-4 w-4 mr-1" /> Conferma
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RaffleAdminSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDraw, setNewDraw] = useState({ name: "", prize: "", ticketCost: 1 });

  const { data: draws = [], isLoading } = useQuery({
    queryKey: ["admin-raffle"],
    queryFn: async () => {
      const res = await fetch("/api/admin/raffle/draws");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newDraw) => {
      const res = await fetch("/api/admin/raffle/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-raffle"] });
      toast({ title: "Draw creato" });
      setNewDraw({ name: "", prize: "", ticketCost: 1 });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (drawId: string) => {
      const res = await fetch(`/api/admin/raffle/draws/${drawId}/close`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-raffle"] });
      toast({ title: "Draw chiuso" });
    },
  });

  const drawWinnerMutation = useMutation({
    mutationFn: async (drawId: string) => {
      const res = await fetch(`/api/admin/raffle/draws/${drawId}/draw`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-raffle"] });
      toast({ title: `Vincitore: ${data.winner?.username || "Nessuno"}` });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white/5 p-4 rounded-xl space-y-3">
        <h3 className="font-bold">Nuovo Draw</h3>
        <div className="grid grid-cols-3 gap-3">
          <Input placeholder="Nome" value={newDraw.name} onChange={e => setNewDraw(p => ({ ...p, name: e.target.value }))} />
          <Input placeholder="Premio" value={newDraw.prize} onChange={e => setNewDraw(p => ({ ...p, prize: e.target.value }))} />
          <Input type="number" placeholder="Costo ticket" value={newDraw.ticketCost} onChange={e => setNewDraw(p => ({ ...p, ticketCost: parseInt(e.target.value) || 1 }))} />
        </div>
        <Button onClick={() => createMutation.mutate(newDraw)} disabled={createMutation.isPending || !newDraw.name}>
          Crea Draw
        </Button>
      </div>

      <div className="space-y-3">
        {draws.map((d: any) => (
          <div key={d.id} className="bg-card p-4 rounded-xl border border-white/10">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold">{d.name}</h4>
                <p className="text-sm text-white/60">Premio: {d.prize} • Ticket: {d.ticketCost} • Partecipanti: {d.participantCount || 0}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${d.status === "active" ? "bg-green-500/20 text-green-400" : d.status === "closed" ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10"}`}>
                  {d.status}
                </span>
                {d.winnerId && <span className="ml-2 text-sm text-primary">Vincitore: {d.winner?.username}</span>}
              </div>
              <div className="flex gap-2">
                {d.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => closeMutation.mutate(d.id)}>Chiudi</Button>
                )}
                {d.status === "closed" && !d.winnerId && (
                  <Button size="sm" onClick={() => drawWinnerMutation.mutate(d.id)}>Estrai</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PowerAdminSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-power-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/power/requests");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/admin/power/requests/${requestId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-power-requests"] });
      toast({ title: "Reward assegnato" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Richieste Power Rewards</h3>
      {requests.length === 0 ? (
        <p className="text-white/60">Nessuna richiesta in attesa</p>
      ) : (
        <div className="space-y-2">
          {requests.map((req: any) => (
            <div key={req.id} className="bg-white/5 p-3 rounded flex justify-between items-center">
              <div>
                <span className="font-medium">{req.user?.username}</span>
                <span className="text-white/60 mx-2">richiede</span>
                <span className="text-primary">{req.reward?.name}</span>
                <span className="text-white/40 text-sm ml-2">({req.reward?.cost} punti)</span>
              </div>
              {req.status === "pending" && (
                <Button size="sm" onClick={() => approveMutation.mutate(req.id)} disabled={approveMutation.isPending}>
                  <Check className="h-4 w-4 mr-1" /> Approva
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProofsAdminSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ["admin-proofs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/proofs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ proofId, status, ticketsAwarded }: { proofId: string; status: string; ticketsAwarded?: number }) => {
      const res = await fetch(`/api/admin/proofs/${proofId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ticketsAwarded }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-proofs"] });
      toast({ title: "Proof aggiornato" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Social Proofs in attesa</h3>
      {proofs.length === 0 ? (
        <p className="text-white/60">Nessun proof da verificare</p>
      ) : (
        <div className="space-y-3">
          {proofs.map((p: any) => (
            <div key={p.id} className="bg-white/5 p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{p.user?.username}</span>
                  <span className="text-white/40 text-sm ml-2">• {p.platform}</span>
                  <a href={p.proofUrl} target="_blank" rel="noopener" className="block text-primary text-sm hover:underline">{p.proofUrl}</a>
                  {p.note && <p className="text-white/60 text-sm mt-1">{p.note}</p>}
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => actionMutation.mutate({ proofId: p.id, status: "approved", ticketsAwarded: 1 })}>
                      <Check className="h-4 w-4 mr-1" /> +1 Ticket
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => actionMutation.mutate({ proofId: p.id, status: "rejected" })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MissionsAdminTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMission, setNewMission] = useState({
    title: "",
    description: "",
    scope: "daily",
    type: "auto",
    actionKey: "checkin",
    targetValue: 1,
    rewardType: "points",
    rewardValue: 10,
    linkUrl: "",
  });

  const { data: allMissions = [], isLoading } = useQuery({
    queryKey: ["admin-missions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/missions");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/missions/submissions?status=pending");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/missions/seed", { method: "POST" });
      if (!res.ok) throw new Error("Seed failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-missions"] });
      toast({ title: "Missioni di default create!" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newMission) => {
      const res = await fetch("/api/admin/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-missions"] });
      toast({ title: "Missione creata!" });
      setShowCreateForm(false);
      setNewMission({ title: "", description: "", scope: "daily", type: "auto", actionKey: "checkin", targetValue: 1, rewardType: "points", rewardValue: 10, linkUrl: "" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-missions"] });
      toast({ title: "Missione aggiornata" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ submissionId, action }: { submissionId: string; action: "approve" | "reject" }) => {
      const res = await fetch(`/api/admin/missions/submissions/${submissionId}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error("Review failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-missions"] });
      toast({ title: "Submission revisionata" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestione Missioni</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Seed Default"}
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-1" /> Nuova Missione
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white/5 p-4 rounded-xl space-y-4">
          <h3 className="font-bold">Crea nuova missione</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Titolo</Label>
              <Input value={newMission.title} onChange={(e) => setNewMission({ ...newMission, title: e.target.value })} />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Input value={newMission.description} onChange={(e) => setNewMission({ ...newMission, description: e.target.value })} />
            </div>
            <div>
              <Label>Scope</Label>
              <select 
                value={newMission.scope} 
                onChange={(e) => setNewMission({ ...newMission, scope: e.target.value })}
                className="w-full val-input"
              >
                <option value="daily">Daily</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <Label>Tipo</Label>
              <select 
                value={newMission.type} 
                onChange={(e) => setNewMission({ ...newMission, type: e.target.value })}
                className="w-full val-input"
              >
                <option value="auto">Auto</option>
                <option value="proof">Proof</option>
              </select>
            </div>
            <div>
              <Label>Action Key</Label>
              <select 
                value={newMission.actionKey} 
                onChange={(e) => setNewMission({ ...newMission, actionKey: e.target.value })}
                className="w-full val-input"
              >
                <option value="checkin">Check-in</option>
                <option value="match_win">Match Win</option>
                <option value="community_vote">Community Vote</option>
                <option value="discord_share">Discord Share</option>
                <option value="discord_invite">Discord Invite</option>
                <option value="vc_time">VC Time</option>
              </select>
            </div>
            <div>
              <Label>Target Value</Label>
              <Input type="number" value={newMission.targetValue} onChange={(e) => setNewMission({ ...newMission, targetValue: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Reward Type</Label>
              <select 
                value={newMission.rewardType} 
                onChange={(e) => setNewMission({ ...newMission, rewardType: e.target.value })}
                className="w-full val-input"
              >
                <option value="points">Points</option>
                <option value="tickets">Tickets</option>
                <option value="badge">Badge</option>
              </select>
            </div>
            <div>
              <Label>Reward Value</Label>
              <Input type="number" value={newMission.rewardValue} onChange={(e) => setNewMission({ ...newMission, rewardValue: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <Label>Link URL (opzionale)</Label>
              <Input value={newMission.linkUrl} onChange={(e) => setNewMission({ ...newMission, linkUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate(newMission)} disabled={createMutation.isPending || !newMission.title}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crea"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Annulla</Button>
          </div>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl space-y-3">
          <h3 className="font-bold text-yellow-400">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            {submissions.length} Submissions da revisionare
          </h3>
          {submissions.map((sub: any) => (
            <div key={sub.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-start">
              <div>
                <p className="font-medium">{sub.user?.username || "User"} - {sub.mission?.title}</p>
                <a href={sub.proofUrl} target="_blank" rel="noopener" className="text-primary text-sm hover:underline">{sub.proofUrl}</a>
                {sub.note && <p className="text-white/60 text-sm">{sub.note}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => reviewMutation.mutate({ submissionId: sub.id, action: "approve" })}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reviewMutation.mutate({ submissionId: sub.id, action: "reject" })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-bold">Tutte le missioni ({allMissions.length})</h3>
        {allMissions.length === 0 ? (
          <p className="text-white/60">Nessuna missione. Clicca "Seed Default" per creare le missioni base.</p>
        ) : (
          allMissions.map((m: any) => (
            <div key={m.id} className={`p-4 rounded-xl ${m.isActive ? 'bg-white/5' : 'bg-white/5 opacity-50'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className={`px-2 py-0.5 rounded text-xs uppercase mr-2 ${m.scope === 'event' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                    {m.scope}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs uppercase mr-2 ${m.type === 'proof' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {m.type}
                  </span>
                  <span className="font-medium">{m.title}</span>
                  <span className="text-white/40 text-sm ml-2">{m.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-primary font-bold">+{m.rewardValue} {m.rewardType}</span>
                  <Switch 
                    checked={m.isActive} 
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: m.id, isActive: checked })}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
