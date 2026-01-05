import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trophy, Clock, Users } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";

interface Tournament {
  id: string;
  name: string;
  date: string;
  maxTeams: number;
  prizePool: number;
  status: string;
}

export function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const res = await fetch("/api/tournaments");
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTournamentsForDay = (day: Date) => {
    return tournaments.filter((t) => isSameDay(new Date(t.date), day));
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-display flex items-center gap-3" data-testid="text-calendar-title">
            <CalendarIcon className="h-10 w-10 text-primary" />
            Calendario Tornei
          </h1>
          <p className="text-muted-foreground mt-1">Tutti gli eventi ITSME</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-xl font-display min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: it })}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            data-testid="button-next-month"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
            <div key={day} className="text-center text-muted-foreground font-bold py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {days.map((day) => {
            const dayTournaments = getTournamentsForDay(day);
            const isToday = isSameDay(day, new Date());
            const hasTournament = dayTournaments.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={`aspect-square p-2 rounded-lg transition-all ${
                  isToday
                    ? "bg-primary/20 border border-primary"
                    : hasTournament
                    ? "bg-white/10 border border-white/20"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </div>
                {dayTournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournament/${t.id}`}
                    className="block mt-1 text-xs bg-primary/80 text-white px-1 py-0.5 rounded truncate hover:bg-primary transition-colors"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-display">Prossimi Tornei</h2>
        
        {tournaments
          .filter((t) => new Date(t.date) >= new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5)
          .map((tournament) => (
            <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
              <motion.div
                whileHover={{ translateX: 8 }}
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 transition-all cursor-pointer"
              >
                <div className="h-16 w-16 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{tournament.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(tournament.date), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Max {tournament.maxTeams} team
                    </span>
                  </div>
                </div>
                {tournament.prizePool > 0 && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">€{tournament.prizePool}</div>
                    <div className="text-xs text-muted-foreground">Montepremi</div>
                  </div>
                )}
              </motion.div>
            </Link>
          ))}

        {tournaments.filter((t) => new Date(t.date) >= new Date()).length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nessun torneo in programma
          </div>
        )}
      </motion.div>
    </div>
  );
}
