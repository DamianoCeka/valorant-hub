import { useRoute } from "wouter";
import { Trophy, Users, Calendar, Flame, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function TournamentDetail() {
  const [match, params] = useRoute("/tournament/:id");

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}`);
      if (!res.ok) throw new Error("Tournament not found");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground text-lg">Tournament not found</p>
      </motion.div>
    );
  }

  const isActive = new Date(tournament.date) > new Date();
  const approvedTeams = teams.filter((t: any) => t.status === 'approved');

  return (
    <div className="space-y-12">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-primary/20 to-primary/10 p-8 md:p-16"
      >
        <motion.div 
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl opacity-40"
        />

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-lg border border-primary/30 mb-4"
          >
            <Flame className="h-5 w-5 animate-bounce" />
            <span className="font-bold uppercase tracking-widest text-sm">{isActive ? "Active Now" : "Ended"}</span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-display mb-4 text-white">{tournament.name}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Tournament Date</p>
                <p className="font-bold text-white">{new Date(tournament.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Bracket Size</p>
                <p className="font-bold text-white">{tournament.bracketSize || 16}-Team Format</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Prize Pool</p>
                <p className="font-bold text-white">€{tournament.prizePool || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      {isActive && tournament.registrationOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl p-8 text-center"
        >
          <h2 className="text-3xl font-display mb-4">Ready to Compete?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Register your DuoQ team now and secure your spot in the bracket.
          </p>
          <Link href={`/tournament/${tournament.id}/register`}>
            <motion.button
              whileHover={{ scale: 1.05, translateY: -4 }}
              whileTap={{ scale: 0.95 }}
              className="val-btn text-lg shadow-lg hover:shadow-2xl hover:shadow-primary/50"
            >
              Register Now <ChevronRight className="h-5 w-5 ml-2 inline-block" />
            </motion.button>
          </Link>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { label: "Max Teams", value: tournament.maxTeams },
          { label: "Registered", value: teams.length },
          { label: "Approved", value: approvedTeams.length },
          { label: "Available Spots", value: tournament.maxTeams - approvedTeams.length },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 rounded-lg border border-white/10 bg-gradient-to-br from-white/10 to-white/5 text-center hover:border-primary/50 transition-all"
          >
            <p className="text-muted-foreground text-sm mb-2">{stat.label}</p>
            <p className="text-4xl font-display text-primary">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tournament Details */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        <div className="p-8 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
          <h3 className="text-2xl font-display mb-4 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Tournament Format
          </h3>
          <div className="space-y-2 text-muted-foreground font-tech">
            <p>• <strong>Bracket:</strong> {tournament.bracketSize || 16}-Team Single Elimination</p>
            <p>• <strong>Match Format:</strong> Best of 1 (BO3 Finals)</p>
            <p>• <strong>Max Teams:</strong> {tournament.maxTeams}</p>
            <p>• <strong>Stream Delay:</strong> {tournament.streamDelay}s</p>
          </div>
        </div>

        <div className="p-8 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
          <h3 className="text-2xl font-display mb-4">Quick Links</h3>
          <div className="space-y-3">
            <Link href={`/tournament/${tournament.id}/participants`}>
              <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-primary hover:text-primary/80 font-bold uppercase tracking-wider flex items-center justify-between">
                View Participants <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href={`/tournament/${tournament.id}/bracket`}>
              <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-primary hover:text-primary/80 font-bold uppercase tracking-wider flex items-center justify-between">
                View Bracket <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href={`/tournament/${tournament.id}/check-in`}>
              <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-primary hover:text-primary/80 font-bold uppercase tracking-wider flex items-center justify-between">
                Check In <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
