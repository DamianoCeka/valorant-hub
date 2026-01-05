import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

const ranks = [
  "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"
];

const formSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters").max(20, "Team name too long"),
  captainName: z.string().min(2, "Required"),
  captainRank: z.string({ required_error: "Select a rank" }),
  duoName: z.string().min(2, "Required"),
  duoRank: z.string({ required_error: "Select a rank" }),
  discordId: z.string().min(3, "Required for communication"),
  email: z.string().email("Invalid email"),
  acceptRules: z.boolean().refine(val => val === true, "You must accept the rules"),
});

export function Register() {
  const [match, params] = useRoute("/tournament/:id/register");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${params?.id}`);
      if (!res.ok) throw new Error("Tournament not found");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await fetch(`/api/tournaments/${params?.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful!",
        description: "Check your email for your check-in code.",
      });
      setTimeout(() => {
        setLocation(`/tournament/${params?.id}/participants`);
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      captainName: "",
      duoName: "",
      discordId: "",
      email: "",
      acceptRules: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    registerMutation.mutate(values);
  }

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

  if (!tournament.registrationOpen) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
              <h1 className="text-3xl font-display">Registration Closed</h1>
              <p className="text-muted-foreground">The tournament registration period has ended or is full.</p>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-display mb-2">Team Registration</h1>
        <p className="text-muted-foreground">Sign up for the {tournament.name}. Make sure your Discord ID is correct for check-in purposes.</p>
      </div>

      <div className="bg-card border border-white/10 rounded-lg p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tenz Fanclub" {...field} className="val-input" data-testid="input-team-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Captain */}
                <div className="space-y-4 border border-white/5 p-4 rounded bg-white/5">
                    <h3 className="font-display text-lg text-primary">Captain</h3>
                    <FormField
                      control={form.control}
                      name="captainName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IGN (Riot ID)</FormLabel>
                          <FormControl>
                            <Input placeholder="Player#NA1" {...field} className="val-input" data-testid="input-captain-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="captainRank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rank</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="val-input" data-testid="select-captain-rank">
                                <SelectValue placeholder="Select Rank" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ranks.map(rank => (
                                <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                {/* Duo */}
                <div className="space-y-4 border border-white/5 p-4 rounded bg-white/5">
                    <h3 className="font-display text-lg text-primary">Duo</h3>
                     <FormField
                      control={form.control}
                      name="duoName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IGN (Riot ID)</FormLabel>
                          <FormControl>
                            <Input placeholder="Player2#NA1" {...field} className="val-input" data-testid="input-duo-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duoRank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rank</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="val-input" data-testid="select-duo-rank">
                                <SelectValue placeholder="Select Rank" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ranks.map(rank => (
                                <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="discordId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discord Username</FormLabel>
                      <FormControl>
                        <Input placeholder="user#0000" {...field} className="val-input" data-testid="input-discord" />
                      </FormControl>
                      <FormDescription>Used for match coordination.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="team@example.com" {...field} className="val-input" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="acceptRules"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/10 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-rules"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to the tournament rules and regulations.
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <button type="submit" disabled={registerMutation.isPending} className="val-btn w-full text-lg" data-testid="button-submit-team">
              {registerMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "COMPLETE REGISTRATION"}
            </button>
          </form>
        </Form>
      </div>
    </div>
  );
}
