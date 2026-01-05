import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  captainName: string;
  captainRank: string;
  duoName: string;
  duoRank: string;
  discordId: string;
  email: string;
  checkInCode: string;
  isCheckedIn: boolean;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  team1Id?: string;
  team2Id?: string;
  score1?: number;
  score2?: number;
  winnerId?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface Announcement {
  id: string;
  tournamentId?: string;
  title: string;
  content: string;
  date: string;
  type: 'news' | 'alert' | 'update';
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  maxTeams: number;
  registrationOpen: boolean;
  checkInOpen: boolean;
  streamDelay: number;
  bracketSize: number;
  rules: string;
  createdAt: string;
  participants?: number;
  prizePool?: number;
  status?: 'upcoming' | 'active' | 'completed';
  firstPlace?: { prize: number; perPlayer: number };
  secondPlace?: { prize: number; perPlayer: number };
}

interface AppState {
  tournaments: Tournament[];
  teams: Team[];
  matches: Match[];
  announcements: Announcement[];
  rules: string;
  
  // Actions
  createTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => void;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;
  addTeam: (team: Omit<Team, 'id' | 'checkInCode' | 'isCheckedIn' | 'status' | 'registeredAt'>) => void;
  approveTeam: (id: string) => void;
  rejectTeam: (id: string) => void;
  checkInTeam: (code: string) => boolean;
  generateBracket: (tournamentId: string) => void;
  updateMatch: (matchId: string, result: Partial<Match>) => void;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
  updateRules: (content: string) => void;
}

const DEFAULT_RULES = `# ITSME Tournament Rules

## General Rules
- All matches are Best of 1 until the finals (Best of 3).
- Map veto will be done via mapban.gg.
- Toxicity will result in immediate disqualification.
- All players must have a valid VALORANT account.

## Check-in
- Check-in opens 60 minutes before the tournament start.
- Failure to check in results in automatic disqualification.
- Check-in code will be provided at registration.

## Streaming
- All matches must be streamed on ITSME Twitch channel.
- Stream delay is set to 3 minutes for competitive fairness.
- Players must have game audio muted on stream.

## Conduct
- Respect all tournament officials and other players.
- No hate speech, discrimination, or harassment.
- Violators will be banned from future tournaments.

## Prizing
- Prizes are distributed according to final bracket placement.
- Prizes are split equally among team members.
- Payouts occur within 7 days after tournament conclusion.`;

