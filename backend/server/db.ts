import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  posts,
  likes,
  comments,
  conversations,
  conversationMembers,
  messages,
  InsertPost,
  InsertComment,
  InsertConversation,
  InsertConversationMember,
  InsertMessage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== 用户相关 ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(
  userId: number,
  data: { nickname?: string; avatar?: string; bio?: string },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserVerification(
  userId: number,
  data: { isVerified: boolean; gender: number; verifiedAt: Date },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserPhone(userId: number, phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ phone }).where(eq(users.id, userId));
}

// ==================== 动态相关 ====================

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data);
  return result[0].insertId;
}

export async function getPostList(params: {
  limit: number;
  cursor?: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(params.limit);

  if (params.cursor) {
    query = query.where(sql`${posts.id} < ${params.cursor}`) as any;
  }

  if (params.userId) {
    query = query.where(eq(posts.userId, params.userId)) as any;
  }

  return query;
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deletePost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(posts).where(eq(posts.id, id));
}

// ==================== 点赞相关 ====================

export async function toggleLike(userId: number, postId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
    .limit(1);

  if (existing.length > 0) {
    // 取消点赞
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    await db
      .update(posts)
      .set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` })
      .where(eq(posts.id, postId));
    return false;
  } else {
    // 点赞
    await db.insert(likes).values({ userId, postId });
    await db
      .update(posts)
      .set({ likeCount: sql`${posts.likeCount} + 1` })
      .where(eq(posts.id, postId));
    return true;
  }
}

export async function getUserLikedPostIds(userId: number, postIds: number[]): Promise<number[]> {
  if (postIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ postId: likes.postId })
    .from(likes)
    .where(and(eq(likes.userId, userId), inArray(likes.postId, postIds)));
  return result.map((r) => r.postId);
}

// ==================== 评论相关 ====================

export async function createComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(comments).values(data);
  // 更新动态评论数
  await db
    .update(posts)
    .set({ commentCount: sql`${posts.commentCount} + 1` })
    .where(eq(posts.id, data.postId));
  return result[0].insertId;
}

export async function getCommentsByPostId(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(comments)
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));
}

// ==================== 会话相关 ====================

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conversations).values(data);
  return result[0].insertId;
}

export async function addConversationMember(data: InsertConversationMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(conversationMembers).values(data);
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // 获取用户参与的所有会话
  const memberRows = await db
    .select({ conversationId: conversationMembers.conversationId })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  if (memberRows.length === 0) return [];

  const convIds = memberRows.map((r) => r.conversationId);
  return db
    .select()
    .from(conversations)
    .where(inArray(conversations.id, convIds))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversationMembers(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));
}

export async function findPrivateConversation(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return undefined;

  // 找到两个用户都在的私聊会话
  const result = await db.execute(sql`
    SELECT c.id FROM conversations c
    INNER JOIN conversation_members cm1 ON c.id = cm1.conversationId AND cm1.userId = ${userId1}
    INNER JOIN conversation_members cm2 ON c.id = cm2.conversationId AND cm2.userId = ${userId2}
    WHERE c.type = 'private'
    LIMIT 1
  `);

  const rows = (result as any)[0] as any[];
  if (rows.length > 0) {
    const convResult = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, rows[0].id))
      .limit(1);
    return convResult[0];
  }
  return undefined;
}

// ==================== 消息相关 ====================

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  // 更新会话时间
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
  return result[0].insertId;
}

export async function getMessagesByConversation(
  conversationId: number,
  params: { limit: number; cursor?: number },
) {
  const db = await getDb();
  if (!db) return [];

  if (params.cursor) {
    return db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.id} < ${params.cursor}`,
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(params.limit);
  }

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(params.limit);
}

export async function getLastMessage(conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== 搜索相关 ====================

export async function searchUsers(keyword: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(sql`${users.nickname} LIKE ${`%${keyword}%`}`)
    .limit(limit);
}

export async function searchPosts(keyword: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(posts)
    .where(sql`${posts.content} LIKE ${`%${keyword}%`}`)
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

export async function getMultipleUsers(userIds: number[]) {
  if (userIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(inArray(users.id, userIds));
}

// ==================== 短信验证码 ====================
import { smsCodes } from "../drizzle/schema";

export async function createSmsCode(phone: string, code: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(smsCodes).values({ phone, code, expiresAt });
}

export async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const result = await db
    .select()
    .from(smsCodes)
    .where(and(eq(smsCodes.phone, phone), eq(smsCodes.code, code)))
    .orderBy(desc(smsCodes.createdAt))
    .limit(1);
  if (result.length === 0) return false;
  const record = result[0];
  if (record.used) return false;
  if (record.expiresAt < now) return false;
  await db.update(smsCodes).set({ used: true }).where(eq(smsCodes.id, record.id));
  return true;
}

export async function countSmsCodes(phone: string, seconds: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - seconds * 1000);
  const result = await db
    .select({ count: sql`count(*)` })
    .from(smsCodes)
    .where(and(eq(smsCodes.phone, phone), sql`${smsCodes.createdAt} >= ${since}`));
  return Number((result[0] as any).count);
}
