import { Link } from "wouter";
import { Search, Trophy, Flame, Calendar, Users, Loader2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export function Tournaments() {
  const [search, setSearch] = useState("");

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/tournaments");
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });

  const filteredTournaments = tournaments.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeTournaments = filteredTournaments.filter((t: any) => new Date(t.date) > new Date());
  const pastTournaments = filteredTournaments.filter((t: any) => new Date(t.date) <= new Date());

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl md:text-5xl font-display mb-2 flex items-center gap-3">
          <Flame className="h-8 w-8 md:h-10 md:w-10 text-primary" />
          Tutti i Tornei
        </h1>
        <p className="text-white/50">Esplora e registrati ai tornei VALORANT.</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
        <input 
          placeholder="Cerca tornei..." 
          className="w-full input-glass pl-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </motion.div>

      {/* Active Tournaments */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2 variants={itemVariants} className="text-2xl md:text-3xl font-display mb-6 text-primary flex items-center gap-3">
          <span className="p-2.5 bg-primary/20 rounded-xl border border-primary/30">🔥</span> 
          Tornei Attivi
        </motion.h2>
        {activeTournaments.length === 0 ? (
          <motion.div variants={itemVariants} className="text-center py-16 frosted-card">
            <Trophy className="h-14 w-14 mx-auto mb-4 text-white/20" />
            <p className="text-white/50 text-lg">Nessun torneo attivo trovato</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {activeTournaments.map((tournament: any) => (
              <TournamentCard key={tournament.id} tournament={tournament} isActive={true} />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Past Tournaments */}
      {pastTournaments.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="text-2xl md:text-3xl font-display mb-6 text-white/50 flex items-center gap-3">
            <Trophy className="h-6 w-6" />
            Tornei Passati
          </motion.h2>
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {pastTournaments.map((tournament: any) => (
              <TournamentCard key={tournament.id} tournament={tournament} isActive={false} />
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function TournamentCard({ tournament, isActive }: { tournament: any; isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className={isActive ? "" : "opacity-60 hover:opacity-100 transition-opacity"}
    >
      <Link href={`/tournament/${tournament.id}`}>
        <div className={`group frosted-card-hover p-6 cursor-pointer h-full ${isActive ? "" : "glass-subtle"}`}>
          {isActive && (
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-4 right-4 p-2 bg-primary/20 rounded-xl border border-primary/30"
            >
              <Flame className="h-4 w-4 text-primary" />
            </motion.div>
          )}

          <div className="relative z-10 space-y-4">
            <h3 className="text-xl md:text-2xl font-display text-white group-hover:text-primary transition-colors pr-12">{tournament.name}</h3>
            
            <div className="space-y-2.5 text-sm text-white/50">
              <div className="flex items-center gap-2.5 font-tech">
                <Calendar className="h-4 w-4 text-primary/70" />
                {new Date(tournament.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2.5 font-tech">
                <Users className="h-4 w-4 text-primary/70" />
                {tournament.maxTeams} team • {tournament.bracketSize || 16} bracket
              </div>
              <div className="flex items-center gap-2.5 font-tech">
                <Trophy className="h-4 w-4 text-primary/70" />
                <span className="text-primary font-bold">€{tournament.prizePool || 0}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
              {isActive && tournament.registrationOpen ? (
                <span className="text-primary font-bold text-xs uppercase flex items-center gap-1">
                  Registrati
                </span>
              ) : isActive ? (
                <span className="text-white/40 text-xs uppercase">Registrazioni chiuse</span>
              ) : (
                <span className="text-white/30 text-xs uppercase">Terminato</span>
              )}
              <ChevronRight className="h-4 w-4 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