// Initial Data
const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'tour-random-1',
    name: 'Random Tournament 1',
    date: new Date(Date.now() - 86400000 * 30).toISOString(),
    maxTeams: 100,
    registrationOpen: false,
    checkInOpen: false,
    streamDelay: 180,
    bracketSize: 64,
    participants: 100,
    prizePool: 500,
    status: 'completed',
    rules: `# Tournament Rules\n- Best of 1\n- Single Elimination`,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'tour-random-2',
    name: 'Random Tournament 2',
    date: new Date(Date.now() - 86400000 * 15).toISOString(),
    maxTeams: 100,
    registrationOpen: false,
    checkInOpen: false,
    streamDelay: 180,
    bracketSize: 64,
    participants: 100,
    prizePool: 600,
    status: 'completed',
    rules: `# Tournament Rules\n- Best of 1\n- Single Elimination`,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'tour-1v1-skirmish',
    name: '1v1 Skirmish',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    maxTeams: 80,
    registrationOpen: false,
    checkInOpen: false,
    streamDelay: 180,
    bracketSize: 64,
    participants: 82,
    prizePool: 1000,
    status: 'completed',
    rules: `# 1v1 Skirmish Rules\n- Best of 3\n- Single Elimination`,
    firstPlace: { prize: 600, perPlayer: 600 },
    secondPlace: { prize: 400, perPlayer: 400 },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'tour-duoq-winter',
    name: 'VALORANT DuoQ Winter Cup',
    date: new Date(Date.now() + 86400000 * 3).toISOString(),
    maxTeams: 40,
    registrationOpen: true,
    checkInOpen: false,
    streamDelay: 180,
    bracketSize: 16,
    participants: 24,
    prizePool: 120,
    status: 'upcoming',
    rules: `# General Rules
- All matches are BO1 until the finals (BO3).
- Map veto will be done via mapban.gg.
- Toxicity will result in immediate disqualification.

# Check-in
- Check-in opens 60 minutes before the tournament start.
- Failure to check in results in disqualification.

# Prizing
- 1st Place: $80 per player (1 team = 2 players)
- 2nd Place: $20 per player (1 team = 2 players)`,
    firstPlace: { prize: 80, perPlayer: 40 },
    secondPlace: { prize: 40, perPlayer: 20 },
    createdAt: new Date().toISOString(),
  }
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', title: 'Welcome to ITSME!', content: 'Join the #1 VALORANT community and compete in our tournaments.', date: new Date().toISOString(), type: 'news' },
  { id: '2', title: '1v1 Skirmish Concluded!', content: 'Congratulations to all participants! 1000 EUR distributed. See results in completed tournaments.', date: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'news' },
  { id: '3', title: 'Winter Cup Starting Soon', content: 'Register now for VALORANT DuoQ Winter Cup - Starts in 3 days!', date: new Date().toISOString(), type: 'alert' },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tournaments: INITIAL_TOURNAMENTS,
      teams: [],
      matches: [],
      announcements: INITIAL_ANNOUNCEMENTS,
      rules: DEFAULT_RULES,

      createTournament: (tournamentData) => set((state) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newTournament: Tournament = {
          ...tournamentData,
          id,
          createdAt: new Date().toISOString()
        };
        return { tournaments: [...state.tournaments, newTournament] };
      }),

      updateTournament: (id, updates) => set((state) => ({
        tournaments: state.tournaments.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      deleteTournament: (id) => set((state) => ({
        tournaments: state.tournaments.filter(t => t.id !== id),
        teams: state.teams.filter(team => team.tournamentId !== id),
        matches: state.matches.filter(m => m.tournamentId !== id),
      })),

      addTeam: (teamData) => set((state) => {
        const id = Math.random().toString(36).substr(2, 9);
        const checkInCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const newTeam: Team = {
          ...teamData,
          id,
          checkInCode,
          isCheckedIn: false,
          status: 'pending',
          registeredAt: new Date().toISOString()
        };
        return { teams: [...state.teams, newTeam] };
      }),

      approveTeam: (id) => set((state) => ({
        teams: state.teams.map(t => t.id === id ? { ...t, status: 'approved' } : t)
      })),

      rejectTeam: (id) => set((state) => ({
        teams: state.teams.map(t => t.id === id ? { ...t, status: 'rejected' } : t)
      })),

      checkInTeam: (code) => {
        const state = get();
        const team = state.teams.find(t => t.checkInCode === code && t.status === 'approved');
        if (team) {
          const tournament = state.tournaments.find(t => t.id === team.tournamentId);
          if (tournament && tournament.checkInOpen) {
            set({
              teams: state.teams.map(t => t.id === team.id ? { ...t, isCheckedIn: true } : t)
            });
            return true;
          }
        }
        return false;
      },

      generateBracket: (tournamentId) => set((state) => {
        const checkedInTeams = state.teams.filter(t => 
          t.tournamentId === tournamentId && 
          t.isCheckedIn && 
          t.status === 'approved'
        );
        const tournament = state.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return state;

        const shuffled = [...checkedInTeams].sort(() => 0.5 - Math.random());
        const size = tournament.bracketSize;
        
        const matches: Match[] = [];
        for (let i = 0; i < size / 2; i++) {
            const team1 = shuffled[i * 2];
            const team2 = shuffled[i * 2 + 1];
            
            matches.push({
                id: `match-r1-${i}`,
                tournamentId,
                round: 1,
                team1Id: team1?.id,
                team2Id: team2?.id,
                status: 'scheduled'
            });
        }
        
        return { matches: [...state.matches, ...matches] };
      }),

      updateMatch: (matchId, result) => set((state) => ({
        matches: state.matches.map(m => m.id === matchId ? { ...m, ...result } : m)
      })),

      addAnnouncement: (announcement) => set((state) => ({
        announcements: [{ ...announcement, id: Math.random().toString(), date: new Date().toISOString() }, ...state.announcements]
      })),

      updateRules: (content) => set({ rules: content }),
    }),
    {
      name: 'itsme-hub-storage',
    }
  )
);
