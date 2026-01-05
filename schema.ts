import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ TOURNAMENTS ============

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  maxTeams: integer("max_teams").notNull().default(16),
  teamSize: integer("team_size").notNull().default(2), // 1=1v1, 2=2v2, 3=3v3, 5=5v5
  format: text("format").notNull().default("2v2"), // "1v1", "2v2", "3v3", "5v5", "custom"
  registrationOpen: boolean("registration_open").notNull().default(true),
  checkInOpen: boolean("check_in_open").notNull().default(false),
  streamDelay: integer("stream_delay").notNull().default(180),
  bracketSize: integer("bracket_size").notNull().default(16),
  rules: text("rules").default(""),
  rulesMd: text("rules_md"),
  prizesMd: text("prizes_md"),
  prizePool: integer("prize_pool").default(0),
  status: text("status").notNull().default("upcoming"), // draft, upcoming, registration, checkin, live, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTournamentSchema = createInsertSchema(tournaments, {
  date: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// ============ TEAMS ============

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  name: text("name").notNull(),
  captainUserId: varchar("captain_user_id").references(() => users.id),
  captainName: text("captain_name").notNull(),
  captainRank: text("captain_rank").notNull(),
  duoName: text("duo_name").notNull().default(""),
  duoRank: text("duo_rank").notNull().default(""),
  discordId: text("discord_id").notNull(),
  email: text("email").notNull(),
  checkInCode: text("check_in_code").notNull(),
  isCheckedIn: boolean("is_checked_in").notNull().default(false),
  status: text("status").notNull().default("pending"),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  checkInCode: true,
  isCheckedIn: true,
  status: true,
  registeredAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// ============ TEAM MEMBERS ============

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // captain, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// ============ MATCHES ============

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  round: integer("round").notNull(),
  bracketPos: integer("bracket_pos"),
  team1Id: varchar("team1_id"),
  team2Id: varchar("team2_id"),
  score1: integer("score1"),
  score2: integer("score2"),
  winnerId: varchar("winner_id"),
  status: text("status").notNull().default("pending"), // pending, ready, live, reported, disputed, resolved
  reportedBy: varchar("reported_by"),
  reportedAt: timestamp("reported_at"),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// ============ DISPUTES ============

export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  openedBy: varchar("opened_by").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  status: text("status").notNull().default("open"), // open, reviewing, closed
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  status: true,
  resolution: true,
  resolvedBy: true,
  createdAt: true,
  closedAt: true,
});

export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

// ============ ANNOUNCEMENTS ============

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("news"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// ============ USERS (Discord Auth) ============

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discordId: text("discord_id").unique(),
  discordUsername: text("discord_username"),
  discordAvatar: text("discord_avatar"),
  username: text("username").notNull().unique(),
  email: text("email"),
  role: text("role").notNull().default("user"),
  points: integer("points").notNull().default(0),
  badges: text("badges").array().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("active"),
  bannedUntil: timestamp("banned_until"),
  banReason: text("ban_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  points: true,
  badges: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ MEMES ============

export const memes = pgTable("memes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemeSchema = createInsertSchema(memes).omit({
  id: true,
  upvotes: true,
  downvotes: true,
  featured: true,
  createdAt: true,
});

export type InsertMeme = z.infer<typeof insertMemeSchema>;
export type Meme = typeof memes.$inferSelect;

// ============ CLIPS ============

export const clips = pgTable("clips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  category: text("category").notNull().default("highlight"),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClipSchema = createInsertSchema(clips).omit({
  id: true,
  upvotes: true,
  downvotes: true,
  featured: true,
  createdAt: true,
});

export type InsertClip = z.infer<typeof insertClipSchema>;
export type Clip = typeof clips.$inferSelect;

// ============ QUOTES ============

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  author: text("author").notNull(),
  context: text("context"),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  upvotes: true,
  downvotes: true,
  featured: true,
  createdAt: true,
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// ============ VOTES ============

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(),
  contentId: varchar("content_id").notNull(),
  voteType: text("vote_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

// ============ CHAT MESSAGES ============

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ============ CONTENT COMMENTS ============

export const contentComments = pgTable("content_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(), // 'meme' or 'clip'
  contentId: varchar("content_id").notNull(),
  parentId: varchar("parent_id"), // for replies
  content: text("content").notNull(),
  mediaUrl: text("media_url"), // URL of the image/GIF
  mediaType: text("media_type"), // 'image' or 'gif'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentCommentSchema = createInsertSchema(contentComments).omit({
  id: true,
  createdAt: true,
});

