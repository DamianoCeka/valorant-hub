import { db } from "./db";
import { tournaments, teams, teamMembers, matches, announcements, memes, clips, quotes, votes, users, chatMessages, contentComments, commentLikes, dailyMissions, userStreaks, reports, adminLogs, auditLogs, invites, raffleDraws, raffleTickets, raffleWinners, powerRewards, userPowerRewards, socialProofs, missions, userMissionProgress, missionSubmissions, badgeCatalog, userBadges, MISSION_TYPES, BADGES } from "@shared/schema";
import type { Tournament, InsertTournament, Team, InsertTeam, TeamMember, InsertTeamMember, Match, InsertMatch, Announcement, InsertAnnouncement, Meme, InsertMeme, Clip, InsertClip, Quote, InsertQuote, Vote, InsertVote, User, InsertUser, ChatMessage, InsertChatMessage, ContentComment, InsertContentComment, CommentLike, InsertCommentLike, DailyMission, InsertDailyMission, UserStreak, InsertUserStreak, Report, InsertReport, AdminLog, InsertAdminLog, AuditLog, InsertAuditLog, MissionType, Invite, InsertInvite, RaffleDraw, InsertRaffleDraw, RaffleTicket, InsertRaffleTicket, PowerReward, InsertPowerReward, UserPowerReward, InsertUserPowerReward, SocialProof, InsertSocialProof, Mission, InsertMission, UserMissionProgress, InsertUserMissionProgress, MissionSubmission, InsertMissionSubmission, BadgeCatalog, InsertBadgeCatalog, UserBadge, InsertUserBadge } from "@shared/schema";
import { eq, desc, and, sql, count, gte, lt, or } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // Tournaments
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | undefined>;
  
  // Teams
  getTeams(tournamentId: string): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeamByCheckInCode(code: string): Promise<Team | undefined>;
  getTeamByUserInTournament(userId: string, tournamentId: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined>;
  
  // Team Members
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  isUserInTeam(teamId: string, userId: string): Promise<boolean>;
  getUserTeamInTournament(userId: string, tournamentId: string): Promise<{ team: Team; member: TeamMember } | null>;
  
  // Matches
  getMatches(tournamentId: string): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined>;
  
  // Announcements
  getAnnouncements(tournamentId?: string): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Memes
  getMemes(): Promise<Meme[]>;
  getMeme(id: string): Promise<Meme | undefined>;
  createMeme(meme: InsertMeme): Promise<Meme>;
  updateMeme(id: string, updates: Partial<Meme>): Promise<Meme | undefined>;

  // Clips
  getClips(): Promise<Clip[]>;
  getClip(id: string): Promise<Clip | undefined>;
  createClip(clip: InsertClip): Promise<Clip>;
  updateClip(id: string, updates: Partial<Clip>): Promise<Clip | undefined>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined>;

  // Votes
  getVote(userId: string, contentType: string, contentId: string): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  deleteVote(id: string): Promise<void>;

  // Chat
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Profile & Stats
  getUserProfile(userId: string): Promise<any>;
  getMemesByUser(userId: string): Promise<Meme[]>;
  getClipsByUser(userId: string): Promise<Clip[]>;
  getVoteCountByUser(userId: string): Promise<number>;
  getChatMessageCountByUser(userId: string): Promise<number>;
  getLeaderboard(limit?: number): Promise<User[]>;
  addPoints(userId: string, points: number): Promise<void>;
  addBadge(userId: string, badgeId: string): Promise<void>;

  // Content Comments
  getContentComments(contentType: string, contentId: string): Promise<ContentComment[]>;
  getRecentComments(limit?: number): Promise<ContentComment[]>;
  createContentComment(comment: InsertContentComment): Promise<ContentComment>;
  deleteContentComment(id: string): Promise<void>;

  // Comment Likes
  getCommentLikesCount(commentId: string): Promise<number>;
  hasUserLikedComment(userId: string, commentId: string): Promise<boolean>;
  toggleCommentLike(userId: string, commentId: string): Promise<{ liked: boolean; count: number; isFirstLike: boolean }>;

  // Daily Missions
  getDailyMissions(userId: string): Promise<DailyMission[]>;
  generateDailyMissions(userId: string): Promise<DailyMission[]>;
  updateMissionProgress(userId: string, missionType: MissionType, increment?: number): Promise<DailyMission | null>;
  completeMission(missionId: string): Promise<DailyMission | undefined>;

  // User Streaks
  getUserStreak(userId: string): Promise<UserStreak | undefined>;
  updateLoginStreak(userId: string): Promise<{ streak: UserStreak; pointsEarned: number; newBadge?: string }>;

  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getReports(status?: string): Promise<Report[]>;
  updateReportStatus(id: string, status: string, reviewedBy: string): Promise<Report | undefined>;

  // Admin Logs
  createAdminLog(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(limit?: number): Promise<AdminLog[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Content Moderation
  hideContent(contentType: string, contentId: string, adminId: string): Promise<void>;
  deleteContent(contentType: string, contentId: string, adminId: string): Promise<void>;
  deleteQuote(id: string): Promise<void>;
  deleteMeme(id: string): Promise<void>;
  deleteClip(id: string): Promise<void>;
  searchUsers(query?: string): Promise<User[]>;

  // Badge Catalog
  getAllBadgeCatalog(): Promise<BadgeCatalog[]>;
  getBadgeCatalogById(id: string): Promise<BadgeCatalog | undefined>;
  getBadgeCatalogByName(name: string): Promise<BadgeCatalog | undefined>;
  createBadgeCatalog(badge: InsertBadgeCatalog): Promise<BadgeCatalog>;
  updateBadgeCatalog(id: string, updates: Partial<BadgeCatalog>): Promise<BadgeCatalog | undefined>;
  deleteBadgeCatalog(id: string): Promise<void>;

  // User Badges
  getUserBadges(userId: string): Promise<(UserBadge & { badge: BadgeCatalog })[]>;
  awardBadgeToUser(userId: string, badgeId: string, awardedBy?: string): Promise<UserBadge>;
  revokeBadgeFromUser(userId: string, badgeId: string): Promise<void>;
  hasUserBadge(userId: string, badgeId: string): Promise<boolean>;
  seedDefaultBadgeCatalog(): Promise<BadgeCatalog[]>;
}

export class Storage implements IStorage {
  // ============ TOURNAMENTS ============
  async getTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments);
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    return result[0];
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const result = await db.insert(tournaments).values(tournament).returning();
    return result[0];
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | undefined> {
    const result = await db.update(tournaments).set(updates).where(eq(tournaments.id, id)).returning();
    return result[0];
  }

  // ============ TEAMS ============
  async getTeams(tournamentId: string): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0];
  }

  async getTeamByCheckInCode(code: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.checkInCode, code)).limit(1);
    return result[0];
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const checkInCode = randomBytes(3).toString("hex").toUpperCase();
    const result = await db.insert(teams).values({
      ...team,
      checkInCode,
      isCheckedIn: false,
      status: "pending",
    }).returning();
    return result[0];
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const result = await db.update(teams).set(updates).where(eq(teams.id, id)).returning();
    return result[0];
  }

  async getTeamByUserInTournament(userId: string, tournamentId: string): Promise<Team | undefined> {
    const result = await db
      .select({ team: teams })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(and(eq(teamMembers.userId, userId), eq(teams.tournamentId, tournamentId)))
      .limit(1);
    return result[0]?.team;
  }

  // ============ TEAM MEMBERS ============
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values(member).returning();
    return result[0];
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db.delete(teamMembers).where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
    );
  }

  async isUserInTeam(teamId: string, userId: string): Promise<boolean> {
    const result = await db.select().from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);
    return result.length > 0;
  }

  async getUserTeamInTournament(userId: string, tournamentId: string): Promise<{ team: Team; member: TeamMember } | null> {
    const result = await db
      .select({ team: teams, member: teamMembers })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(and(eq(teamMembers.userId, userId), eq(teams.tournamentId, tournamentId)))
      .limit(1);
    return result[0] || null;
  }

  // ============ MATCHES ============
  async getMatches(tournamentId: string): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.tournamentId, tournamentId));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    return result[0];
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const result = await db.insert(matches).values(match).returning();
    return result[0];
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined> {
    const result = await db.update(matches).set(updates).where(eq(matches.id, id)).returning();
    return result[0];
  }

  // ============ ANNOUNCEMENTS ============
  async getAnnouncements(tournamentId?: string): Promise<Announcement[]> {
    if (tournamentId) {
      return await db.select().from(announcements).where(eq(announcements.tournamentId, tournamentId));
    }
    return await db.select().from(announcements);
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const result = await db.insert(announcements).values(announcement).returning();
    return result[0];
  }

  // ============ USERS ============
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  // ============ MEMES ============
  async getMemes(): Promise<Meme[]> {
    return await db.select().from(memes).orderBy(desc(memes.createdAt));
  }

  async getMeme(id: string): Promise<Meme | undefined> {
    const result = await db.select().from(memes).where(eq(memes.id, id)).limit(1);
    return result[0];
  }

  async createMeme(meme: InsertMeme): Promise<Meme> {
    const result = await db.insert(memes).values(meme).returning();
    return result[0];
  }

  async updateMeme(id: string, updates: Partial<Meme>): Promise<Meme | undefined> {
    const result = await db.update(memes).set(updates).where(eq(memes.id, id)).returning();
    return result[0];
  }

  // ============ CLIPS ============
  async getClips(): Promise<Clip[]> {
    return await db.select().from(clips).orderBy(desc(clips.createdAt));
  }

  async getClip(id: string): Promise<Clip | undefined> {
    const result = await db.select().from(clips).where(eq(clips.id, id)).limit(1);
    return result[0];
  }

  async createClip(clip: InsertClip): Promise<Clip> {
    const result = await db.insert(clips).values(clip).returning();
    return result[0];
  }

  async updateClip(id: string, updates: Partial<Clip>): Promise<Clip | undefined> {
    const result = await db.update(clips).set(updates).where(eq(clips.id, id)).returning();
    return result[0];
  }

  // ============ QUOTES ============
  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const result = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    return result[0];
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const result = await db.insert(quotes).values(quote).returning();
    return result[0];
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const result = await db.update(quotes).set(updates).where(eq(quotes.id, id)).returning();
    return result[0];
  }

  // ============ VOTES ============
  async getVote(userId: string, contentType: string, contentId: string): Promise<Vote | undefined> {
    const result = await db.select().from(votes)
      .where(and(
        eq(votes.userId, userId),
        eq(votes.contentType, contentType),
        eq(votes.contentId, contentId)
      ))
      .limit(1);
    return result[0];
  }

  async createVote(vote: InsertVote): Promise<Vote> {
    const result = await db.insert(votes).values(vote).returning();
    return result[0];
  }

  async deleteVote(id: string): Promise<void> {
    await db.delete(votes).where(eq(votes.id, id));
  }

  // ============ CHAT ============
  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(limit);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }

  // ============ PROFILE & STATS ============
  async getMemesByUser(userId: string): Promise<Meme[]> {
    return await db.select().from(memes).where(eq(memes.userId, userId)).orderBy(desc(memes.createdAt));
  }

  async getClipsByUser(userId: string): Promise<Clip[]> {
    return await db.select().from(clips).where(eq(clips.userId, userId)).orderBy(desc(clips.createdAt));
  }

  async getVoteCountByUser(userId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(votes).where(eq(votes.userId, userId));
    return result[0]?.count || 0;
  }

  async getChatMessageCountByUser(userId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(chatMessages).where(eq(chatMessages.userId, userId));
    return result[0]?.count || 0;
  }

  async getUserProfile(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const userMemes = await this.getMemesByUser(userId);
    const userClips = await this.getClipsByUser(userId);
    const votesGiven = await this.getVoteCountByUser(userId);
    const messagesCount = await this.getChatMessageCountByUser(userId);
    const userStreak = await this.getUserStreak(userId);

    const totalUpvotes = userMemes.reduce((acc, m) => acc + m.upvotes, 0) + 
                         userClips.reduce((acc, c) => acc + c.upvotes, 0);

    return {
      id: user.id,
      username: user.discordUsername || user.username,
      avatar: user.discordAvatar,
      points: user.points,
      badges: user.badges || [],
      createdAt: user.createdAt,
      streak: userStreak ? {
        currentStreak: userStreak.currentStreak,
        longestStreak: userStreak.maxStreak,
        lastLoginDate: userStreak.lastLoginDate,
      } : null,
      stats: {
        memesCount: userMemes.length,
        clipsCount: userClips.length,
        totalUpvotes,
        tournamentsPlayed: 0,
        tournamentsWon: 0,
        votesGiven,
        messagesCount,
      },
      recentMemes: userMemes.slice(0, 4).map(m => ({
        id: m.id,
        title: m.title,
        imageUrl: m.imageUrl,
        upvotes: m.upvotes,
      })),
      recentClips: userClips.slice(0, 4).map(c => ({
        id: c.id,
        title: c.title,
        thumbnailUrl: c.thumbnailUrl,
        upvotes: c.upvotes,
      })),
    };
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.points)).limit(limit);
  }

  async addPoints(userId: string, points: number): Promise<void> {
    await db.update(users)
      .set({ points: sql`${users.points} + ${points}` })
      .where(eq(users.id, userId));
  }

  async addBadge(userId: string, badgeId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    const currentBadges = user.badges || [];
    if (!currentBadges.includes(badgeId)) {
      await db.update(users)
        .set({ badges: [...currentBadges, badgeId] })
        .where(eq(users.id, userId));
    }
  }

  // ============ CONTENT COMMENTS ============
  async getContentComments(contentType: string, contentId: string): Promise<ContentComment[]> {
    return await db.select().from(contentComments)
      .where(and(
        eq(contentComments.contentType, contentType),
        eq(contentComments.contentId, contentId)
      ))
      .orderBy(desc(contentComments.createdAt));
  }

  async getRecentComments(limit: number = 10): Promise<any[]> {
    const comments = await db.select().from(contentComments)
      .orderBy(desc(contentComments.createdAt))
      .limit(limit);
    
    const result = [];
    for (const comment of comments) {
      const user = await this.getUser(comment.userId);
      result.push({
        ...comment,
        user: user ? {
          id: user.id,
          username: user.discordUsername || user.username,
          avatar: user.discordAvatar,
        } : null,
      });
    }
    return result;
  }

  async createContentComment(comment: InsertContentComment): Promise<ContentComment> {
    const result = await db.insert(contentComments).values(comment).returning();
    return result[0];
  }

  async deleteContentComment(id: string): Promise<void> {
    await db.delete(contentComments).where(eq(contentComments.id, id));
  }

  // ============ COMMENT LIKES ============
  async getCommentLikesCount(commentId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(commentLikes).where(eq(commentLikes.commentId, commentId));
    return result[0]?.count || 0;
  }

  async hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    const result = await db.select().from(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
      .limit(1);
    return result.length > 0;
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<{ liked: boolean; count: number; isFirstLike: boolean }> {
    const existing = await db.select().from(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
      .limit(1);
    
    if (existing.length > 0) {
      await db.delete(commentLikes).where(eq(commentLikes.id, existing[0].id));
      const newCount = await this.getCommentLikesCount(commentId);
      return { liked: false, count: newCount, isFirstLike: false };
    } else {
      await db.insert(commentLikes).values({ userId, commentId });
      const newCount = await this.getCommentLikesCount(commentId);
      return { liked: true, count: newCount, isFirstLike: newCount === 1 };
    }
  }

  // ============ DAILY MISSIONS ============
  async getDailyMissions(userId: string): Promise<DailyMission[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.select().from(dailyMissions)
      .where(and(
        eq(dailyMissions.userId, userId),
        gte(dailyMissions.date, today),
        lt(dailyMissions.date, tomorrow)
      ));
  }

  async generateDailyMissions(userId: string): Promise<DailyMission[]> {
    const existing = await this.getDailyMissions(userId);
    if (existing.length > 0) return existing;

    const missionKeys = Object.keys(MISSION_TYPES) as MissionType[];
    const shuffled = missionKeys.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    const missions: DailyMission[] = [];
    for (const missionType of selected) {
      const missionDef = MISSION_TYPES[missionType];
      const result = await db.insert(dailyMissions).values({
        userId,
        missionType,
        target: missionDef.target,
        points: missionDef.points,
        date: new Date(),
      }).returning();
      missions.push(result[0]);
    }
    return missions;
  }

  async updateMissionProgress(userId: string, missionType: MissionType, increment: number = 1): Promise<DailyMission | null> {
    const missions = await this.getDailyMissions(userId);
    const mission = missions.find(m => m.missionType === missionType && !m.completed);
    if (!mission) return null;

    const newProgress = Math.min(mission.progress + increment, mission.target);
    const completed = newProgress >= mission.target;

    const result = await db.update(dailyMissions)
      .set({ progress: newProgress, completed })
      .where(eq(dailyMissions.id, mission.id))
      .returning();

    if (completed) {
      await this.addPoints(userId, mission.points);
    }

    return result[0];
  }

  async completeMission(missionId: string): Promise<DailyMission | undefined> {
    const result = await db.update(dailyMissions)
      .set({ completed: true })
      .where(eq(dailyMissions.id, missionId))
      .returning();
    return result[0];
  }

  // ============ USER STREAKS ============
  async getUserStreak(userId: string): Promise<UserStreak | undefined> {
    const result = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
    return result[0];
  }

  async updateLoginStreak(userId: string): Promise<{ streak: UserStreak; pointsEarned: number; newBadge?: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = await this.getUserStreak(userId);
    let pointsEarned = 0;
    let newBadge: string | undefined;

    if (!streak) {
      const result = await db.insert(userStreaks).values({
        userId,
        currentStreak: 1,
        maxStreak: 1,
        lastLoginDate: today,
      }).returning();
      streak = result[0];
      pointsEarned = 5;
      await this.addPoints(userId, pointsEarned);
      await this.addBadge(userId, "rookie");
      newBadge = "rookie";
    } else {
      const lastLogin = streak.lastLoginDate ? new Date(streak.lastLoginDate) : null;
      if (lastLogin) {
        lastLogin.setHours(0, 0, 0, 0);
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastLogin && lastLogin.getTime() === today.getTime()) {
        return { streak, pointsEarned: 0 };
      }

      let newStreak = 1;
      if (lastLogin && lastLogin.getTime() === yesterday.getTime()) {
        newStreak = streak.currentStreak + 1;
      }

      const newMax = Math.max(streak.maxStreak, newStreak);
      pointsEarned = 5 + Math.min(newStreak - 1, 10);

      const result = await db.update(userStreaks)
        .set({
          currentStreak: newStreak,
          maxStreak: newMax,
          lastLoginDate: today,
        })
        .where(eq(userStreaks.id, streak.id))
        .returning();
      streak = result[0];

      await this.addPoints(userId, pointsEarned);

      if (newStreak === 7) {
        await this.addBadge(userId, "streak_7");
        newBadge = "streak_7";
      } else if (newStreak === 30) {
        await this.addBadge(userId, "streak_30");
        newBadge = "streak_30";
      }
    }

    return { streak, pointsEarned, newBadge };
  }

  // ============ REPORTS ============
  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report).returning();
    return result[0];
  }

  async getReports(status?: string): Promise<Report[]> {
    if (status) {
      return await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt));
    }
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async updateReportStatus(id: string, status: string, reviewedBy: string): Promise<Report | undefined> {
    const result = await db.update(reports)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return result[0];
  }

  // ============ ADMIN LOGS ============
  async createAdminLog(log: InsertAdminLog): Promise<AdminLog> {
    const result = await db.insert(adminLogs).values(log).returning();
    return result[0];
  }

  async getAdminLogs(limit: number = 50): Promise<AdminLog[]> {
    return await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
  }

  // ============ AUDIT LOGS ============
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  // ============ CONTENT MODERATION ============
  async hideContent(contentType: string, contentId: string, adminId: string): Promise<void> {
    if (contentType === "meme") {
      await db.update(memes).set({ featured: false }).where(eq(memes.id, contentId));
    } else if (contentType === "clip") {
      await db.update(clips).set({ featured: false }).where(eq(clips.id, contentId));
    }
    await this.createAdminLog({
      adminId,
      action: "hide",
      targetType: contentType,
      targetId: contentId,
    });
  }

  async deleteContent(contentType: string, contentId: string, adminId: string): Promise<void> {
    if (contentType === "meme") {
      await db.delete(votes).where(and(eq(votes.contentType, "meme"), eq(votes.contentId, contentId)));
      await db.delete(contentComments).where(and(eq(contentComments.contentType, "meme"), eq(contentComments.contentId, contentId)));
      await db.delete(memes).where(eq(memes.id, contentId));
    } else if (contentType === "clip") {
      await db.delete(votes).where(and(eq(votes.contentType, "clip"), eq(votes.contentId, contentId)));
      await db.delete(contentComments).where(and(eq(contentComments.contentType, "clip"), eq(contentComments.contentId, contentId)));
      await db.delete(clips).where(eq(clips.id, contentId));
    } else if (contentType === "quote") {
      await db.delete(votes).where(and(eq(votes.contentType, "quote"), eq(votes.contentId, contentId)));
      await db.delete(quotes).where(eq(quotes.id, contentId));
    } else if (contentType === "comment") {
      await db.delete(commentLikes).where(eq(commentLikes.commentId, contentId));
      await db.delete(contentComments).where(eq(contentComments.id, contentId));
    }
    await this.createAdminLog({
      adminId,
      action: "delete",
      targetType: contentType,
      targetId: contentId,
    });
  }

  async deleteQuote(id: string): Promise<void> {
    await db.delete(votes).where(and(eq(votes.contentType, "quote"), eq(votes.contentId, id)));
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  async deleteMeme(id: string): Promise<void> {
    await db.delete(votes).where(and(eq(votes.contentType, "meme"), eq(votes.contentId, id)));
    await db.delete(contentComments).where(and(eq(contentComments.contentType, "meme"), eq(contentComments.contentId, id)));
    await db.delete(memes).where(eq(memes.id, id));
  }

  async deleteClip(id: string): Promise<void> {
    await db.delete(votes).where(and(eq(votes.contentType, "clip"), eq(votes.contentId, id)));
    await db.delete(contentComments).where(and(eq(contentComments.contentType, "clip"), eq(contentComments.contentId, id)));
    await db.delete(clips).where(eq(clips.id, id));
  }

  async searchUsers(query?: string): Promise<User[]> {
    if (!query) {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    }
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db.select().from(users)
      .where(or(
        sql`LOWER(${users.username}) LIKE ${searchTerm}`,
        sql`LOWER(${users.discordUsername}) LIKE ${searchTerm}`,
        sql`LOWER(${users.email}) LIKE ${searchTerm}`
      ))
      .orderBy(desc(users.createdAt));
  }

  // ============ INVITES ============
  async getInvites(): Promise<Invite[]> {
    const result = await db.select().from(invites).orderBy(desc(invites.createdAt));
    const enriched = await Promise.all(result.map(async (inv) => {
      const inviter = await this.getUser(inv.inviterUserId);
      const invited = inv.invitedUserId ? await this.getUser(inv.invitedUserId) : null;
      return { ...inv, inviter, invitedUser: invited };
    }));
    return enriched as any;
  }

  async confirmInvite(inviteId: string): Promise<Invite> {
    const result = await db.update(invites)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(invites.id, inviteId))
      .returning();
    return result[0];
  }

  async getUserInviteData(userId: string): Promise<{ inviteCode: string | null; invites: Invite[] }> {
    const user = await this.getUser(userId);
    const userInvites = await db.select().from(invites).where(eq(invites.inviterUserId, userId));
    return { inviteCode: user?.discordId || null, invites: userInvites };
  }

  // ============ RAFFLE ============
  async getRaffleDraws(): Promise<any[]> {
    const draws = await db.select().from(raffleDraws).orderBy(desc(raffleDraws.createdAt));
    const enriched = await Promise.all(draws.map(async (d) => {
      const tickets = await db.select().from(raffleTickets).where(eq(raffleTickets.drawId, d.id));
      const winners = await db.select().from(raffleWinners).where(eq(raffleWinners.drawId, d.id));
      const winner = winners[0] ? await this.getUser(winners[0].userId) : null;
      return { ...d, name: d.title, participantCount: tickets.length, winner, winnerId: winners[0]?.userId };
    }));
    return enriched;
  }

  async getActiveRaffleDraws(): Promise<RaffleDraw[]> {
    return await db.select().from(raffleDraws).where(eq(raffleDraws.status, "open"));
  }

  async createRaffleDraw(data: { name: string; prize: string; ticketCost?: number }): Promise<RaffleDraw> {
    const result = await db.insert(raffleDraws).values({
      title: data.name,
      description: data.prize,
      status: "open",
    }).returning();
    return result[0];
  }

  async closeRaffleDraw(drawId: string): Promise<RaffleDraw> {
    const result = await db.update(raffleDraws)
      .set({ status: "closed" })
      .where(eq(raffleDraws.id, drawId))
      .returning();
    return result[0];
  }

  async drawRaffleWinner(drawId: string): Promise<{ draw: RaffleDraw; winner: User | null }> {
    const tickets = await db.select().from(raffleTickets).where(eq(raffleTickets.drawId, drawId));
    if (tickets.length === 0) {
      const draw = await db.update(raffleDraws)
        .set({ status: "drawn" })
        .where(eq(raffleDraws.id, drawId))
        .returning();
      return { draw: draw[0], winner: null };
    }
    const weightedEntries: string[] = [];
    tickets.forEach(t => {
      for (let i = 0; i < t.amount; i++) weightedEntries.push(t.userId);
    });
    const winnerId = weightedEntries[Math.floor(Math.random() * weightedEntries.length)];
    const draw = await db.update(raffleDraws)
      .set({ status: "drawn" })
      .where(eq(raffleDraws.id, drawId))
      .returning();
    await db.insert(raffleWinners).values({
      drawId,
      userId: winnerId,
      prize: draw[0].description || "Premio",
    });
    const winner = await this.getUser(winnerId);
    return { draw: draw[0], winner: winner || null };
  }

  async getUserRaffleData(userId: string): Promise<{ tickets: number; entries: RaffleTicket[] }> {
    const ticketRows = await db.select().from(raffleTickets).where(eq(raffleTickets.userId, userId));
    const totalTickets = ticketRows.reduce((sum, t) => sum + t.amount, 0);
    return { tickets: totalTickets, entries: ticketRows };
  }

  async enterRaffle(userId: string, drawId: string, ticketCount: number): Promise<RaffleTicket> {
    const result = await db.insert(raffleTickets).values({
      userId,
      drawId,
      amount: ticketCount,
      source: "purchase",
    }).returning();
    return result[0];
  }

  // ============ POWER REWARDS ============
  async getPowerRewards(): Promise<PowerReward[]> {
    return await db.select().from(powerRewards).where(eq(powerRewards.isActive, true)).orderBy(powerRewards.costPoints);
  }

  async getPowerRewardRequests(): Promise<UserPowerReward[]> {
    const requests = await db.select().from(userPowerRewards).where(eq(userPowerRewards.status, "requested")).orderBy(desc(userPowerRewards.createdAt));
    const enriched = await Promise.all(requests.map(async (r) => {
      const user = await this.getUser(r.userId);
      const reward = await db.select().from(powerRewards).where(eq(powerRewards.id, r.rewardId)).limit(1);
      return { ...r, user, reward: reward[0] };
    }));
    return enriched as any;
  }

  async requestPowerReward(userId: string, rewardId: string): Promise<UserPowerReward> {
    const user = await this.getUser(userId);
    const reward = await db.select().from(powerRewards).where(eq(powerRewards.id, rewardId)).limit(1);
    if (!reward[0]) throw new Error("Reward non trovato");
    const cost = reward[0].costPoints || 0;
    if (!user || user.points < cost) throw new Error("Punti insufficienti");
    const result = await db.insert(userPowerRewards).values({ userId, rewardId }).returning();
    return result[0];
  }

  async approvePowerRewardRequest(requestId: string): Promise<UserPowerReward> {
    const req = await db.select().from(userPowerRewards).where(eq(userPowerRewards.id, requestId)).limit(1);
    if (!req[0]) throw new Error("Request non trovata");
    const reward = await db.select().from(powerRewards).where(eq(powerRewards.id, req[0].rewardId)).limit(1);
    if (reward[0] && reward[0].costPoints) {
      await db.update(users).set({ points: sql`${users.points} - ${reward[0].costPoints}` }).where(eq(users.id, req[0].userId));
    }
    const result = await db.update(userPowerRewards)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(eq(userPowerRewards.id, requestId))
      .returning();
    return result[0];
  }

  // ============ SOCIAL PROOFS ============
  async getSocialProofs(status?: string): Promise<SocialProof[]> {
    const query = status
      ? db.select().from(socialProofs).where(eq(socialProofs.status, status))
      : db.select().from(socialProofs);
    const proofs = await query.orderBy(desc(socialProofs.createdAt));
    const enriched = await Promise.all(proofs.map(async (p) => {
      const user = await this.getUser(p.userId);
      return { ...p, platform: p.missionType, user };
    }));
    return enriched as any;
  }

  async getUserSocialProofs(userId: string): Promise<SocialProof[]> {
    return await db.select().from(socialProofs).where(eq(socialProofs.userId, userId)).orderBy(desc(socialProofs.createdAt));
  }

  async createSocialProof(data: { userId: string; platform: string; proofUrl: string; note?: string }): Promise<SocialProof> {
    const result = await db.insert(socialProofs).values({
      userId: data.userId,
      missionType: data.platform,
      proofUrl: data.proofUrl,
      note: data.note,
    }).returning();
    return result[0];
  }

  async updateSocialProof(proofId: string, status: string, ticketsAwarded?: number): Promise<SocialProof> {
    const result = await db.update(socialProofs)
      .set({ status, reviewedAt: new Date() })
      .where(eq(socialProofs.id, proofId))
      .returning();
    return result[0];
  }

  // ============ MISSIONS ============
  async getActiveMissions(userId?: string): Promise<any[]> {
    const now = new Date().toISOString();
    const allMissions = await db.select().from(missions)
      .where(and(
        eq(missions.isActive, true),
        or(
          sql`${missions.startsAt} IS NULL`,
          sql`${missions.startsAt} <= ${now}`
        ),
        or(
          sql`${missions.endsAt} IS NULL`,
          sql`${missions.endsAt} > ${now}`
        )
      ))
      .orderBy(desc(missions.createdAt));
    
    if (!userId) return allMissions;
    
    const enriched = await Promise.all(allMissions.map(async (m) => {
      const progress = await db.select().from(userMissionProgress)
        .where(and(eq(userMissionProgress.userId, userId), eq(userMissionProgress.missionId, m.id)))
        .limit(1);
      const submission = await db.select().from(missionSubmissions)
        .where(and(eq(missionSubmissions.userId, userId), eq(missionSubmissions.missionId, m.id)))
        .orderBy(desc(missionSubmissions.createdAt))
        .limit(1);
      return {
        ...m,
        userProgress: progress[0] || { progress: 0, completedAt: null, claimedAt: null },
        pendingSubmission: submission[0]?.status === "pending" ? submission[0] : null,
      };
    }));
    return enriched;
  }

  async getDailyMissionsActive(userId?: string, limit: number = 3): Promise<any[]> {
    const now = new Date().toISOString();
    const dailyMissionsResult = await db.select().from(missions)
      .where(and(
        eq(missions.isActive, true),
        eq(missions.scope, "daily"),
        or(sql`${missions.startsAt} IS NULL`, sql`${missions.startsAt} <= ${now}`),
        or(sql`${missions.endsAt} IS NULL`, sql`${missions.endsAt} > ${now}`)
      ))
      .limit(limit);
    
    if (!userId) return dailyMissionsResult;
    
    const enriched = await Promise.all(dailyMissionsResult.map(async (m) => {
      const progress = await db.select().from(userMissionProgress)
        .where(and(eq(userMissionProgress.userId, userId), eq(userMissionProgress.missionId, m.id)))
        .limit(1);
      const submission = await db.select().from(missionSubmissions)
        .where(and(eq(missionSubmissions.userId, userId), eq(missionSubmissions.missionId, m.id)))
        .orderBy(desc(missionSubmissions.createdAt))
        .limit(1);
      return {
        ...m,
        userProgress: progress[0] || { progress: 0, completedAt: null, claimedAt: null },
        pendingSubmission: submission[0]?.status === "pending" ? submission[0] : null,
      };
    }));
    return enriched;
  }

  async getUserMissions(userId: string): Promise<any[]> {
    const allProgress = await db.select().from(userMissionProgress).where(eq(userMissionProgress.userId, userId));
    const missionIds = allProgress.map(p => p.missionId);
    if (missionIds.length === 0) return [];
    
    const result = await Promise.all(missionIds.map(async (mId) => {
      const mission = await db.select().from(missions).where(eq(missions.id, mId)).limit(1);
      const progress = allProgress.find(p => p.missionId === mId);
      return { ...mission[0], userProgress: progress };
    }));
    return result.filter(m => m.title);
  }

  async getMission(id: string): Promise<Mission | undefined> {
    const result = await db.select().from(missions).where(eq(missions.id, id)).limit(1);
    return result[0];
  }

  async createMission(data: InsertMission): Promise<Mission> {
    const result = await db.insert(missions).values(data).returning();
    return result[0];
  }

  async updateMission(id: string, updates: Partial<Mission>): Promise<Mission | undefined> {
    const result = await db.update(missions).set(updates).where(eq(missions.id, id)).returning();
    return result[0];
  }

  async getAllMissions(): Promise<Mission[]> {
    return await db.select().from(missions).orderBy(desc(missions.createdAt));
  }

  // ============ USER MISSION PROGRESS ============
  async getUserMissionProgress(userId: string, missionId: string): Promise<UserMissionProgress | undefined> {
    const result = await db.select().from(userMissionProgress)
      .where(and(eq(userMissionProgress.userId, userId), eq(userMissionProgress.missionId, missionId)))
      .limit(1);
    return result[0];
  }

  async incrementMissionProgress(userId: string, actionKey: string, amount: number = 1): Promise<void> {
    const activeMissions = await db.select().from(missions)
      .where(and(eq(missions.isActive, true), eq(missions.actionKey, actionKey)));
    
    for (const mission of activeMissions) {
      let progress = await this.getUserMissionProgress(userId, mission.id);
      if (!progress) {
        const created = await db.insert(userMissionProgress)
          .values({ userId, missionId: mission.id, progress: 0 })
          .returning();
        progress = created[0];
      }
      if (progress.completedAt) continue;
      
      const newProgress = Math.min(progress.progress + amount, mission.targetValue);
      const updates: any = { progress: newProgress };
      if (newProgress >= mission.targetValue) {
        updates.completedAt = new Date();
      }
      await db.update(userMissionProgress)
        .set(updates)
        .where(eq(userMissionProgress.id, progress.id));
    }
  }

  async claimMissionReward(userId: string, missionId: string): Promise<{ success: boolean; reward?: { type: string; value: number } }> {
    const progress = await this.getUserMissionProgress(userId, missionId);
    if (!progress || !progress.completedAt || progress.claimedAt) {
      return { success: false };
    }
    const mission = await this.getMission(missionId);
    if (!mission) return { success: false };
    
    await db.update(userMissionProgress)
      .set({ claimedAt: new Date() })
      .where(eq(userMissionProgress.id, progress.id));
    
    if (mission.rewardType === "points") {
      await db.update(users).set({ points: sql`${users.points} + ${mission.rewardValue}` }).where(eq(users.id, userId));
    } else if (mission.rewardType === "tickets") {
      await db.insert(raffleTickets).values({
        userId,
        drawId: (await this.getActiveRaffleDraws())[0]?.id || "",
        amount: mission.rewardValue,
        source: "mission",
      }).catch(() => {});
    } else if (mission.rewardType === "walletCents") {
      const wallet = await db.select().from(require("@shared/schema").rewardsWallet).where(eq(require("@shared/schema").rewardsWallet.userId, userId)).limit(1);
      if (wallet[0]) {
        await db.update(require("@shared/schema").rewardsWallet).set({ balanceCents: sql`balance_cents + ${mission.rewardValue}` }).where(eq(require("@shared/schema").rewardsWallet.userId, userId));
      }
    }
    
    await this.createAuditLog({
      entityType: "mission",
      entityId: missionId,
      action: "claim",
      actorUserId: userId,
      payload: JSON.stringify({ rewardType: mission.rewardType, rewardValue: mission.rewardValue }),
    });
    
    return { success: true, reward: { type: mission.rewardType, value: mission.rewardValue } };
  }

  // ============ MISSION SUBMISSIONS ============
  async createMissionSubmission(data: InsertMissionSubmission): Promise<MissionSubmission> {
    const result = await db.insert(missionSubmissions).values(data).returning();
    return result[0];
  }

  async getMissionSubmissions(status?: string): Promise<any[]> {
    const query = status
      ? db.select().from(missionSubmissions).where(eq(missionSubmissions.status, status))
      : db.select().from(missionSubmissions);
    const subs = await query.orderBy(desc(missionSubmissions.createdAt));
    
    const enriched = await Promise.all(subs.map(async (s) => {
      const user = await this.getUser(s.userId);
      const mission = await this.getMission(s.missionId);
      return { ...s, user, mission };
    }));
    return enriched;
  }

  async approveMissionSubmission(submissionId: string, reviewerId: string): Promise<MissionSubmission> {
    const sub = await db.select().from(missionSubmissions).where(eq(missionSubmissions.id, submissionId)).limit(1);
    if (!sub[0]) throw new Error("Submission non trovata");
    
    const mission = await this.getMission(sub[0].missionId);
    if (!mission) throw new Error("Missione non trovata");
    
    await db.update(missionSubmissions)
      .set({ status: "approved", reviewedByUserId: reviewerId, reviewedAt: new Date() })
      .where(eq(missionSubmissions.id, submissionId));
    
    let progress = await this.getUserMissionProgress(sub[0].userId, sub[0].missionId);
    if (!progress) {
      const created = await db.insert(userMissionProgress)
        .values({ userId: sub[0].userId, missionId: sub[0].missionId, progress: 0 })
        .returning();
      progress = created[0];
    }
    
    await db.update(userMissionProgress)
      .set({ progress: mission.targetValue, completedAt: new Date() })
      .where(eq(userMissionProgress.id, progress.id));
    
    await this.createAuditLog({
      entityType: "mission_submission",
      entityId: submissionId,
      action: "approve",
      actorUserId: reviewerId,
      payload: JSON.stringify({ userId: sub[0].userId, missionId: sub[0].missionId }),
    });
    
    const result = await db.select().from(missionSubmissions).where(eq(missionSubmissions.id, submissionId)).limit(1);
    return result[0];
  }

  async rejectMissionSubmission(submissionId: string, reviewerId: string, reason?: string): Promise<MissionSubmission> {
    const result = await db.update(missionSubmissions)
      .set({ status: "rejected", reviewedByUserId: reviewerId, reviewedAt: new Date(), rejectReason: reason })
      .where(eq(missionSubmissions.id, submissionId))
      .returning();
    
    await this.createAuditLog({
      entityType: "mission_submission",
      entityId: submissionId,
      action: "reject",
      actorUserId: reviewerId,
      payload: JSON.stringify({ reason }),
    });
    
    return result[0];
  }

  async seedDefaultMissions(): Promise<Mission[]> {
    const discordInviteUrl = process.env.DISCORD_PUBLIC_INVITE_URL || "https://discord.gg/itsme";
    const discordVcLink = process.env.DISCORD_VC_LINK || "https://discord.gg/itsme";
    
    const defaultMissions: InsertMission[] = [
      {
        scope: "daily",
        title: "Condividi il link Discord",
        description: "Condividi il link del server Discord in una storia o post social",
        type: "proof",
        actionKey: "discord_share",
        targetValue: 1,
        rewardType: "tickets",
        rewardValue: 2,
        linkUrl: discordInviteUrl,
        isActive: true,
      },
      {
        scope: "daily",
        title: "Invita 3 amici sul Discord",
        description: "Porta 3 nuovi membri nel server Discord (screenshot richiesto)",
        type: "proof",
        actionKey: "discord_invite",
        targetValue: 1,
        rewardType: "tickets",
        rewardValue: 3,
        linkUrl: discordInviteUrl,
        isActive: true,
      },
      {
        scope: "daily",
        title: "Entra nella VC torneo",
        description: "Partecipa alla voice chat durante il torneo (screenshot)",
        type: "proof",
        actionKey: "vc_time",
        targetValue: 1,
        rewardType: "tickets",
        rewardValue: 2,
        linkUrl: discordVcLink,
        isActive: true,
      },
      {
        scope: "daily",
        title: "Fai il Check-in",
        description: "Completa il check-in per un torneo",
        type: "auto",
        actionKey: "checkin",
        targetValue: 1,
        rewardType: "points",
        rewardValue: 5,
        isActive: true,
      },
      {
        scope: "daily",
        title: "Vinci un match",
        description: "Vinci almeno un match nel torneo",
        type: "auto",
        actionKey: "match_win",
        targetValue: 1,
        rewardType: "points",
        rewardValue: 10,
        isActive: true,
      },
      {
        scope: "daily",
        title: "Vota nella community",
        description: "Vota almeno un meme o clip nella community",
        type: "auto",
        actionKey: "community_vote",
        targetValue: 1,
        rewardType: "points",
        rewardValue: 2,
        isActive: true,
      },
    ];
    
    const created: Mission[] = [];
    for (const m of defaultMissions) {
      const existing = await db.select().from(missions).where(eq(missions.actionKey, m.actionKey)).limit(1);
      if (!existing[0]) {
        const result = await db.insert(missions).values(m).returning();
        created.push(result[0]);
      }
    }
    return created;
  }

  // ============ BADGE CATALOG ============
  async getAllBadgeCatalog(): Promise<BadgeCatalog[]> {
    return await db.select().from(badgeCatalog).orderBy(badgeCatalog.createdAt);
  }

  async getBadgeCatalogById(id: string): Promise<BadgeCatalog | undefined> {
    const result = await db.select().from(badgeCatalog).where(eq(badgeCatalog.id, id)).limit(1);
    return result[0];
  }

  async getBadgeCatalogByName(name: string): Promise<BadgeCatalog | undefined> {
    const result = await db.select().from(badgeCatalog).where(eq(badgeCatalog.name, name)).limit(1);
    return result[0];
  }

  async createBadgeCatalog(badge: InsertBadgeCatalog): Promise<BadgeCatalog> {
    const result = await db.insert(badgeCatalog).values(badge).returning();
    return result[0];
  }

  async updateBadgeCatalog(id: string, updates: Partial<BadgeCatalog>): Promise<BadgeCatalog | undefined> {
    const result = await db.update(badgeCatalog).set(updates).where(eq(badgeCatalog.id, id)).returning();
    return result[0];
  }

  async deleteBadgeCatalog(id: string): Promise<void> {
    await db.delete(userBadges).where(eq(userBadges.badgeId, id));
    await db.delete(badgeCatalog).where(eq(badgeCatalog.id, id));
  }

  // ============ USER BADGES ============
  async getUserBadges(userId: string): Promise<(UserBadge & { badge: BadgeCatalog })[]> {
    const results = await db
      .select({
        id: userBadges.id,
        userId: userBadges.userId,
        badgeId: userBadges.badgeId,
        awardedAt: userBadges.awardedAt,
        awardedBy: userBadges.awardedBy,
        badge: badgeCatalog,
      })
      .from(userBadges)
      .innerJoin(badgeCatalog, eq(userBadges.badgeId, badgeCatalog.id))
      .where(eq(userBadges.userId, userId));
    return results;
  }

  async awardBadgeToUser(userId: string, badgeId: string, awardedBy?: string): Promise<UserBadge> {
    const existing = await db.select().from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
      .limit(1);
    if (existing[0]) {
      return existing[0];
    }
    const result = await db.insert(userBadges).values({
      userId,
      badgeId,
      awardedBy: awardedBy || null,
    }).returning();
    return result[0];
  }

  async revokeBadgeFromUser(userId: string, badgeId: string): Promise<void> {
    await db.delete(userBadges).where(
      and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId))
    );
  }

  async hasUserBadge(userId: string, badgeId: string): Promise<boolean> {
    const result = await db.select().from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
      .limit(1);
    return result.length > 0;
  }

  async seedDefaultBadgeCatalog(): Promise<BadgeCatalog[]> {
    const defaultBadges: InsertBadgeCatalog[] = [
      { name: "rookie", displayName: "Nuovo Arrivato", description: "Benvenuto nella community", icon: "Sprout", rarity: "common", autoUnlock: true, unlockCondition: "account_created" },
      { name: "first_meme", displayName: "Primo Meme", description: "Hai caricato il tuo primo meme", icon: "Palette", rarity: "common", autoUnlock: true, unlockCondition: "memes >= 1" },
      { name: "meme_master", displayName: "Meme Master", description: "10+ meme caricati", icon: "Crown", rarity: "rare", autoUnlock: true, unlockCondition: "memes >= 10" },
      { name: "first_clip", displayName: "Prima Clip", description: "Hai caricato la tua prima clip", icon: "Clapperboard", rarity: "common", autoUnlock: true, unlockCondition: "clips >= 1" },
      { name: "clip_master", displayName: "Clip Master", description: "10+ clip caricate", icon: "Trophy", rarity: "rare", autoUnlock: true, unlockCondition: "clips >= 10" },
      { name: "voter", displayName: "Votante Attivo", description: "50+ voti effettuati", icon: "Star", rarity: "common", autoUnlock: true, unlockCondition: "votes >= 50" },
      { name: "chat_active", displayName: "Chiacchierone", description: "100+ messaggi in chat", icon: "MessageCircle", rarity: "common", autoUnlock: true, unlockCondition: "messages >= 100" },
      { name: "veteran", displayName: "Veterano", description: "Membro da oltre 6 mesi", icon: "Shield", rarity: "rare", autoUnlock: true, unlockCondition: "account_age >= 180" },
      { name: "champion", displayName: "Campione", description: "Hai vinto un torneo", icon: "Medal", rarity: "legendary", autoUnlock: true, unlockCondition: "tournaments_won >= 1" },
      { name: "content_creator", displayName: "Content Creator", description: "Creatore di contenuti verificato", icon: "Video", rarity: "epic", autoUnlock: false },
      { name: "supporter", displayName: "Supporter", description: "Sostenitore della community", icon: "Heart", rarity: "epic", autoUnlock: false },
    ];

    const created: BadgeCatalog[] = [];
    for (const badge of defaultBadges) {
      const existing = await this.getBadgeCatalogByName(badge.name);
      if (!existing) {
        const result = await this.createBadgeCatalog(badge);
        created.push(result);
      }
    }
    return created;
  }
}

export const storage = new Storage();
