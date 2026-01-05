import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { storage } from "./storage";
import { insertTournamentSchema, insertTeamSchema, insertMatchSchema, insertAnnouncementSchema, insertMemeSchema, insertClipSchema, insertQuoteSchema, insertReportSchema, MISSION_TYPES, BADGES } from "@shared/schema";
import type { MissionType, Team, Match } from "@shared/schema";
import { sendEmail, generateCheckInEmailHTML } from "./email";
import { getDiscordAvatarUrl, announceTournamentCreated, announceTeamRegistered, announceTournamentStarting } from "./discord";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getAuthorizationUrl, exchangeCodeForTokens, getUserProfile, getDiscordAvatarUrl as getOAuthAvatarUrl, isConfigured as isOAuthConfigured, buildRedirectUri } from "./discordOAuth";

// Extend Express session
declare module "express-session" {
  interface SessionData {
    userId?: string;
    discordId?: string;
    accessToken?: string;
    refreshToken?: string;
    oauthState?: string;
    oauthRedirectUri?: string;
  }
}

// Helper to get authenticated user from session
async function getSessionUser(req: Request) {
  if (!req.session?.userId) {
    return null;
  }
  return storage.getUser(req.session.userId);
}

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const moderateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const lightLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ OBJECT STORAGE ============
  registerObjectStorageRoutes(app);

  // ============ COMMENT MEDIA UPLOADS ============
  const ALLOWED_COMMENT_MEDIA_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  const MAX_COMMENT_MEDIA_SIZE = 5 * 1024 * 1024; // 5MB

  app.post("/api/uploads/comments", moderateLimiter, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { name, size, contentType } = req.body;

      if (!name || !size || !contentType) {
        return res.status(400).json({ error: "Missing required fields: name, size, contentType" });
      }

      if (!ALLOWED_COMMENT_MEDIA_TYPES.includes(contentType)) {
        return res.status(400).json({ 
          error: "Invalid file type. Only PNG, JPEG, GIF, and WebP images are allowed." 
        });
      }

      if (size > MAX_COMMENT_MEDIA_SIZE) {
        return res.status(400).json({ 
          error: "File too large. Maximum size is 5MB." 
        });
      }

      const { ObjectStorageService } = await import("./replit_integrations/object_storage");
      const objectStorageService = new ObjectStorageService();
      
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      const mediaType = contentType === "image/gif" ? "gif" : "image";

      res.json({
        uploadURL,
        objectPath,
        mediaType,
        metadata: { name, size, contentType },
      });
    } catch (error: any) {
      console.error("[Upload] Comment media upload error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // ============ AUTH (OAuth2 Flow) ============

  // Admin credentials login (bypass OAuth)
  const ADMIN_DISCORD_ID = process.env.ADMIN_DISCORD_ID || "363958710998925312"; // itsme_officialttv

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Read credentials at request time (not at startup)
      const adminUsername = process.env.ADMIN_USERNAME || "";
      const adminPassword = process.env.ADMIN_PASSWORD || "";
      
      console.log("=== ADMIN LOGIN ATTEMPT ===");
      console.log("Input username:", username);
      console.log("Input password length:", password?.length);
      console.log("Expected username:", adminUsername);
      console.log("Expected password length:", adminPassword?.length);
      console.log("Username match:", username === adminUsername);
      console.log("Password match:", password === adminPassword);
      console.log("ADMIN_USERNAME env set:", !!process.env.ADMIN_USERNAME);
      
      if (!adminUsername || !adminPassword) {
        console.log("ERROR: Admin credentials not configured in environment");
        return res.status(500).json({ error: "Admin credentials not configured" });
      }
      
      if (username === adminUsername && password === adminPassword) {
        console.log("Credentials matched! Looking for admin user...");
        // Find admin user by Discord ID
        const user = await storage.getUserByDiscordId(ADMIN_DISCORD_ID);
        console.log("Admin user found:", user ? `ID: ${user.id}, username: ${user.username}` : "NOT FOUND");
        
        if (!user) {
          return res.status(404).json({ error: "Admin user not found in database. Login with Discord first." });
        }

        // Regenerate session
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err) => err ? reject(err) : resolve());
        });

        // Store session data
        req.session.userId = user.id;
        req.session.discordId = user.discordId ?? undefined;

        // Save session
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => err ? reject(err) : resolve());
        });

        console.log("[Auth] Admin login successful for:", user.username, "role:", user.role);
        
        res.json({
          id: user.id,
          discordId: user.discordId,
          username: user.discordUsername || user.username,
          avatar: user.discordAvatar,
          role: user.role,
          points: user.points,
          badges: user.badges,
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Check if OAuth is configured
  app.get("/api/auth/status", (req, res) => {
    res.json({ configured: isOAuthConfigured() });
  });

  // Debug endpoint for production diagnostics (temporary)
  app.get("/api/debug/env", async (req, res) => {
    const host = req.get("x-forwarded-host") || req.get("host") || req.hostname;
    res.json({
      nodeEnv: process.env.NODE_ENV,
      hasDbUrl: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
      hasDiscordClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
      host: host,
      xForwardedHost: req.get("x-forwarded-host") || null,
      hostHeader: req.get("host") || null,
      sessionId: req.sessionID,
      sessionUserId: req.session?.userId || null,
      sessionDiscordId: req.session?.discordId || null,
      cookies: Object.keys(req.cookies || {}),
      redirectUri: buildRedirectUri(req),
      timestamp: new Date().toISOString(),
    });
  });

  // Start Discord OAuth flow
  app.get("/api/auth/discord", (req, res) => {
    if (!isOAuthConfigured()) {
      return res.status(500).json({ error: "Discord OAuth not configured" });
    }

    // Build redirect URI dynamically from request (uses X-Forwarded-Host for custom domains)
    const redirectUri = buildRedirectUri(req);
    console.log("[OAuth] Starting auth flow with redirect URI:", redirectUri);

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;
    req.session.oauthRedirectUri = redirectUri;
    
    // Also set state and redirect URI in cookies as backup (more reliable across domains)
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: true, // Always secure on Replit (HTTPS)
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: "none", // Required for cross-site cookies
    });
    res.cookie("oauth_redirect_uri", redirectUri, {
      httpOnly: true,
      secure: true, // Always secure on Replit (HTTPS)
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: "none", // Required for cross-site cookies
    });

    const authUrl = getAuthorizationUrl(state, redirectUri);
    res.redirect(authUrl);
  });

  // OAuth callback - receives code from Discord
  app.get("/api/auth/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      // Get expected state and redirect URI from session or cookie
      const expectedState = req.session.oauthState || req.cookies?.oauth_state;
      const redirectUri = req.session.oauthRedirectUri || req.cookies?.oauth_redirect_uri || buildRedirectUri(req);

      // Verify state for CSRF protection
      if (!state || state !== expectedState) {
        console.error("[OAuth] State mismatch:", { received: state, expected: expectedState });
        res.clearCookie("oauth_state");
        res.clearCookie("oauth_redirect_uri");
        return res.redirect("/?error=invalid_state");
      }
      
      // Clear the cookies
      res.clearCookie("oauth_state");
      res.clearCookie("oauth_redirect_uri");

      if (!code || typeof code !== "string") {
        return res.redirect("/?error=no_code");
      }

      console.log("[OAuth] Exchanging code with redirect URI:", redirectUri);
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code, redirectUri);

      // Get user profile from Discord
      const discordProfile = await getUserProfile(tokens.access_token);

      // Find or create user in database
      let user = await storage.getUserByDiscordId(discordProfile.id);

      if (!user) {
        user = await storage.createUser({
          discordId: discordProfile.id,
          discordUsername: discordProfile.global_name || discordProfile.username,
          discordAvatar: discordProfile.avatar ? getOAuthAvatarUrl(discordProfile.id, discordProfile.avatar) : null,
          username: discordProfile.global_name || discordProfile.username,
          email: discordProfile.email || null,
          role: "user",
        });
      } else {
        // Update user info if changed
        user = await storage.updateUser(user.id, {
          discordUsername: discordProfile.global_name || discordProfile.username,
          discordAvatar: discordProfile.avatar ? getOAuthAvatarUrl(discordProfile.id, discordProfile.avatar) : null,
        });
      }

      // Regenerate session to prevent session fixation and ensure clean state
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error("[OAuth] Session regenerate error:", err);
            reject(err);
          } else {
            console.log("[OAuth] Session regenerated successfully");
            resolve();
          }
        });
      });

      // Store session data in the NEW regenerated session
      req.session.userId = user!.id;
      req.session.discordId = discordProfile.id;
      req.session.accessToken = tokens.access_token;
      req.session.refreshToken = tokens.refresh_token;

      // Explicitly save session before redirect
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("[OAuth] Session save error:", err);
            reject(err);
          } else {
            console.log("[OAuth] Session saved successfully for user:", user!.id, "role:", user!.role);
            resolve();
          }
        });
      });

      // Redirect to home
      res.redirect("/");
    } catch (error: any) {
      console.error("[OAuth] Callback error:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  // Get current user from session
  app.get("/api/auth/me", async (req, res) => {
    try {
      console.log("[Auth] /me request - session ID:", req.sessionID, "userId:", req.session?.userId, "discordId:", req.session?.discordId);
      
      let user = await getSessionUser(req);

      // Fallback: if session has discordId but no userId, try to find user by discordId
      if (!user && req.session?.discordId) {
        console.log("[Auth] /me - Trying fallback with discordId:", req.session.discordId);
        user = await storage.getUserByDiscordId(req.session.discordId);
        if (user) {
          // Fix the session
          req.session.userId = user.id;
          console.log("[Auth] /me - Fixed session with userId:", user.id);
        }
      }

      if (!user) {
        console.log("[Auth] /me - No user found in session");
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log("[Auth] /me - User found:", user.id, "role:", user.role);

      res.json({
        id: user.id,
        discordId: user.discordId,
        username: user.discordUsername || user.username,
        avatar: user.discordAvatar,
        email: user.email,
        role: user.role,
        points: user.points,
        badges: user.badges,
      });
    } catch (error: any) {
      res.status(401).json({ error: "Not authenticated", message: error.message });
    }
  });

  // Logout - destroy session (POST for proper logout)
  app.post("/api/auth/logout", (req, res) => {
    const sessionId = req.sessionID;
    console.log("[Auth] Logout request - session ID:", sessionId);
    
    req.session.destroy((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      
      // Clear all auth-related cookies
      res.clearCookie("itsme.sid", { path: "/" });
      res.clearCookie("oauth_state");
      res.clearCookie("oauth_redirect_uri");
      
      console.log("[Auth] Logout successful for session:", sessionId);
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
  
  // Legacy GET logout (redirect to home after destroying session)
  app.get("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
      }
      res.clearCookie("itsme.sid", { path: "/" });
      res.redirect("/");
    });
  });
  
  // Force logout - destroy all sessions for debugging
  app.post("/api/auth/force-logout", async (req, res) => {
    const sessionId = req.sessionID;
    console.log("[Auth] Force logout request - session ID:", sessionId);
    
    try {
      // Destroy current session
      req.session.destroy((err) => {
        if (err) {
          console.error("[Auth] Force logout session destroy error:", err);
        }
      });
      
      // Clear all cookies
      res.clearCookie("itsme.sid", { path: "/" });
      res.clearCookie("oauth_state");
      res.clearCookie("oauth_redirect_uri");
      
      console.log("[Auth] Force logout successful");
      res.json({ 
        success: true, 
        message: "Force logged out successfully. All cookies cleared.",
        tip: "If still having issues, rotate SESSION_SECRET to invalidate all sessions."
      });
    } catch (error: any) {
      console.error("[Auth] Force logout error:", error);
      res.status(500).json({ error: "Failed to force logout", message: error.message });
    }
  });
  
  // ============ TOURNAMENTS ============
  
  app.get("/api/tournaments", async (req, res) => {
    const tournaments = await storage.getTournaments();
    res.json(tournaments);
  });

  app.get("/api/tournaments/active", async (req, res) => {
    try {
      const tournaments = await storage.getTournaments();
      const now = new Date();
      
      const activeTournament = tournaments.find(t => 
        t.status === "active" || t.status === "live" ||
        (t.status === "upcoming" && new Date(t.date) > now)
      ) || tournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (!activeTournament) {
        return res.json(null);
      }

      const teams = await storage.getTeams(activeTournament.id);
      
      let userTeam: Team | null = null;
      let userMatch: Match | null = null;
      
      const user = await getSessionUser(req);
      if (user) {
        userTeam = teams.find(t => t.discordId === user.discordId) || null;
        if (userTeam) {
          const matches = await storage.getMatches(activeTournament.id);
          userMatch = matches.find(m => 
            (m.team1Id === userTeam?.id || m.team2Id === userTeam?.id) &&
            (m.status === "ready" || m.status === "live" || m.status === "pending")
          ) || null;
        }
      }

      res.json({
        ...activeTournament,
        teams,
        userTeam,
        userMatch,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active tournament" });
    }
  });

  app.get("/api/stats/home", async (req, res) => {
    try {
      const tournaments = await storage.getTournaments();
      const users = await storage.getLeaderboard(1000);
      
      let totalMatches = 0;
      for (const t of tournaments) {
        const matches = await storage.getMatches(t.id);
        totalMatches += matches.length;
      }

      res.json({
        totalUsers: users.length,
        totalTournaments: tournaments.length,
        totalMatches,
      });
    } catch (error) {
      res.json({ totalUsers: 0, totalTournaments: 0, totalMatches: 0 });
    }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    const tournament = await storage.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    res.json(tournament);
  });

  app.post("/api/tournaments", async (req, res) => {
    const result = insertTournamentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }
    const tournament = await storage.createTournament(result.data);
    
    // Send Discord webhook announcement
    announceTournamentCreated({
      id: tournament.id,
      name: tournament.name,
      description: tournament.rulesMd || undefined,
      date: tournament.date,
      prizePool: tournament.prizesMd || undefined,
      maxTeams: tournament.maxTeams,
    }).catch(err => console.error("[Webhook] Tournament announcement failed:", err));
    
    res.status(201).json(tournament);
  });

  app.patch("/api/tournaments/:id", async (req, res) => {
    const tournament = await storage.updateTournament(req.params.id, req.body);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    res.json(tournament);
  });

  // ============ TEAMS & REGISTRATION ============

  app.get("/api/tournaments/:id/teams", async (req, res) => {
    const teams = await storage.getTeams(req.params.id);
    res.json(teams);
  });

  app.post("/api/tournaments/:id/register", strictLimiter, async (req, res) => {
    // Validate tournament exists
    const tournament = await storage.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (!tournament.registrationOpen) {
      return res.status(400).json({ error: "Registration is closed" });
    }

    // Validate team data
    const result = insertTeamSchema.safeParse({
      ...req.body,
      tournamentId: req.params.id,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    // Check for duplicate team name
    const existingTeams = await storage.getTeams(req.params.id);
    if (existingTeams.some(t => t.name.toLowerCase() === result.data.name.toLowerCase())) {
      return res.status(400).json({ error: "Team name already taken" });
    }

    // Create team
    const team = await storage.createTeam(result.data);

    // Send email with check-in code
    await sendEmail({
      to: team.email,
      subject: `Your ITSME Tournament Check-in Code - ${tournament.name}`,
      html: generateCheckInEmailHTML(team.name, team.checkInCode, tournament.name),
    });
    
    // Get updated team count for webhook
    const allTeams = await storage.getTeams(req.params.id);
    
    // Send Discord webhook announcement
    announceTeamRegistered({
      name: tournament.name,
      teamName: team.name,
      currentTeams: allTeams.length,
      maxTeams: tournament.maxTeams,
    }).catch(err => console.error("[Webhook] Team registration failed:", err));

    res.status(201).json({
      id: team.id,
      name: team.name,
      message: "Team registered successfully! Check your email for the check-in code.",
    });
  });

  // ============ CHECK-IN ============

  app.post("/api/tournaments/:id/check-in", moderateLimiter, async (req, res) => {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Check-in code is required" });
    }

    const team = await storage.getTeamByCheckInCode(code.toUpperCase());

    if (!team) {
      return res.status(404).json({ error: "Invalid check-in code" });
    }

    if (team.tournamentId !== req.params.id) {
      return res.status(400).json({ error: "This code is not for this tournament" });
    }

    if (team.status !== "approved") {
      return res.status(400).json({ error: "Your team has not been approved yet" });
    }

    // Mark team as checked in
    const updatedTeam = await storage.updateTeam(team.id, { isCheckedIn: true });
    
    // Auto-mission: checkin - update progress for captain
    if (team.captainUserId) {
      storage.incrementMissionProgress(team.captainUserId, "checkin").catch(() => {});
    }

    res.json({
      id: updatedTeam!.id,
      name: updatedTeam!.name,
      message: "Check-in successful! Your team is ready.",
    });
  });

  // ============ MATCHES & BRACKET ============

  app.get("/api/tournaments/:id/matches", async (req, res) => {
    const matches = await storage.getMatches(req.params.id);
    res.json(matches);
  });

  app.post("/api/tournaments/:id/generate-bracket", async (req, res) => {
    const tournament = await storage.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Get checked-in and approved teams
    const allTeams = await storage.getTeams(req.params.id);
    const checkedInTeams = allTeams.filter(t => t.isCheckedIn && t.status === "approved");

    if (checkedInTeams.length < 2) {
      return res.status(400).json({ error: "Not enough teams checked in" });
    }

    // Shuffle teams
    const shuffled = [...checkedInTeams].sort(() => 0.5 - Math.random());

    // Create first round matches
    const matches = [];
    const bracketSize = tournament.bracketSize || 16;

    for (let i = 0; i < bracketSize / 2; i++) {
      const team1 = shuffled[i * 2];
      const team2 = shuffled[i * 2 + 1];

      const match = await storage.createMatch({
        tournamentId: req.params.id,
        round: 1,
        team1Id: team1?.id,
        team2Id: team2?.id,
        status: "scheduled",
      });

      matches.push(match);
    }
    
    // Send Discord webhook announcement
    announceTournamentStarting({
      name: tournament.name,
      teamsCount: checkedInTeams.length,
    }).catch(err => console.error("[Webhook] Tournament start failed:", err));

    res.status(201).json({
      message: "Bracket generated successfully",
      matchesCreated: matches.length,
    });
  });

  app.get("/api/matches/:id", async (req, res) => {
    const match = await storage.getMatch(req.params.id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }
    
    let team1 = null, team2 = null;
    let team1Members: any[] = [];
    let team2Members: any[] = [];
    
    if (match.team1Id) {
      team1 = await storage.getTeam(match.team1Id);
      team1Members = await storage.getTeamMembers(match.team1Id);
    }
    if (match.team2Id) {
      team2 = await storage.getTeam(match.team2Id);
      team2Members = await storage.getTeamMembers(match.team2Id);
    }

    let canModify = false;
    let userTeamId = null;
    let isParticipant = false;
    
    const user = await getSessionUser(req);
    if (user) {
      const isTeam1Member = team1Members.some(m => m.userId === user.id) || team1?.discordId === user.discordId || team1?.captainUserId === user.id;
      const isTeam2Member = team2Members.some(m => m.userId === user.id) || team2?.discordId === user.discordId || team2?.captainUserId === user.id;
      const isAdmin = user.role === "admin" || user.role === "mod";
      isParticipant = isTeam1Member || isTeam2Member;
      canModify = isParticipant || isAdmin;
      if (isTeam1Member) userTeamId = match.team1Id;
      if (isTeam2Member) userTeamId = match.team2Id;
    }
    
    res.json({ ...match, team1, team2, team1Members, team2Members, canModify, userTeamId, isParticipant });
  });

  app.patch("/api/matches/:id", async (req, res) => {
    const match = await storage.updateMatch(req.params.id, req.body);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }
    res.json(match);
  });

  app.post("/api/matches/:id/report", moderateLimiter, async (req, res) => {
    const { score1, score2 } = req.body;
    if (typeof score1 !== "number" || typeof score2 !== "number") {
      return res.status(400).json({ error: "Invalid scores" });
    }
    
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const match = await storage.getMatch(req.params.id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const team1 = match.team1Id ? await storage.getTeam(match.team1Id) : null;
    const team2 = match.team2Id ? await storage.getTeam(match.team2Id) : null;
    const team1Members = match.team1Id ? await storage.getTeamMembers(match.team1Id) : [];
    const team2Members = match.team2Id ? await storage.getTeamMembers(match.team2Id) : [];
    
    const isTeam1Member = team1Members.some(m => m.userId === user.id) || team1?.discordId === user.discordId || team1?.captainUserId === user.id;
    const isTeam2Member = team2Members.some(m => m.userId === user.id) || team2?.discordId === user.discordId || team2?.captainUserId === user.id;
    const isAdmin = user.role === "admin" || user.role === "mod";

    if (!isTeam1Member && !isTeam2Member && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to report this match" });
    }
    
    const updated = await storage.updateMatch(req.params.id, {
      score1,
      score2,
      status: "reported",
      reportedBy: user.id,
      reportedAt: new Date(),
    });
    
    await storage.createAuditLog({
      actorUserId: user.id,
      action: "match_report",
      entityType: "match",
      entityId: match.id,
      payload: JSON.stringify({ score1, score2 }),
    });
    
    res.json(updated);
  });

  app.post("/api/matches/:id/confirm", moderateLimiter, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const match = await storage.getMatch(req.params.id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }
    
    if (match.status !== "reported") {
      return res.status(400).json({ error: "Match not in reported status" });
    }

    const team1 = match.team1Id ? await storage.getTeam(match.team1Id) : null;
    const team2 = match.team2Id ? await storage.getTeam(match.team2Id) : null;
    const team1Members = match.team1Id ? await storage.getTeamMembers(match.team1Id) : [];
    const team2Members = match.team2Id ? await storage.getTeamMembers(match.team2Id) : [];
    
    const isTeam1Member = team1Members.some(m => m.userId === user.id) || team1?.discordId === user.discordId || team1?.captainUserId === user.id;
    const isTeam2Member = team2Members.some(m => m.userId === user.id) || team2?.discordId === user.discordId || team2?.captainUserId === user.id;
    const isAdmin = user.role === "admin" || user.role === "mod";
    
    const reporterIsTeam1 = match.reportedBy && (team1Members.some(m => m.userId === match.reportedBy) || team1?.captainUserId === match.reportedBy);
    const reporterIsTeam2 = match.reportedBy && (team2Members.some(m => m.userId === match.reportedBy) || team2?.captainUserId === match.reportedBy);
    
    const isOpponentConfirming = (reporterIsTeam1 && isTeam2Member) || (reporterIsTeam2 && isTeam1Member);
    
    if (!isAdmin && !isOpponentConfirming) {
      return res.status(403).json({ error: "Only the opposing team can confirm the score" });
    }
    
    const winnerId = (match.score1 ?? 0) > (match.score2 ?? 0) ? match.team1Id : match.team2Id;
    
    const updated = await storage.updateMatch(req.params.id, {
      status: "resolved",
      winnerId,
      resolvedBy: user.id,
      resolvedAt: new Date(),
    });
    
    await storage.createAuditLog({
      actorUserId: user.id,
      action: "match_confirm",
      entityType: "match",
      entityId: match.id,
      payload: JSON.stringify({ winnerId }),
    });
    
    // Auto-mission: match_win - reward winning team members
    if (winnerId) {
      const winnerTeam = await storage.getTeam(winnerId);
      const winnerMembers = await storage.getTeamMembers(winnerId);
      for (const member of winnerMembers) {
        storage.incrementMissionProgress(member.userId, "match_win").catch(() => {});
      }
      if (winnerTeam?.captainUserId) {
        storage.incrementMissionProgress(winnerTeam.captainUserId, "match_win").catch(() => {});
      }
    }
    
    res.json(updated);
  });

  app.post("/api/matches/:id/dispute", strictLimiter, async (req, res) => {
    const { reason, evidence } = req.body;
    if (!reason) {
      return res.status(400).json({ error: "Reason required" });
    }
    
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const match = await storage.getMatch(req.params.id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const team1 = match.team1Id ? await storage.getTeam(match.team1Id) : null;
    const team2 = match.team2Id ? await storage.getTeam(match.team2Id) : null;
    const team1Members = match.team1Id ? await storage.getTeamMembers(match.team1Id) : [];
    const team2Members = match.team2Id ? await storage.getTeamMembers(match.team2Id) : [];
    
    const isTeam1Member = team1Members.some(m => m.userId === user.id) || team1?.discordId === user.discordId || team1?.captainUserId === user.id;
    const isTeam2Member = team2Members.some(m => m.userId === user.id) || team2?.discordId === user.discordId || team2?.captainUserId === user.id;
    const isAdmin = user.role === "admin" || user.role === "mod";

    if (!isTeam1Member && !isTeam2Member && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to dispute this match" });
    }
    
    const updated = await storage.updateMatch(req.params.id, {
      status: "disputed",
    });
    
    await storage.createAuditLog({
      actorUserId: user.id,
      action: "match_dispute",
      entityType: "match",
      entityId: match.id,
      payload: JSON.stringify({ reason, evidence }),
    });
    
    res.json({ message: "Dispute opened", match: updated });
  });

  // ============ ANNOUNCEMENTS ============

  app.get("/api/announcements", async (req, res) => {
    const tournamentId = req.query.tournamentId as string | undefined;
    const announcements = await storage.getAnnouncements(tournamentId);
    res.json(announcements);
  });

  app.post("/api/announcements", async (req, res) => {
    const result = insertAnnouncementSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }
    const announcement = await storage.createAnnouncement(result.data);
    res.status(201).json(announcement);
  });

  // ============ ADMIN ============

  app.patch("/api/teams/:id/approve", async (req, res) => {
    const team = await storage.updateTeam(req.params.id, { status: "approved" });
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  });

  app.patch("/api/teams/:id/reject", async (req, res) => {
    const team = await storage.updateTeam(req.params.id, { status: "rejected" });
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  });

  // ============ MEMES ============

  app.get("/api/memes", async (req, res) => {
    const memes = await storage.getMemes();
    res.json(memes);
  });

  app.get("/api/memes/:id", async (req, res) => {
    const meme = await storage.getMeme(req.params.id);
    if (!meme) {
      return res.status(404).json({ error: "Meme not found" });
    }
    res.json(meme);
  });

  app.post("/api/memes", async (req, res) => {
    const result = insertMemeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }
    const meme = await storage.createMeme(result.data);
    await storage.updateMissionProgress(result.data.userId, "upload_meme");
    
    // Award badges for meme milestones
    const userMemes = await storage.getMemesByUser(result.data.userId);
    if (userMemes.length === 1) {
      storage.addBadge(result.data.userId, "first_meme").catch(() => {});
    }
    if (userMemes.length === 10) {
      storage.addBadge(result.data.userId, "meme_master").catch(() => {});
    }
    
    res.status(201).json(meme);
  });

  app.post("/api/memes/:id/vote", lightLimiter, async (req, res) => {
    const { voteType, userId } = req.body;
    if (!voteType || !userId) {
      return res.status(400).json({ error: "voteType and userId are required" });
    }

    const meme = await storage.getMeme(req.params.id);
    if (!meme) {
      return res.status(404).json({ error: "Meme not found" });
    }

    const existingVote = await storage.getVote(userId, "meme", req.params.id);
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await storage.deleteVote(existingVote.id);
        if (voteType === "up") {
          await storage.updateMeme(req.params.id, { upvotes: Math.max(0, meme.upvotes - 1) });
        } else {
          await storage.updateMeme(req.params.id, { downvotes: Math.max(0, meme.downvotes - 1) });
        }
      } else {
        await storage.deleteVote(existingVote.id);
        await storage.createVote({ userId, contentType: "meme", contentId: req.params.id, voteType });
        // Check for voter badge
        const voteCount = await storage.getVoteCountByUser(userId);
        if (voteCount === 50) {
          storage.addBadge(userId, "voter").catch(() => {});
        }
        if (existingVote.voteType === "up") {
          await storage.updateMeme(req.params.id, { 
            upvotes: Math.max(0, meme.upvotes - 1), 
            downvotes: meme.downvotes + 1 
          });
        } else {
          await storage.updateMeme(req.params.id, { 
            upvotes: meme.upvotes + 1, 
            downvotes: Math.max(0, meme.downvotes - 1) 
          });
        }
      }
    } else {
      await storage.createVote({ userId, contentType: "meme", contentId: req.params.id, voteType });
      if (voteType === "up") {
        await storage.updateMeme(req.params.id, { upvotes: meme.upvotes + 1 });
      } else {
        await storage.updateMeme(req.params.id, { downvotes: meme.downvotes + 1 });
      }
      storage.incrementMissionProgress(userId, "community_vote").catch(() => {});
      // Check for voter badge
      const voteCount = await storage.getVoteCountByUser(userId);
      if (voteCount === 50) {
        storage.addBadge(userId, "voter").catch(() => {});
      }
    }

    const updatedMeme = await storage.getMeme(req.params.id);
    res.json({ ...updatedMeme, userVote: existingVote?.voteType === voteType ? null : voteType });
  });

  // ============ CLIPS ============

  app.get("/api/clips", async (req, res) => {
    const clips = await storage.getClips();
    res.json(clips);
  });

  app.get("/api/clips/:id", async (req, res) => {
    const clip = await storage.getClip(req.params.id);
    if (!clip) {
      return res.status(404).json({ error: "Clip not found" });
    }
    res.json(clip);
  });

  app.post("/api/clips", async (req, res) => {
    const result = insertClipSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }
    const clip = await storage.createClip(result.data);
    await storage.updateMissionProgress(result.data.userId, "upload_clip");
    
    // Award badges for clip milestones
    const userClips = await storage.getClipsByUser(result.data.userId);
    if (userClips.length === 1) {
      storage.addBadge(result.data.userId, "first_clip").catch(() => {});
    }
    if (userClips.length === 10) {
      storage.addBadge(result.data.userId, "clip_master").catch(() => {});
    }
    
    res.status(201).json(clip);
  });

  app.post("/api/clips/:id/vote", lightLimiter, async (req, res) => {
    const { voteType, userId } = req.body;
    if (!voteType || !userId) {
      return res.status(400).json({ error: "voteType and userId are required" });
    }

    const clip = await storage.getClip(req.params.id);
    if (!clip) {
      return res.status(404).json({ error: "Clip not found" });
    }

    const existingVote = await storage.getVote(userId, "clip", req.params.id);
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await storage.deleteVote(existingVote.id);
        if (voteType === "up") {
          await storage.updateClip(req.params.id, { upvotes: Math.max(0, clip.upvotes - 1) });
        } else {
          await storage.updateClip(req.params.id, { downvotes: Math.max(0, clip.downvotes - 1) });
        }
      } else {
        await storage.deleteVote(existingVote.id);
        await storage.createVote({ userId, contentType: "clip", contentId: req.params.id, voteType });
        // Check for voter badge
        const voteCount = await storage.getVoteCountByUser(userId);
        if (voteCount === 50) {
          storage.addBadge(userId, "voter").catch(() => {});
        }
        if (existingVote.voteType === "up") {
          await storage.updateClip(req.params.id, { 
            upvotes: Math.max(0, clip.upvotes - 1), 
            downvotes: clip.downvotes + 1 
          });
        } else {
          await storage.updateClip(req.params.id, { 
            upvotes: clip.upvotes + 1, 
            downvotes: Math.max(0, clip.downvotes - 1) 
          });
        }
      }
    } else {
      await storage.createVote({ userId, contentType: "clip", contentId: req.params.id, voteType });
      if (voteType === "up") {
        await storage.updateClip(req.params.id, { upvotes: clip.upvotes + 1 });
      } else {
        await storage.updateClip(req.params.id, { downvotes: clip.downvotes + 1 });
      }
      storage.incrementMissionProgress(userId, "community_vote").catch(() => {});
      // Check for voter badge
      const voteCount = await storage.getVoteCountByUser(userId);
      if (voteCount === 50) {
        storage.addBadge(userId, "voter").catch(() => {});
      }
    }

    const updatedClip = await storage.getClip(req.params.id);
    res.json({ ...updatedClip, userVote: existingVote?.voteType === voteType ? null : voteType });
  });

  // ============ QUOTES ============

  app.get("/api/quotes", async (req, res) => {
    const quotes = await storage.getQuotes();
    res.json(quotes);
  });

  app.get("/api/quotes/:id", async (req, res) => {
    const quote = await storage.getQuote(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }
    res.json(quote);
  });

  app.post("/api/quotes", async (req, res) => {
    const result = insertQuoteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }
    const quote = await storage.createQuote(result.data);
    res.status(201).json(quote);
  });

  app.post("/api/quotes/:id/vote", lightLimiter, async (req, res) => {
    const { voteType, userId } = req.body;
    if (!voteType || !userId) {
      return res.status(400).json({ error: "voteType and userId are required" });
    }

    const quote = await storage.getQuote(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    const existingVote = await storage.getVote(userId, "quote", req.params.id);
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await storage.deleteVote(existingVote.id);
        if (voteType === "up") {
          await storage.updateQuote(req.params.id, { upvotes: Math.max(0, quote.upvotes - 1) });
        } else {
          await storage.updateQuote(req.params.id, { downvotes: Math.max(0, quote.downvotes - 1) });
        }
      } else {
        await storage.deleteVote(existingVote.id);
        await storage.createVote({ userId, contentType: "quote", contentId: req.params.id, voteType });
        if (existingVote.voteType === "up") {
          await storage.updateQuote(req.params.id, { 
            upvotes: Math.max(0, quote.upvotes - 1), 
            downvotes: quote.downvotes + 1 
          });
        } else {
          await storage.updateQuote(req.params.id, { 
            upvotes: quote.upvotes + 1, 
            downvotes: Math.max(0, quote.downvotes - 1) 
          });
        }
      }
    } else {
      await storage.createVote({ userId, contentType: "quote", contentId: req.params.id, voteType });
      if (voteType === "up") {
        await storage.updateQuote(req.params.id, { upvotes: quote.upvotes + 1 });
      } else {
        await storage.updateQuote(req.params.id, { downvotes: quote.downvotes + 1 });
      }
      storage.incrementMissionProgress(userId, "community_vote").catch(() => {});
    }

    const updatedQuote = await storage.getQuote(req.params.id);
    res.json({ ...updatedQuote, userVote: existingVote?.voteType === voteType ? null : voteType });
  });

  // ============ PROFILES ============

  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // ============ LEADERBOARD ============

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard.map(u => ({
        id: u.id,
        username: u.discordUsername || u.username,
        avatar: u.discordAvatar,
        points: u.points,
        badges: u.badges || [],
      })));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // ============ CHAT ============

  app.get("/api/chat", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getChatMessages(limit);
      
      // Fetch user info for each message
      const messagesWithUsers = await Promise.all(messages.map(async (msg) => {
        const user = await storage.getUser(msg.userId);
        return {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          user: user ? {
            id: user.id,
            username: user.discordUsername || user.username,
            avatar: user.discordAvatar,
          } : null,
        };
      }));
      
      res.json(messagesWithUsers.reverse());
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ error: "Failed to fetch chat" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { content, userId } = req.body;
      if (!content || !userId) {
        return res.status(400).json({ error: "content and userId are required" });
      }
      
      const message = await storage.createChatMessage({ content, userId });
      
      // Award points for chatting
      await storage.addPoints(userId, 1);
      
      // Check for chat_active badge
      const chatCount = await storage.getChatMessageCountByUser(userId);
      if (chatCount === 100) {
        storage.addBadge(userId, "chat_active").catch(() => {});
      }
      
      const user = await storage.getUser(userId);
      
      res.status(201).json({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        user: user ? {
          id: user.id,
          username: user.discordUsername || user.username,
          avatar: user.discordAvatar,
        } : null,
      });
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ============ FEATURED CONTENT ============

  app.get("/api/featured", async (req, res) => {
    try {
      const allMemes = await storage.getMemes();
      const allClips = await storage.getClips();
      
      // Get featured or top meme
      let featuredMeme = allMemes.find(m => m.featured);
      if (!featuredMeme && allMemes.length > 0) {
        featuredMeme = allMemes.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))[0];
      }
      
      // Get featured or top clip
      let featuredClip = allClips.find(c => c.featured);
      if (!featuredClip && allClips.length > 0) {
        featuredClip = allClips.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))[0];
      }
      
      res.json({
        meme: featuredMeme || null,
        clip: featuredClip || null,
      });
    } catch (error) {
      console.error("Error fetching featured content:", error);
      res.status(500).json({ error: "Failed to fetch featured content" });
    }
  });

  // ============ CONTENT COMMENTS ============

  app.get("/api/comments/:contentType/:contentId", async (req, res) => {
    try {
      const { contentType, contentId } = req.params;
      const requestingUserId = req.query.userId as string | undefined;
      const comments = await storage.getContentComments(contentType, contentId);
      
      const commentsWithUsers = await Promise.all(comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        const likes = await storage.getCommentLikesCount(comment.id);
        const userLiked = requestingUserId ? await storage.hasUserLikedComment(requestingUserId, comment.id) : false;
        return {
          id: comment.id,
          content: comment.content,
          parentId: comment.parentId,
          mediaUrl: comment.mediaUrl,
          mediaType: comment.mediaType,
          createdAt: comment.createdAt,
          likes,
          userLiked,
          user: user ? {
            id: user.id,
            username: user.discordUsername || user.username,
            avatar: user.discordAvatar,
          } : null,
        };
      }));
      
      res.json(commentsWithUsers);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments/:contentType/:contentId", async (req, res) => {
    try {
      const { contentType, contentId } = req.params;
      const { content, userId, parentId, mediaUrl, mediaType } = req.body;
      
      if (!content || !userId) {
        return res.status(400).json({ error: "content and userId are required" });
      }
      
      if (mediaType && !["image", "gif"].includes(mediaType)) {
        return res.status(400).json({ error: "mediaType must be 'image' or 'gif'" });
      }
      
      const comment = await storage.createContentComment({
        contentType,
        contentId,
        content,
        userId,
        parentId: parentId || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
      });
      
      await storage.addPoints(userId, 2);
      await storage.updateMissionProgress(userId, "post_comment");
      
      const user = await storage.getUser(userId);
      
      res.status(201).json({
        id: comment.id,
        content: comment.content,
        parentId: comment.parentId,
        mediaUrl: comment.mediaUrl,
        mediaType: comment.mediaType,
        createdAt: comment.createdAt,
        likes: 0,
        userLiked: false,
        user: user ? {
          id: user.id,
          username: user.discordUsername || user.username,
          avatar: user.discordAvatar,
        } : null,
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.post("/api/comments/:commentId/like", async (req, res) => {
    try {
      const { commentId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const result = await storage.toggleCommentLike(userId, commentId);
      
      res.json({ liked: result.liked, count: result.count });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // ============ DAILY MISSIONS ============

  app.get("/api/missions", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const missions = await storage.generateDailyMissions(user.id);
    const enrichedMissions = missions.map(m => ({
      ...m,
      ...MISSION_TYPES[m.missionType as MissionType],
    }));
    
    res.json(enrichedMissions);
  });

  app.post("/api/missions/:type/progress", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const missionType = req.params.type as MissionType;
    const { increment = 1 } = req.body;
    
    const mission = await storage.updateMissionProgress(user.id, missionType, increment);
    if (!mission) {
      return res.status(404).json({ error: "Mission not found" });
    }
    
    res.json({
      ...mission,
      ...MISSION_TYPES[missionType],
    });
  });

  // ============ LOGIN STREAKS ============

  app.get("/api/streak", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const streak = await storage.getUserStreak(user.id);
    res.json(streak || { currentStreak: 0, maxStreak: 0 });
  });

  app.post("/api/streak/check-in", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const result = await storage.updateLoginStreak(user.id);
    
    await storage.updateMissionProgress(user.id, "daily_login");
    
    res.json({
      streak: result.streak,
      pointsEarned: result.pointsEarned,
      newBadge: result.newBadge ? BADGES[result.newBadge as keyof typeof BADGES] : null,
    });
  });

  // ============ REPORTS ============

  app.post("/api/reports", strictLimiter, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const result = insertReportSchema.safeParse({
      ...req.body,
      reporterId: user.id,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const report = await storage.createReport(result.data);
    res.status(201).json(report);
  });

  app.get("/api/admin/reports", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const status = req.query.status as string | undefined;
    const reports = await storage.getReports(status);
    
    const enrichedReports = await Promise.all(reports.map(async (report) => {
      const reporter = await storage.getUser(report.reporterId);
      return {
        ...report,
        reporter: reporter ? {
          id: reporter.id,
          username: reporter.discordUsername || reporter.username,
          avatar: reporter.discordAvatar,
        } : null,
      };
    }));
    
    res.json(enrichedReports);
  });

  app.patch("/api/admin/reports/:id", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { status, action } = req.body;
    
    if (action === "delete") {
      const report = await storage.getReports().then(r => r.find(rep => rep.id === req.params.id));
      if (report) {
        await storage.deleteContent(report.contentType, report.contentId, user.id);
      }
    }
    
    const updatedReport = await storage.updateReportStatus(req.params.id, status, user.id);
    res.json(updatedReport);
  });

  // ============ ADMIN LOGS ============

  app.get("/api/admin/logs", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await storage.getAdminLogs(limit);
    
    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      const admin = await storage.getUser(log.adminId);
      return {
        ...log,
        admin: admin ? {
          id: admin.id,
          username: admin.discordUsername || admin.username,
          avatar: admin.discordAvatar,
        } : null,
      };
    }));
    
    res.json(enrichedLogs);
  });

  // ============ CONTENT MODERATION ============

  app.delete("/api/admin/content/:type/:id", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { type, id } = req.params;
    await storage.deleteContent(type, id, user.id);
    res.json({ success: true });
  });

  // ============ ADMIN: BADGE MANAGEMENT ============

  app.get("/api/admin/badges", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const badges = await storage.getAllBadgeCatalog();
      res.json(badges);
    } catch (error: any) {
      console.error("[Admin] Get badges error:", error);
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  app.post("/api/admin/badges", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { name, displayName, description, icon, rarity, autoUnlock, unlockCondition } = req.body;
      if (!name || !displayName || !description || !icon) {
        return res.status(400).json({ error: "name, displayName, description, and icon are required" });
      }

      const badge = await storage.createBadgeCatalog({
        name,
        displayName,
        description,
        icon,
        rarity: rarity || "common",
        autoUnlock: autoUnlock || false,
        unlockCondition: unlockCondition || null,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "create_badge",
        entityType: "badge",
        entityId: badge.id,
        payload: JSON.stringify({ name, displayName }),
      });

      res.status(201).json(badge);
    } catch (error: any) {
      console.error("[Admin] Create badge error:", error);
      res.status(500).json({ error: "Failed to create badge" });
    }
  });

  app.put("/api/admin/badges/:id", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const badge = await storage.updateBadgeCatalog(req.params.id, req.body);
      if (!badge) {
        return res.status(404).json({ error: "Badge not found" });
      }

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "update_badge",
        entityType: "badge",
        entityId: badge.id,
        payload: JSON.stringify(req.body),
      });

      res.json(badge);
    } catch (error: any) {
      console.error("[Admin] Update badge error:", error);
      res.status(500).json({ error: "Failed to update badge" });
    }
  });

  app.delete("/api/admin/badges/:id", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const badge = await storage.getBadgeCatalogById(req.params.id);
      if (!badge) {
        return res.status(404).json({ error: "Badge not found" });
      }

      await storage.deleteBadgeCatalog(req.params.id);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "delete_badge",
        entityType: "badge",
        entityId: req.params.id,
        payload: JSON.stringify({ name: badge.name }),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin] Delete badge error:", error);
      res.status(500).json({ error: "Failed to delete badge" });
    }
  });

  app.get("/api/admin/users/:userId/badges", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const badges = await storage.getUserBadges(req.params.userId);
      res.json(badges);
    } catch (error: any) {
      console.error("[Admin] Get user badges error:", error);
      res.status(500).json({ error: "Failed to fetch user badges" });
    }
  });

  app.post("/api/admin/users/:userId/badges", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { badgeId } = req.body;
      if (!badgeId) {
        return res.status(400).json({ error: "badgeId is required" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const badge = await storage.getBadgeCatalogById(badgeId);
      if (!badge) {
        return res.status(404).json({ error: "Badge not found" });
      }

      const userBadge = await storage.awardBadgeToUser(req.params.userId, badgeId, user.id);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "award_badge",
        entityType: "user_badge",
        entityId: userBadge.id,
        payload: JSON.stringify({ userId: req.params.userId, badgeId, badgeName: badge.name }),
      });

      res.status(201).json(userBadge);
    } catch (error: any) {
      console.error("[Admin] Award badge error:", error);
      res.status(500).json({ error: "Failed to award badge" });
    }
  });

  app.delete("/api/admin/users/:userId/badges/:badgeId", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const badge = await storage.getBadgeCatalogById(req.params.badgeId);
      await storage.revokeBadgeFromUser(req.params.userId, req.params.badgeId);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "revoke_badge",
        entityType: "user_badge",
        entityId: `${req.params.userId}-${req.params.badgeId}`,
        payload: JSON.stringify({ userId: req.params.userId, badgeId: req.params.badgeId, badgeName: badge?.name }),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin] Revoke badge error:", error);
      res.status(500).json({ error: "Failed to revoke badge" });
    }
  });

  // ============ ADMIN: USER MODERATION ============

  app.get("/api/admin/users", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const search = req.query.search as string | undefined;
      const users = await storage.searchUsers(search);
      res.json(users.map(u => ({
        id: u.id,
        discordId: u.discordId,
        username: u.discordUsername || u.username,
        email: u.email,
        avatar: u.discordAvatar,
        role: u.role,
        points: u.points,
        badges: u.badges,
        status: u.status,
        bannedUntil: u.bannedUntil,
        banReason: u.banReason,
        createdAt: u.createdAt,
      })));
    } catch (error: any) {
      console.error("[Admin] Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:userId/role", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { role } = req.body;
      if (!role || !["user", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'user', 'moderator', or 'admin'" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(req.params.userId, { role });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "change_role",
        entityType: "user",
        entityId: req.params.userId,
        payload: JSON.stringify({ oldRole: targetUser.role, newRole: role }),
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error("[Admin] Change role error:", error);
      res.status(500).json({ error: "Failed to change user role" });
    }
  });

  app.put("/api/admin/users/:userId/points", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { points } = req.body;
      if (typeof points !== "number") {
        return res.status(400).json({ error: "Points must be a number" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(req.params.userId, { points });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "update_points",
        entityType: "user",
        entityId: req.params.userId,
        payload: JSON.stringify({ oldPoints: targetUser.points, newPoints: points }),
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error("[Admin] Update points error:", error);
      res.status(500).json({ error: "Failed to update user points" });
    }
  });

  app.post("/api/admin/users/:userId/ban", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { reason, duration } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Ban reason is required" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.role === "admin") {
        return res.status(403).json({ error: "Cannot ban an admin user" });
      }

      let bannedUntil: Date | null = null;
      if (duration !== null && typeof duration === "number" && duration > 0) {
        bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + duration);
      }

      const updatedUser = await storage.updateUser(req.params.userId, {
        status: "banned",
        bannedUntil,
        banReason: reason,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "ban_user",
        entityType: "user",
        entityId: req.params.userId,
        payload: JSON.stringify({ reason, duration, bannedUntil }),
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error("[Admin] Ban user error:", error);
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  app.post("/api/admin/users/:userId/unban", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(req.params.userId, {
        status: "active",
        bannedUntil: null,
        banReason: null,
      });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "unban_user",
        entityType: "user",
        entityId: req.params.userId,
        payload: JSON.stringify({ previousBanReason: targetUser.banReason }),
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error("[Admin] Unban user error:", error);
      res.status(500).json({ error: "Failed to unban user" });
    }
  });

  // ============ ADMIN: CONTENT MODERATION (MEMES) ============

  app.get("/api/admin/memes", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const memes = await storage.getMemes();
      const enrichedMemes = await Promise.all(memes.map(async (meme) => {
        const memeUser = await storage.getUser(meme.userId);
        return {
          ...meme,
          user: memeUser ? {
            id: memeUser.id,
            username: memeUser.discordUsername || memeUser.username,
            avatar: memeUser.discordAvatar,
          } : null,
        };
      }));
      res.json(enrichedMemes);
    } catch (error: any) {
      console.error("[Admin] Get memes error:", error);
      res.status(500).json({ error: "Failed to fetch memes" });
    }
  });

  app.delete("/api/admin/memes/:id", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const meme = await storage.getMeme(req.params.id);
      if (!meme) {
        return res.status(404).json({ error: "Meme not found" });
      }

      await storage.deleteContent("meme", req.params.id, user.id);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "delete_meme",
        entityType: "meme",
        entityId: req.params.id,
        payload: JSON.stringify({ title: meme.title, userId: meme.userId }),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin] Delete meme error:", error);
      res.status(500).json({ error: "Failed to delete meme" });
    }
  });

  app.put("/api/admin/memes/:id/feature", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const meme = await storage.getMeme(req.params.id);
      if (!meme) {
        return res.status(404).json({ error: "Meme not found" });
      }

      const updatedMeme = await storage.updateMeme(req.params.id, { featured: !meme.featured });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: meme.featured ? "unfeature_meme" : "feature_meme",
        entityType: "meme",
        entityId: req.params.id,
        payload: JSON.stringify({ featured: !meme.featured }),
      });

      res.json(updatedMeme);
    } catch (error: any) {
      console.error("[Admin] Toggle meme feature error:", error);
      res.status(500).json({ error: "Failed to toggle meme featured status" });
    }
  });

  // ============ ADMIN: CONTENT MODERATION (CLIPS) ============

  app.get("/api/admin/clips", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const clips = await storage.getClips();
      const enrichedClips = await Promise.all(clips.map(async (clip) => {
        const clipUser = await storage.getUser(clip.userId);
        return {
          ...clip,
          user: clipUser ? {
            id: clipUser.id,
            username: clipUser.discordUsername || clipUser.username,
            avatar: clipUser.discordAvatar,
          } : null,
        };
      }));
      res.json(enrichedClips);
    } catch (error: any) {
      console.error("[Admin] Get clips error:", error);
      res.status(500).json({ error: "Failed to fetch clips" });
    }
  });

  app.delete("/api/admin/clips/:id", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const clip = await storage.getClip(req.params.id);
      if (!clip) {
        return res.status(404).json({ error: "Clip not found" });
      }

      await storage.deleteContent("clip", req.params.id, user.id);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "delete_clip",
        entityType: "clip",
        entityId: req.params.id,
        payload: JSON.stringify({ title: clip.title, userId: clip.userId }),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin] Delete clip error:", error);
      res.status(500).json({ error: "Failed to delete clip" });
    }
  });

  app.put("/api/admin/clips/:id/feature", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const clip = await storage.getClip(req.params.id);
      if (!clip) {
        return res.status(404).json({ error: "Clip not found" });
      }

      const updatedClip = await storage.updateClip(req.params.id, { featured: !clip.featured });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: clip.featured ? "unfeature_clip" : "feature_clip",
        entityType: "clip",
        entityId: req.params.id,
        payload: JSON.stringify({ featured: !clip.featured }),
      });

      res.json(updatedClip);
    } catch (error: any) {
      console.error("[Admin] Toggle clip feature error:", error);
      res.status(500).json({ error: "Failed to toggle clip featured status" });
    }
  });

  // ============ ADMIN: CONTENT MODERATION (QUOTES) ============

  app.get("/api/admin/quotes", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const quotes = await storage.getQuotes();
      const enrichedQuotes = await Promise.all(quotes.map(async (quote) => {
        const quoteUser = await storage.getUser(quote.userId);
        return {
          ...quote,
          user: quoteUser ? {
            id: quoteUser.id,
            username: quoteUser.discordUsername || quoteUser.username,
            avatar: quoteUser.discordAvatar,
          } : null,
        };
      }));
      res.json(enrichedQuotes);
    } catch (error: any) {
      console.error("[Admin] Get quotes error:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.delete("/api/admin/quotes/:id", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      await storage.deleteContent("quote", req.params.id, user.id);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "delete_quote",
        entityType: "quote",
        entityId: req.params.id,
        payload: JSON.stringify({ content: quote.content.slice(0, 100), userId: quote.userId }),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin] Delete quote error:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  app.put("/api/admin/quotes/:id/feature", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const updatedQuote = await storage.updateQuote(req.params.id, { featured: !quote.featured });

      await storage.createAuditLog({
        actorUserId: user.id,
        action: quote.featured ? "unfeature_quote" : "feature_quote",
        entityType: "quote",
        entityId: req.params.id,
        payload: JSON.stringify({ featured: !quote.featured }),
      });

      res.json(updatedQuote);
    } catch (error: any) {
      console.error("[Admin] Toggle quote feature error:", error);
      res.status(500).json({ error: "Failed to toggle quote featured status" });
    }
  });

  // ============ ADMIN: CONTENT MODERATION (COMMENTS) ============

  app.get("/api/admin/comments", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const comments = await storage.getRecentComments(500);
      res.json(comments);
    } catch (error: any) {
      console.error("[Admin] Get comments error:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.delete("/api/admin/comments/:id", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteContent("comment", req.params.id, user.id);

      await storage.createAuditLog({
        actorUserId: user.id,
        action: "delete_comment",
        entityType: "comment",
        entityId: req.params.id,
        payload: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Admin] Delete comment error:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // ============ ACTIVITY FEED ============
  
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const [memes, clips, comments] = await Promise.all([
        storage.getMemes(),
        storage.getClips(),
        storage.getRecentComments(limit),
      ]);
      
      const activities: any[] = [];
      
      memes.slice(0, 5).forEach((meme: any) => {
        activities.push({
          id: `meme-${meme.id}`,
          type: "meme",
          title: meme.title,
          imageUrl: meme.imageUrl,
          userId: meme.userId,
          upvotes: meme.upvotes,
          createdAt: meme.createdAt,
        });
      });
      
      clips.slice(0, 5).forEach((clip: any) => {
        activities.push({
          id: `clip-${clip.id}`,
          type: "clip",
          title: clip.title,
          thumbnailUrl: clip.thumbnailUrl,
          userId: clip.userId,
          upvotes: clip.upvotes,
          createdAt: clip.createdAt,
        });
      });
      
      comments.forEach((comment: any) => {
        activities.push({
          id: `comment-${comment.id}`,
          type: "comment",
          content: comment.content.slice(0, 100),
          contentType: comment.contentType,
          userId: comment.userId,
          username: comment.user?.username,
          avatar: comment.user?.avatar,
          createdAt: comment.createdAt,
        });
      });
      
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(activities.slice(0, limit));
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // ============ GROWTH & REWARDS ============

  // Invites Admin
  app.get("/api/admin/invites", async (req, res) => {
    try {
      const invites = await storage.getInvites();
      res.json(invites);
    } catch (e) {
      res.json([]);
    }
  });

  app.post("/api/admin/invites/:id/confirm", async (req, res) => {
    try {
      const invite = await storage.confirmInvite(req.params.id);
      res.json(invite);
    } catch (e) {
      res.status(400).json({ error: "Failed to confirm" });
    }
  });

  // Raffle Admin
  app.get("/api/admin/raffle/draws", async (req, res) => {
    try {
      const draws = await storage.getRaffleDraws();
      res.json(draws);
    } catch (e) {
      res.json([]);
    }
  });

  app.post("/api/admin/raffle/draws", async (req, res) => {
    try {
      const draw = await storage.createRaffleDraw(req.body);
      res.status(201).json(draw);
    } catch (e) {
      res.status(400).json({ error: "Failed to create" });
    }
  });

  app.post("/api/admin/raffle/draws/:id/close", async (req, res) => {
    try {
      const draw = await storage.closeRaffleDraw(req.params.id);
      res.json(draw);
    } catch (e) {
      res.status(400).json({ error: "Failed to close" });
    }
  });

  app.post("/api/admin/raffle/draws/:id/draw", async (req, res) => {
    try {
      const result = await storage.drawRaffleWinner(req.params.id);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: "Failed to draw" });
    }
  });

  // User Raffle
  app.get("/api/raffle/active", async (req, res) => {
    try {
      const draws = await storage.getActiveRaffleDraws();
      res.json(draws);
    } catch (e) {
      res.json([]);
    }
  });

  app.get("/api/raffle/my-tickets", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.json({ tickets: 0, entries: [] });
    const data = await storage.getUserRaffleData(user.id);
    res.json(data);
  });

  app.post("/api/raffle/enter/:drawId", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const entry = await storage.enterRaffle(user.id, req.params.drawId, req.body.ticketCount || 1);
      res.json(entry);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to enter" });
    }
  });

  // Power Rewards Admin
  app.get("/api/admin/power/requests", async (req, res) => {
    try {
      const requests = await storage.getPowerRewardRequests();
      res.json(requests);
    } catch (e) {
      res.json([]);
    }
  });

  app.post("/api/admin/power/requests/:id/approve", async (req, res) => {
    try {
      const result = await storage.approvePowerRewardRequest(req.params.id);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: "Failed to approve" });
    }
  });

  // User Power Rewards
  app.get("/api/power/rewards", async (req, res) => {
    try {
      const rewards = await storage.getPowerRewards();
      res.json(rewards);
    } catch (e) {
      res.json([]);
    }
  });

  app.post("/api/power/request/:rewardId", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const request = await storage.requestPowerReward(user.id, req.params.rewardId);
      res.json(request);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to request" });
    }
  });

  // Social Proofs Admin
  app.get("/api/admin/proofs", async (req, res) => {
    try {
      const proofs = await storage.getSocialProofs("pending");
      res.json(proofs);
    } catch (e) {
      res.json([]);
    }
  });

  app.patch("/api/admin/proofs/:id", async (req, res) => {
    try {
      const { status, ticketsAwarded } = req.body;
      const proof = await storage.updateSocialProof(req.params.id, status, ticketsAwarded);
      res.json(proof);
    } catch (e) {
      res.status(400).json({ error: "Failed to update" });
    }
  });

  // User Social Proofs
  app.get("/api/proofs/my", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.json([]);
    const proofs = await storage.getUserSocialProofs(user.id);
    res.json(proofs);
  });

  app.post("/api/proofs", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const proof = await storage.createSocialProof({
      userId: user.id,
      platform: req.body.platform,
      proofUrl: req.body.proofUrl,
      note: req.body.note,
    });
    res.status(201).json(proof);
  });

  // User Invite Link
  app.get("/api/invites/my", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.json({ inviteCode: null, invites: [] });
    const data = await storage.getUserInviteData(user.id);
    res.json(data);
  });

  // ============ MISSIONS ============
  
  app.get("/api/missions/active", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const userId = user?.id;
      
      const dailyMissions = await storage.getDailyMissionsActive(userId, 3);
      const activeTournaments = await storage.getTournaments();
      const activeTournament = activeTournaments.find(t => t.status === "active" || t.status === "live");
      
      let eventMissions: any[] = [];
      if (activeTournament) {
        const allMissions = await storage.getActiveMissions(userId);
        eventMissions = allMissions.filter(m => m.scope === "event" && m.tournamentId === activeTournament.id);
      }
      
      res.json({ daily: dailyMissions, event: eventMissions });
    } catch (e) {
      console.error("Missions active error:", e);
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  app.get("/api/missions/me", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.json({ active: [], completed: [] });
    
    const allMissions = await storage.getActiveMissions(user.id);
    const userMissions = await storage.getUserMissions(user.id);
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentCompleted = userMissions.filter(m => 
      m.userProgress?.completedAt && new Date(m.userProgress.completedAt) > sevenDaysAgo
    );
    
    res.json({ active: allMissions, completed: recentCompleted });
  });

  app.post("/api/missions/:id/claim", moderateLimiter, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const result = await storage.claimMissionReward(user.id, req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: "Cannot claim reward" });
    }
    res.json(result);
  });

  app.post("/api/missions/:id/submit", strictLimiter, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const mission = await storage.getMission(req.params.id);
    if (!mission || mission.type !== "proof") {
      return res.status(400).json({ error: "Mission does not require proof" });
    }
    
    const submission = await storage.createMissionSubmission({
      userId: user.id,
      missionId: req.params.id,
      proofUrl: req.body.proofUrl,
      note: req.body.note,
    });
    res.status(201).json(submission);
  });

  // Admin Missions
  app.get("/api/admin/missions", async (req, res) => {
    try {
      const missions = await storage.getAllMissions();
      res.json(missions);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  app.post("/api/admin/missions", async (req, res) => {
    const user = await getSessionUser(req);
    
    const mission = await storage.createMission({
      ...req.body,
      createdByUserId: user?.id,
    });
    res.status(201).json(mission);
  });

  app.patch("/api/admin/missions/:id", async (req, res) => {
    try {
      const mission = await storage.updateMission(req.params.id, req.body);
      res.json(mission);
    } catch (e) {
      res.status(400).json({ error: "Failed to update mission" });
    }
  });

  app.post("/api/admin/missions/seed", async (req, res) => {
    try {
      const created = await storage.seedDefaultMissions();
      res.json({ created: created.length, missions: created });
    } catch (e) {
      res.status(400).json({ error: "Failed to seed missions" });
    }
  });

  app.get("/api/admin/missions/submissions", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const submissions = await storage.getMissionSubmissions(status);
      res.json(submissions);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.post("/api/admin/missions/submissions/:id/approve", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const submission = await storage.approveMissionSubmission(req.params.id, user.id);
    res.json(submission);
  });

  app.post("/api/admin/missions/submissions/:id/reject", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const submission = await storage.rejectMissionSubmission(req.params.id, user.id, req.body.reason);
    res.json(submission);
  });

  // ============ ADMIN USER MANAGEMENT ============

  app.get("/api/admin/users", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/admin/users/:id/role", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const { role } = req.body;
    if (!["user", "mod", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    
    // Prevent self-demotion
    if (req.params.id === user.id && role !== "admin") {
      return res.status(400).json({ error: "Cannot demote yourself" });
    }
    
    const updatedUser = await storage.updateUser(req.params.id, { role });
    res.json(updatedUser);
  });

  return httpServer;
}
