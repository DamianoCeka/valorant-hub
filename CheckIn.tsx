import { useRoute } from "wouter";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckSquare, AlertCircle, Clock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

export function CheckIn() {
  const [match, params] = useRoute("/tournament/:id/check-in");
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}`);
      if (!res.ok) throw new Error("Tournament not found");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const checkInMutation = useMutation({
    mutationFn: async (checkInCode: string) => {
      const res = await fetch(`/api/tournaments/${params?.id}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: checkInCode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Check-in failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: "Checked In!",
        description: "Your team is now marked as ready for the bracket.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    checkInMutation.mutate(code.trim().toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-4xl font-display">Tournament Not Found</h1>
        <p className="text-muted-foreground">The tournament you're looking for doesn't exist.</p>
      </div>
    );
  }

  if (!tournament.checkInOpen && !success) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
              <Clock className="h-16 w-16 text-muted-foreground" />
              <h1 className="text-4xl font-display">Check-in Closed</h1>
              <p className="text-muted-foreground max-w-md">
                Check-in opens 60 minutes before the tournament starts. 
                Please come back later.
              </p>
          </div>
      );
  }

  if (success) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in zoom-in-50 duration-500">
            <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500">
                <CheckSquare className="h-12 w-12 text-green-500" />
            </div>
            <div>
                <h1 className="text-4xl font-display text-green-500">YOU ARE READY</h1>
                <p className="text-muted-foreground mt-2">Wait for the bracket to be generated.</p>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-md mx-auto py-12">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-display mb-2">Team Check-in</h1>
            <p className="text-muted-foreground">Enter the unique 6-character code sent to your email.</p>
        </div>

        <div className="bg-card border border-white/10 p-8 rounded-lg shadow-2xl relative overflow-hidden">
             {/* Decorative Elements */}
             <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

             <form onSubmit={handleCheckIn} className="space-y-6 relative z-10">
                 <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Team Code</label>
                     <Input 
                        value={code} 
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. A1B2C3" 
                        className="text-center text-3xl font-mono tracking-[0.5em] py-6 uppercase val-input" 
                        maxLength={6}
                        data-testid="input-checkin-code"
                     />
                 </div>

                 <button 
                    type="submit"
                    disabled={checkInMutation.isPending || code.length < 6}
                    className="val-btn w-full flex items-center justify-center"
                    data-testid="button-checkin"
                 >
                     {checkInMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "CONFIRM PRESENCE"}
                 </button>
             </form>
        </div>
    </div>
  );
}
