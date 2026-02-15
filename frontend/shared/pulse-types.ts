/**
 * CoSync (同频) App 共享类型定义
 */

// 用户公开信息（不包含敏感数据）
export interface PublicUser {
  id: number;
  nickname: string | null;
  avatar: string | null;
  gender: number; // 0=未设置, 1=男, 2=女
  isVerified: boolean;
  bio: string | null;
}

// 动态卡片数据
export interface PostCard {
  id: number;
  content: string;
  images: string[] | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  user: PublicUser;
  isLiked: boolean;
}

// 动态详情
export interface PostDetail extends PostCard {
  comments: CommentItem[];
}

// 评论项
export interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  user: PublicUser;
  parentId: number | null;
  replyToUser: PublicUser | null;
  replies?: CommentItem[];
}

// 会话列表项
export interface ConversationItem {
  id: number;
  type: "private" | "group";
  name: string | null;
  avatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  // 私聊对方信息
  otherUser?: PublicUser;
  // 群聊成员数
  memberCount?: number;
}

// 消息项
export interface MessageItem {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: "text" | "image" | "system";
  createdAt: string;
  sender: PublicUser;
  isMine: boolean;
}

// 实名认证请求
export interface VerifyRequest {
  realName: string;
  idNumber: string;
}

// 实名认证响应
export interface VerifyResponse {
  success: boolean;
  message: string;
  gender?: number;
}
