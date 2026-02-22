import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sdk } from "./_core/sdk";
// 引入阿里云 SDK
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import { ENV } from "./_core/env";
import CloudAuthPkg from '@alicloud/cloudauth20190307';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Dysms = require('@alicloud/dysmsapi20170525');

const CloudAuthMod = CloudAuthPkg as any;
const CloudAuthClientCtor =
  CloudAuthMod?.Client ??
  CloudAuthMod?.default?.Client ??
  CloudAuthMod?.default ??
  CloudAuthMod;
const InitSmartVerifyRequestCtor =
  CloudAuthMod?.InitSmartVerifyRequest ?? CloudAuthMod?.default?.InitSmartVerifyRequest;
const DescribeSmartVerifyRequestCtor =
  CloudAuthMod?.DescribeSmartVerifyRequest ?? CloudAuthMod?.default?.DescribeSmartVerifyRequest;
const InitFaceVerifyRequestCtor =
  CloudAuthMod?.InitFaceVerifyRequest ?? CloudAuthMod?.default?.InitFaceVerifyRequest;
const DescribeFaceVerifyRequestCtor =
  CloudAuthMod?.DescribeFaceVerifyRequest ?? CloudAuthMod?.default?.DescribeFaceVerifyRequest;

// 阿里云客户端初始化
const authConfig = new $OpenApi.Config({
  accessKeyId: ENV.aliYunAccessKey,
  accessKeySecret: ENV.aliYunAccessSecret,
  endpoint: 'cloudauth.aliyuncs.com',
  regionId: ENV.aliYunRegion,
});
const authClient = new CloudAuthClientCtor(authConfig);

// ==================== 工具函数 ====================

