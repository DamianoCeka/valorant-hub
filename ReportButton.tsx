import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ReportButtonProps {
  contentType: "meme" | "clip" | "comment";
  contentId: string;
}

const REPORT_REASONS = [
  { id: "spam", label: "Spam o pubblicità" },
  { id: "offensive", label: "Contenuto offensivo" },
  { id: "inappropriate", label: "Contenuto inappropriato" },
  { id: "copyright", label: "Violazione copyright" },
  { id: "other", label: "Altro" },
];

export function ReportButton({ contentType, contentId }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          reason: selectedReason,
          details: details || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to report");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Segnalazione inviata",
        description: "Grazie per la segnalazione. La esamineremo al più presto.",
      });
      setIsOpen(false);
      setSelectedReason(null);
      setDetails("");
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile inviare la segnalazione. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
        title="Segnala"
        data-testid={`button-report-${contentType}-${contentId}`}
      >
        <Flag className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="frosted-card p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-400" />
                  Segnala Contenuto
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-white/60">
                Seleziona il motivo della segnalazione:
              </p>

              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      selectedReason === reason.id
                        ? "bg-red-500/20 border-red-500/50 border"
                        : "glass-subtle hover:bg-white/10 border border-transparent"
                    }`}
                    data-testid={`report-reason-${reason.id}`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>

              {selectedReason === "other" && (
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Descrivi il problema..."
                  className="w-full p-3 rounded-xl glass-subtle border border-white/10 bg-transparent text-white placeholder:text-white/30 resize-none h-24"
                  data-testid="input-report-details"
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button
                  onClick={() => reportMutation.mutate()}
                  disabled={!selectedReason || reportMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  data-testid="button-submit-report"
                >
                  {reportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Segnala"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