export type InsertContentComment = z.infer<typeof insertContentCommentSchema>;
export type ContentComment = typeof contentComments.$inferSelect;

// ============ COMMENT LIKES ============

export const commentLikes = pgTable("comment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  commentId: varchar("comment_id").notNull().references(() => contentComments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentLikeSchema = createInsertSchema(commentLikes).omit({
  id: true,
  createdAt: true,
});

export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;
export type CommentLike = typeof commentLikes.$inferSelect;

// ============ DAILY MISSIONS ============

export const dailyMissions = pgTable("daily_missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  missionType: text("mission_type").notNull(),
  progress: integer("progress").notNull().default(0),
  target: integer("target").notNull().default(1),
  completed: boolean("completed").notNull().default(false),
  points: integer("points").notNull().default(10),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertDailyMissionSchema = createInsertSchema(dailyMissions).omit({
  id: true,
  progress: true,
  completed: true,
});

export type InsertDailyMission = z.infer<typeof insertDailyMissionSchema>;
export type DailyMission = typeof dailyMissions.$inferSelect;

// ============ USER STREAKS ============

export const userStreaks = pgTable("user_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  lastLoginDate: timestamp("last_login_date"),
});

export const insertUserStreakSchema = createInsertSchema(userStreaks).omit({
  id: true,
});

export type InsertUserStreak = z.infer<typeof insertUserStreakSchema>;
export type UserStreak = typeof userStreaks.$inferSelect;