function toPublicUser(user: any) {
  return {
    id: user.id,
    nickname: user.nickname || user.name || `用户${user.id}`,
    avatar: user.avatar || null,
    gender: user.gender || 0,
    isVerified: user.isVerified || false,
    bio: user.bio || null,
  };
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== 用户模块 ====================
  user: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) return null;
      return {
        id: user.id,
        nickname: user.nickname || user.name || `用户${user.id}`,
        avatar: user.avatar,
        phone: user.phone,
        bio: user.bio,
        gender: user.gender,
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
      };
    }),

    publicProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) return null;
        return toPublicUser(user);
      }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          nickname: z.string().min(1).max(50).optional(),
          avatar: z.string().optional(),
          bio: z.string().max(200).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    bindPhoneWithCode: protectedProcedure
      .input(z.object({ phone: z.string().regex(/^1\d{10}$/), code: z.string().min(4).max(6) }))
      .mutation(async ({ ctx, input }) => {
        const ok = await db.verifySmsCode(input.phone, input.code);
        if (!ok) return { success: false, message: "验证码无效或已过期" };
        const existing = await db.getUserByPhone(input.phone);
        if (existing && existing.id !== ctx.user.id) {
          return { success: false, message: "该手机号已被其他账号绑定" };
        }
        await db.updateUserPhone(ctx.user.id, input.phone);
        return { success: true, message: "手机号绑定成功" };
      }),

    search: publicProcedure
      .input(z.object({ keyword: z.string().min(1) }))
      .query(async ({ input }) => {
        const result = await db.searchUsers(input.keyword);
        return result.map(toPublicUser);
      }),
  }),

  // ==================== 实名认证模块（重构版） ====================
  verify: router({
    // 第一步：初始化实人认证
    init: protectedProcedure
      .input(z.object({
        realName: z.string().min(2).max(20),
        idNumber: z.string().regex(/^\d{17}[\dXx]$/),
        metaInfo: z.string(), 
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (user?.isVerified) throw new Error("您已完成认证");

        const request =
          InitFaceVerifyRequestCtor
            ? new InitFaceVerifyRequestCtor({
                sceneId: Number(ENV.aliYunSceneId),
                outerOrderNo: `V_${ctx.user.id}_${Date.now()}`,
                mode: 'LIVENESS',
                certName: input.realName,
                certNo: input.idNumber,
                metaInfo: input.metaInfo,
                returnUrl: ENV.verifyReturnUrl,
              })
            : new InitSmartVerifyRequestCtor({
                sceneId: Number(ENV.aliYunSceneId),
                outerOrderNo: `V_${ctx.user.id}_${Date.now()}`,
                mode: 'LIVENESS',
                certName: input.realName,
                certNo: input.idNumber,
                metaInfo: input.metaInfo,
                returnUrl: ENV.verifyReturnUrl,
              });

        const response = InitFaceVerifyRequestCtor
          ? await authClient.initFaceVerify(request)
          : await authClient.initSmartVerify(request);
        return {
          certifyId: response.body?.resultObject?.certifyId || response.body?.resultObject?.CertifyId,
          certifyUrl: response.body?.resultObject?.certifyUrl || response.body?.resultObject?.CertifyUrl,
        };
      }),

    // 第二步：查询结果并自动同步性别
    checkResult: protectedProcedure
      .input(z.object({
        certifyId: z.string(),
        idNumber: z.string() 
      }))
      .mutation(async ({ ctx, input }) => {
        const request =
          DescribeFaceVerifyRequestCtor
            ? new DescribeFaceVerifyRequestCtor({
                sceneId: Number(ENV.aliYunSceneId),
                certifyId: input.certifyId,
              })
            : new DescribeSmartVerifyRequestCtor({
                sceneId: Number(ENV.aliYunSceneId),
                certifyId: input.certifyId,
              });

        const response = DescribeFaceVerifyRequestCtor
          ? await authClient.describeFaceVerify(request)
          : await authClient.describeSmartVerify(request);
        
        if ((response.body?.resultObject?.passed || response.body?.resultObject?.Passed) === 'T') {
          // 提取性别：奇数男(1)，偶数女(2)
          const char17 = input.idNumber.charAt(16);
          const gender = parseInt(char17, 10) % 2 === 1 ? 1 : 2;

          await db.updateUserVerification(ctx.user.id, {
            isVerified: true,
            gender: gender,
            verifiedAt: new Date(),
          });
          return { success: true, gender };
        }
        return { success: false };
      }),

    status: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return {
        isVerified: user?.isVerified || false,
        gender: user?.gender || 0,
        phone: user?.phone || null,
      };
    }),
  }),

  // ==================== 动态模块 ====================
  post: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20), cursor: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const postList = await db.getPostList({ limit: input.limit + 1, cursor: input.cursor });
        let nextCursor: number | undefined;
        if (postList.length > input.limit) {
          const next = postList.pop();
          nextCursor = next?.id;
        }
        const userIds = [...new Set(postList.map((p) => p.userId))];
        const userList = await db.getMultipleUsers(userIds);
        const userMap = new Map(userList.map((u) => [u.id, u]));
        let likedPostIds: number[] = [];
        if (ctx.user) {
          likedPostIds = await db.getUserLikedPostIds(ctx.user.id, postList.map((p) => p.id));
        }
        const items = postList.map((post) => ({
          id: post.id,
          content: post.content,
          images: post.images || [],
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post.createdAt.toISOString(),
          user: toPublicUser(userMap.get(post.userId) || { id: post.userId }),
          isLiked: likedPostIds.includes(post.id),
        }));
        return { items, nextCursor };
      }),

    detail: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const post = await db.getPostById(input.id);
        if (!post) return null;
        const user = await db.getUserById(post.userId);
        const commentList = await db.getCommentsByPostId(post.id);
        const commentUserIds = [...new Set([...commentList.map((c) => c.userId), ...commentList.filter((c) => c.replyToUserId).map((c) => c.replyToUserId!)])];
        const commentUsers = await db.getMultipleUsers(commentUserIds);
        const commentUserMap = new Map(commentUsers.map((u) => [u.id, u]));
        let isLiked = false;
        if (ctx.user) {
          const liked = await db.getUserLikedPostIds(ctx.user.id, [post.id]);
          isLiked = liked.includes(post.id);
        }
        return {
          id: post.id,
          content: post.content,
          images: post.images || [],
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post.createdAt.toISOString(),
          user: toPublicUser(user || { id: post.userId }),
          isLiked,
          comments: commentList.map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt.toISOString(),
            user: toPublicUser(commentUserMap.get(c.userId) || { id: c.userId }),
            parentId: c.parentId,
            replyToUser: c.replyToUserId ? toPublicUser(commentUserMap.get(c.replyToUserId) || { id: c.replyToUserId }) : null,
          })),
        };
      }),

    create: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(2000), images: z.array(z.string()).max(9).optional() }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user?.isVerified) {
          return { success: false, message: "请先完成实名认证", needVerify: true };
        }
        const postId = await db.createPost({ userId: ctx.user.id, content: input.content, images: input.images || [] });
        return { success: true, postId, needVerify: false };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getPostById(input.id);
        if (!post || post.userId !== ctx.user.id) return { success: false, message: "无权删除" };
        await db.deletePost(input.id);
        return { success: true };
      }),

    toggleLike: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isLiked = await db.toggleLike(ctx.user.id, input.postId);
        return { isLiked };
      }),

    comment: protectedProcedure
      .input(z.object({ postId: z.number(), content: z.string().min(1).max(500), parentId: z.number().optional(), replyToUserId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const commentId = await db.createComment({ postId: input.postId, userId: ctx.user.id, content: input.content, parentId: input.parentId || null, replyToUserId: input.replyToUserId || null });
        return { success: true, commentId };
      }),

    userPosts: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().min(1).max(50).default(20), cursor: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const postList = await db.getPostList({ limit: input.limit + 1, cursor: input.cursor, userId: input.userId });
        let nextCursor: number | undefined;
        if (postList.length > input.limit) {
          const next = postList.pop();
          nextCursor = next?.id;
        }
        const user = await db.getUserById(input.userId);
        let likedPostIds: number[] = [];
        if (ctx.user) {
          likedPostIds = await db.getUserLikedPostIds(ctx.user.id, postList.map((p) => p.id));
        }
        return {
          items: postList.map((post) => ({
            id: post.id,
            content: post.content,
            images: post.images || [],
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            createdAt: post.createdAt.toISOString(),
            user: toPublicUser(user || { id: post.userId }),
            isLiked: likedPostIds.includes(post.id),
          })),
          nextCursor,
        };
      }),
  }),

  // ==================== 消息模块 ====================
  message: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      const convList = await db.getUserConversations(ctx.user.id);
      return await Promise.all(
        convList.map(async (conv) => {
          const lastMsg = await db.getLastMessage(conv.id);
          const members = await db.getConversationMembers(conv.id);
          let otherUser = undefined;
          if (conv.type === "private") {
            const otherMember = members.find((m) => m.userId !== ctx.user.id);
            if (otherMember) {
              const user = await db.getUserById(otherMember.userId);
              otherUser = user ? toPublicUser(user) : undefined;
            }
          }
          return {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            avatar: conv.avatar,
            lastMessage: lastMsg?.content || null,
            lastMessageAt: lastMsg?.createdAt?.toISOString() || null,
            unreadCount: 0,
            otherUser,
            memberCount: members.length,
          };
        }),
      );
    }),

    list: protectedProcedure
      .input(z.object({ conversationId: z.number(), limit: z.number().min(1).max(100).default(50), cursor: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const msgList = await db.getMessagesByConversation(input.conversationId, { limit: input.limit + 1, cursor: input.cursor });
        let nextCursor: number | undefined;
        if (msgList.length > input.limit) {
          const next = msgList.pop();
          nextCursor = next?.id;
        }
        const userIds = [...new Set(msgList.map((m) => m.senderId))];
        const userList = await db.getMultipleUsers(userIds);
        const userMap = new Map(userList.map((u) => [u.id, u]));
        const items = msgList.map((msg) => ({
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          content: msg.content,
          messageType: msg.messageType,
          createdAt: msg.createdAt.toISOString(),
          sender: toPublicUser(userMap.get(msg.senderId) || { id: msg.senderId }),
          isMine: msg.senderId === ctx.user.id,
        }));
        items.reverse();
        return { items, nextCursor };
      }),

    send: protectedProcedure
      .input(z.object({ conversationId: z.number(), content: z.string().min(1).max(2000), messageType: z.enum(["text", "image"]).default("text") }))
      .mutation(async ({ ctx, input }) => {
        const messageId = await db.createMessage({ conversationId: input.conversationId, senderId: ctx.user.id, content: input.content, messageType: input.messageType });
        return { success: true, messageId };
      }),

    startPrivateChat: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.targetUserId === ctx.user.id) return { success: false, message: "不能和自己聊天", conversationId: 0 };
        const existing = await db.findPrivateConversation(ctx.user.id, input.targetUserId);
        if (existing) return { success: true, conversationId: existing.id };
        const convId = await db.createConversation({ type: "private" });
        await db.addConversationMember({ conversationId: convId, userId: ctx.user.id });
        await db.addConversationMember({ conversationId: convId, userId: input.targetUserId });
        return { success: true, conversationId: convId };
      }),

    createGroup: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100), memberIds: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        const convId = await db.createConversation({ type: "group", name: input.name, ownerId: ctx.user.id });
        await db.addConversationMember({ conversationId: convId, userId: ctx.user.id });
        for (const memberId of input.memberIds) {
          if (memberId !== ctx.user.id) await db.addConversationMember({ conversationId: convId, userId: memberId });
        }
        await db.createMessage({ conversationId: convId, senderId: ctx.user.id, content: "群聊已创建", messageType: "system" });
        return { success: true, conversationId: convId };
      }),
  }),

  search: router({
    all: publicProcedure
      .input(z.object({ keyword: z.string().min(1) }))
      .query(async ({ input }) => {
        const [userResults, postResults] = await Promise.all([db.searchUsers(input.keyword, 10), db.searchPosts(input.keyword, 10)]);
        const postUserIds = [...new Set(postResults.map((p) => p.userId))];
        const postUsers = await db.getMultipleUsers(postUserIds);
        const userMap = new Map(postUsers.map((u) => [u.id, u]));
        return {
          users: userResults.map(toPublicUser),
          posts: postResults.map((post) => ({
            id: post.id,
            content: post.content,
            images: post.images || [],
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            createdAt: post.createdAt.toISOString(),
            user: toPublicUser(userMap.get(post.userId) || { id: post.userId }),
            isLiked: false,
          })),
        };
      }),
  }),

  upload: router({
    // 获取 OSS 直传签名（STS / Policy 模式）
    getUploadSign: protectedProcedure
      .input(z.object({ fileName: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const { createRequire } = await import("module");
        const require = createRequire(import.meta.url);
        const OSS = require('ali-oss');

        const client = new OSS({
          region: ENV.ossRegion,
          accessKeyId: ENV.ossAccessKeyId || ENV.aliYunAccessKey,
          accessKeySecret: ENV.ossAccessKeySecret || ENV.aliYunAccessSecret,
          bucket: ENV.ossBucket,
          secure: true,
        });

        // 构造文件路径：uploads/userId/timestamp-filename
        const key = `uploads/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        
        // 生成签名 URL，有效期 300 秒
        const url = client.signatureUrl(key, {
          method: 'PUT',
          expires: 300,
          'Content-Type': 'image/jpeg', // 简单起见，默认 image/jpeg，可根据 input.fileType 动态调整
        });

        return {
          uploadUrl: url,
          key: key,
          publicUrl: `https://${ENV.ossBucket}.${ENV.ossRegion}.aliyuncs.com/${key}`
        };
      }),

    // 保留原有 base64 上传作为备用（不推荐，流量走服务器）
    image: protectedProcedure
      .input(z.object({ base64: z.string(), fileName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.base64, "base64");
        const key = `uploads/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        return { url };
      }),
  }),
});
  // ==================== 短信验证码 ====================
  sms: router({
    sendCode: publicProcedure
      .input(z.object({ phone: z.string().regex(/^1\d{10}$/) }))
      .mutation(async ({ input }) => {
        const count1m = await db.countSmsCodes(input.phone, 60);
        if (count1m >= 1) return { success: false, message: "发送太频繁，请稍后再试" };
        
        const count1h = await db.countSmsCodes(input.phone, 3600);
        if (count1h >= 10) return { success: false, message: "发送次数过多，请稍后再试" };

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.createSmsCode(input.phone, code, expiresAt);
        const smsClient = new Dysms.Client({
          accessKeyId: ENV.smsAccessKeyId,
          accessKeySecret: ENV.smsAccessKeySecret,
          endpoint: 'dysmsapi.aliyuncs.com',
        });
        const req = new Dysms.SendSmsRequest({
          phoneNumbers: input.phone,
          signName: ENV.smsSignName,
          templateCode: ENV.smsTemplateCode,
          templateParam: JSON.stringify({ code }),
        });
        try {
          await smsClient.sendSms(req);
        } catch (e: any) {
          console.error("SMS send failed:", e);
          return { success: false, message: "短信发送失败: " + (e.data?.Message || e.message || "未知错误") };
        }
        return { success: true, ttl: 300 };
      }),
    verifyCode: publicProcedure
      .input(z.object({ phone: z.string().regex(/^1\d{10}$/), code: z.string().min(4).max(6) }))
      .mutation(async ({ ctx, input }) => {
        const ok = await db.verifySmsCode(input.phone, input.code);
        if (!ok) return { success: false, message: "验证码无效或已过期" };

        let user = await db.getUserByPhone(input.phone);
        if (!user) {
          // Auto-register
          const openId = `phone:${input.phone}`;
          await db.upsertUser({
            openId,
            name: `用户${input.phone.slice(-4)}`,
            phone: input.phone,
            loginMethod: "phone",
            role: "user",
          });
          user = await db.getUserByPhone(input.phone);
        }

        if (!user) return { success: false, message: "登录失败，请重试" };

        // Issue Session
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          token: sessionToken,
          user: {
            id: user.id,
            nickname: user.nickname || user.name || `用户${user.id}`,
            avatar: user.avatar,
            phone: user.phone,
            bio: user.bio,
            gender: user.gender,
            isVerified: user.isVerified,
            verifiedAt: user.verifiedAt?.toISOString() || null,
            createdAt: user.createdAt.toISOString(),
          }
        };
      }),
  }),



export type AppRouter = typeof appRouter;
