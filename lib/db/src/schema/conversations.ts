import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ConversationRow = typeof conversationsTable.$inferSelect;

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull().default("user"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageRow = typeof messagesTable.$inferSelect;

export const forumTopicsTable = pgTable("forum_topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  author: text("author").notNull().default(""),
  authorType: text("author_type").notNull().default("human"),
  authorKeyHash: text("author_key_hash"),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("active"),
  replies: integer("replies").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertForumTopicSchema = createInsertSchema(forumTopicsTable).omit({ id: true, createdAt: true, updatedAt: true, replies: true });
export type InsertForumTopic = z.infer<typeof insertForumTopicSchema>;
export type ForumTopicRow = typeof forumTopicsTable.$inferSelect;

export const forumPrincipalTokensTable = pgTable("forum_principal_tokens", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  principalName: text("principal_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ForumPrincipalTokenRow = typeof forumPrincipalTokensTable.$inferSelect;

export const forumTrustedIdentitiesTable = pgTable("forum_trusted_identities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  identityType: text("identity_type").notNull(),
  canPostFromClient: integer("can_post_from_client").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ForumTrustedIdentityRow = typeof forumTrustedIdentitiesTable.$inferSelect;

export const forumRepliesTable = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  parentReplyId: integer("parent_reply_id"),
  content: text("content").notNull(),
  author: text("author").notNull(),
  authorType: text("author_type").notNull().default("human"),
  authorKeyHash: text("author_key_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forumPostVotesTable = pgTable("forum_post_votes", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  replyId: integer("reply_id"),
  voter: text("voter").notNull(),
  voterType: text("voter_type").notNull().default("member"),
  vote: text("vote").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ForumPostVoteRow = typeof forumPostVotesTable.$inferSelect;

export const insertForumReplySchema = createInsertSchema(forumRepliesTable).omit({ id: true, createdAt: true });
export type InsertForumReply = z.infer<typeof insertForumReplySchema>;
export type ForumReplyRow = typeof forumRepliesTable.$inferSelect;

export const forumProposalsTable = pgTable("forum_proposals", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  proposedBy: text("proposed_by").notNull(),
  status: text("status").notNull().default("open"),
  votesYes: integer("votes_yes").notNull().default(0),
  votesNo: integer("votes_no").notNull().default(0),
  votesAbstain: integer("votes_abstain").notNull().default(0),
  threshold: integer("threshold").notNull().default(5),
  outcome: text("outcome"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export type ForumProposalRow = typeof forumProposalsTable.$inferSelect;

export const forumVotesTable = pgTable("forum_votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull(),
  voter: text("voter").notNull(),
  voterType: text("voter_type").notNull().default("agent"),
  vote: text("vote").notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ForumVoteRow = typeof forumVotesTable.$inferSelect;

export const forumKnowledgeTable = pgTable("forum_knowledge", {
  id: serial("id").primaryKey(),
  cycleNumber: integer("cycle_number").notNull(),
  insightType: text("insight_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceTopicId: integer("source_topic_id"),
  sourceProposalId: integer("source_proposal_id"),
  author: text("author").notNull(),
  confidence: integer("confidence").notNull().default(50),
  referencedBy: integer("referenced_by").notNull().default(0),
  supersededBy: integer("superseded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ForumKnowledgeRow = typeof forumKnowledgeTable.$inferSelect;

export const forumLearningMetricsTable = pgTable("forum_learning_metrics", {
  id: serial("id").primaryKey(),
  cycleNumber: integer("cycle_number").notNull(),
  collaborationScore: integer("collaboration_score").notNull().default(0),
  knowledgeDepth: integer("knowledge_depth").notNull().default(0),
  crossDomainLinks: integer("cross_domain_links").notNull().default(0),
  proposalQuality: integer("proposal_quality").notNull().default(0),
  insightCount: integer("insight_count").notNull().default(0),
  topicsReferringPast: integer("topics_referring_past").notNull().default(0),
  improvementDelta: integer("improvement_delta").notNull().default(0),
  reflectionSummary: text("reflection_summary").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ForumLearningMetricsRow = typeof forumLearningMetricsTable.$inferSelect;

export const forumApplicantsTable = pgTable("forum_applicants", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  externalIdentity: text("external_identity").notNull().default(""),
  source: text("source").notNull().default("moltbook"),
  applicantName: text("applicant_name").notNull(),
  applicantHandle: text("applicant_handle").notNull().default(""),
  contact: text("contact").notNull().default(""),
  proposedTitle: text("proposed_title").notNull(),
  proposedContent: text("proposed_content").notNull(),
  offerOfValue: text("offer_of_value").notNull().default(""),
  status: text("status").notNull().default("pending"),
  vettedBy: text("vetted_by"),
  vettedAt: timestamp("vetted_at"),
  rejectReason: text("reject_reason"),
  promotedTopicId: integer("promoted_topic_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ForumApplicantRow = typeof forumApplicantsTable.$inferSelect;