// ============ REPORTS ============

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(),
  contentId: varchar("content_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// ============ ADMIN LOGS ============

export const adminLogs = pgTable("admin_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;

// ============ MISSION TYPES ============

export const MISSION_TYPES = {
  vote_content: { id: "vote_content", name: "Vota contenuti", icon: "👍", target: 3, points: 10, description: "Vota 3 meme o clip" },
  post_comment: { id: "post_comment", name: "Commenta", icon: "💬", target: 2, points: 15, description: "Scrivi 2 commenti" },
  upload_meme: { id: "upload_meme", name: "Carica meme", icon: "🎨", target: 1, points: 20, description: "Carica un meme" },
  upload_clip: { id: "upload_clip", name: "Carica clip", icon: "🎬", target: 1, points: 20, description: "Carica una clip" },
  daily_login: { id: "daily_login", name: "Accesso giornaliero", icon: "🔥", target: 1, points: 5, description: "Accedi oggi" },
  view_tournament: { id: "view_tournament", name: "Esplora tornei", icon: "🏆", target: 1, points: 5, description: "Visualizza un torneo" },
} as const;

export type MissionType = keyof typeof MISSION_TYPES;

// ============ BADGE DEFINITIONS ============

export const BADGES = {
  first_meme: { id: "first_meme", name: "Primo Meme", icon: "🎨", description: "Hai caricato il tuo primo meme" },
  first_clip: { id: "first_clip", name: "Prima Clip", icon: "🎬", description: "Hai caricato la tua prima clip" },
  meme_master: { id: "meme_master", name: "Meme Master", icon: "👑", description: "10+ meme caricati" },
  clip_master: { id: "clip_master", name: "Clip Master", icon: "🏆", description: "10+ clip caricate" },
  voter: { id: "voter", name: "Votante Attivo", icon: "⭐", description: "50+ voti effettuati" },
  tournament_player: { id: "tournament_player", name: "Giocatore", icon: "🎮", description: "Partecipato a un torneo" },
  tournament_winner: { id: "tournament_winner", name: "Campione", icon: "🥇", description: "Vinto un torneo" },
  featured_content: { id: "featured_content", name: "In Evidenza", icon: "✨", description: "Contenuto in evidenza" },
  early_supporter: { id: "early_supporter", name: "Early Supporter", icon: "💎", description: "Tra i primi 100 utenti" },
  chat_active: { id: "chat_active", name: "Chiacchierone", icon: "💬", description: "100+ messaggi in chat" },
  streak_7: { id: "streak_7", name: "Streak 7 Giorni", icon: "🔥", description: "7 giorni di accesso consecutivo" },
  streak_30: { id: "streak_30", name: "Streak 30 Giorni", icon: "🌟", description: "30 giorni di accesso consecutivo" },
  rookie: { id: "rookie", name: "Nuovo Arrivato", icon: "🌱", description: "Benvenuto nella community" },
} as const;

export type BadgeId = keyof typeof BADGES;

// ============ BADGE CATALOG ============

export const badgeCatalog = pgTable("badge_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  rarity: text("rarity").notNull().default("common"),
  autoUnlock: boolean("auto_unlock").notNull().default(false),
  unlockCondition: text("unlock_condition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBadgeCatalogSchema = createInsertSchema(badgeCatalog).omit({
  id: true,
  createdAt: true,
});

export type InsertBadgeCatalog = z.infer<typeof insertBadgeCatalogSchema>;
export type BadgeCatalog = typeof badgeCatalog.$inferSelect;

// ============ USER BADGES (Junction Table) ============

export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: varchar("badge_id").notNull().references(() => badgeCatalog.id),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
  awardedBy: varchar("awarded_by").references(() => users.id),
}, (table) => ({
  userBadgeUnique: unique().on(table.userId, table.badgeId),
}));

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  awardedAt: true,
});

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// ============ AUDIT LOGS ============

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  payload: text("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============ INVITE CODES ============

export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
  code: text("code").notNull().unique(),
  discordInviteCode: text("discord_invite_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;

// ============ INVITE EVENTS ============

export const inviteEvents = pgTable("invite_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviteCodeId: varchar("invite_code_id").notNull().references(() => inviteCodes.id),
  invitedDiscordUserId: text("invited_discord_user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  eligibleAt: timestamp("eligible_at"),
  status: text("status").notNull().default("pending"), // pending, eligible, confirmed, invalid
  invalidReason: text("invalid_reason"),
  confirmedByUserId: varchar("confirmed_by_user_id").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertInviteEventSchema = createInsertSchema(inviteEvents).omit({
  id: true,
  eligibleAt: true,
  status: true,
  invalidReason: true,
  confirmedByUserId: true,
  confirmedAt: true,
});

export type InsertInviteEvent = z.infer<typeof insertInviteEventSchema>;
export type InviteEvent = typeof inviteEvents.$inferSelect;

// ============ REWARDS WALLET ============

export const rewardsWallet = pgTable("rewards_wallet", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  balanceCents: integer("balance_cents").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RewardsWallet = typeof rewardsWallet.$inferSelect;

// ============ REWARD CLAIMS ============

export const rewardClaims = pgTable("reward_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // invite_tier, mission, raffle, etc.
  amountCents: integer("amount_cents").notNull().default(0),
  status: text("status").notNull().default("available"), // available, requested, approved, rejected, paid
  meta: text("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRewardClaimSchema = createInsertSchema(rewardClaims).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRewardClaim = z.infer<typeof insertRewardClaimSchema>;
export type RewardClaim = typeof rewardClaims.$inferSelect;

// ============ PAYOUT REQUESTS ============

export const payoutRequests = pgTable("payout_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  method: text("method").notNull(), // paypal, crypto, vp, etc.
  detailsMasked: text("details_masked"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, paid
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({
  id: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
});

export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;

// ============ MISSIONS ============

export const missions = pgTable("missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scope: text("scope").notNull().default("daily"), // daily, event
  tournamentId: varchar("tournament_id").references(() => tournaments.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("auto"), // auto, proof
  actionKey: text("action_key").notNull(), // discord_share, discord_invite, vc_time, checkin, match_win, community_vote, comment
  targetValue: integer("target_value").notNull().default(1),
  rewardType: text("reward_type").notNull().default("points"), // tickets, points, walletCents, powerKey
  rewardValue: integer("reward_value").notNull().default(10),
  linkUrl: text("link_url"),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMissionSchema = createInsertSchema(missions).omit({
  id: true,
  createdAt: true,
});

export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;

// ============ USER MISSION PROGRESS ============

export const userMissionProgress = pgTable("user_mission_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  missionId: varchar("mission_id").notNull().references(() => missions.id),
  progress: integer("progress").notNull().default(0),
  completedAt: timestamp("completed_at"),
  claimedAt: timestamp("claimed_at"),
});

export const insertUserMissionProgressSchema = createInsertSchema(userMissionProgress).omit({
  id: true,
  completedAt: true,
  claimedAt: true,
});

export type InsertUserMissionProgress = z.infer<typeof insertUserMissionProgressSchema>;
export type UserMissionProgress = typeof userMissionProgress.$inferSelect;

// ============ MISSION SUBMISSIONS ============

export const missionSubmissions = pgTable("mission_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  missionId: varchar("mission_id").notNull().references(() => missions.id),
  proofUrl: text("proof_url").notNull(),
  note: text("note"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectReason: text("reject_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMissionSubmissionSchema = createInsertSchema(missionSubmissions).omit({
  id: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  rejectReason: true,
  createdAt: true,
});

export type InsertMissionSubmission = z.infer<typeof insertMissionSubmissionSchema>;
export type MissionSubmission = typeof missionSubmissions.$inferSelect;

// ============ EVENT MISSIONS (Legacy - kept for compatibility) ============

export const eventMissions = pgTable("event_missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").references(() => tournaments.id),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  rewardType: text("reward_type").notNull().default("points"),
  rewardValue: integer("reward_value").notNull().default(10),
  target: integer("target").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventMissionSchema = createInsertSchema(eventMissions).omit({
  id: true,
  createdAt: true,
});

export type InsertEventMission = z.infer<typeof insertEventMissionSchema>;
export type EventMission = typeof eventMissions.$inferSelect;

// ============ RAFFLE DRAWS ============

export const raffleDraws = pgTable("raffle_draws", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").references(() => tournaments.id),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").notNull().default("open"), // open, closed, drawn
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRaffleDrawSchema = createInsertSchema(raffleDraws).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type InsertRaffleDraw = z.infer<typeof insertRaffleDrawSchema>;
export type RaffleDraw = typeof raffleDraws.$inferSelect;

// ============ RAFFLE TICKETS ============

export const raffleTickets = pgTable("raffle_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drawId: varchar("draw_id").notNull().references(() => raffleDraws.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull().default(1),
  source: text("source").notNull(), // invite, highlight, match_win, social_proof, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRaffleTicketSchema = createInsertSchema(raffleTickets).omit({
  id: true,
  createdAt: true,
});

export type InsertRaffleTicket = z.infer<typeof insertRaffleTicketSchema>;
export type RaffleTicket = typeof raffleTickets.$inferSelect;

// ============ RAFFLE WINNERS ============

export const raffleWinners = pgTable("raffle_winners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drawId: varchar("draw_id").notNull().references(() => raffleDraws.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  prize: text("prize").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRaffleWinnerSchema = createInsertSchema(raffleWinners).omit({
  id: true,
  createdAt: true,
});

export type InsertRaffleWinner = z.infer<typeof insertRaffleWinnerSchema>;
export type RaffleWinner = typeof raffleWinners.$inferSelect;

// ============ POWER REWARDS ============

export const powerRewards = pgTable("power_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  costTickets: integer("cost_tickets"),
  costPoints: integer("cost_points"),
  discordRoleId: text("discord_role_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPowerRewardSchema = createInsertSchema(powerRewards).omit({
  id: true,
  createdAt: true,
});

export type InsertPowerReward = z.infer<typeof insertPowerRewardSchema>;
export type PowerReward = typeof powerRewards.$inferSelect;

// ============ USER POWER REWARDS ============

export const userPowerRewards = pgTable("user_power_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  rewardId: varchar("reward_id").notNull().references(() => powerRewards.id),
  status: text("status").notNull().default("requested"), // requested, approved, granted, rejected
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserPowerRewardSchema = createInsertSchema(userPowerRewards).omit({
  id: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
});

export type InsertUserPowerReward = z.infer<typeof insertUserPowerRewardSchema>;
export type UserPowerReward = typeof userPowerRewards.$inferSelect;

// ============ SOCIAL PROOFS ============

export const socialProofs = pgTable("social_proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  missionType: text("mission_type").notNull(),
  proofUrl: text("proof_url").notNull(),
  note: text("note"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSocialProofSchema = createInsertSchema(socialProofs).omit({
  id: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
});

export type InsertSocialProof = z.infer<typeof insertSocialProofSchema>;
export type SocialProof = typeof socialProofs.$inferSelect;

// ============ INVITES ============

export const invites = pgTable("invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviterUserId: varchar("inviter_user_id").notNull().references(() => users.id),
  invitedDiscordId: text("invited_discord_id").notNull(),
  invitedUserId: varchar("invited_user_id").references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, eligible, confirmed
  joinedAt: timestamp("joined_at"),
  eligibleAt: timestamp("eligible_at"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true,
  status: true,
  joinedAt: true,
  eligibleAt: true,
  confirmedAt: true,
  createdAt: true,
});

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;

// ============ INVITE TIERS CONFIG ============

export const INVITE_TIERS = {
  tier1: { threshold: 10, reward: "badge", description: "Badge Inviter + Ruolo Discord" },
  tier2: { threshold: 25, reward: "tickets", ticketAmount: 10, description: "10 Raffle Tickets" },
  tier3: { threshold: 50, reward: "wallet", walletCents: 500, description: "5€ Wallet o VP equivalenti" },
  tier4: { threshold: 100, reward: "wallet", walletCents: 1000, description: "10€ Wallet (review admin)" },
} as const;
