import { useState, useRef } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

// 模拟数据
function getMockPost(id: number) {
  return {
    id,
    content:
      "今天天气真好，出去走走感受一下阳光的温暖。生活中总有一些小确幸值得我们去发现和珍惜。希望每个人都能找到属于自己的快乐 ☀️",
    images: [
      `https://picsum.photos/seed/${id + 100}/600/400`,
      `https://picsum.photos/seed/${id + 200}/600/400`,
    ],
    likeCount: 128,
    commentCount: 23,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    user: {
      id: 100,
      nickname: "阳光少年",
      avatar: null,
      gender: 1,
      isVerified: true,
      bio: "热爱生活",
    },
    isLiked: false,
    comments: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      content:
        i % 3 === 0
          ? "说得太好了！"
          : i % 3 === 1
            ? "今天确实天气不错，我也出去走了走"
            : "分享一下你去了哪里呀？",
      createdAt: new Date(Date.now() - 3600000 * (i + 1)).toISOString(),
      user: {
        id: 200 + i,
        nickname: `用户${2000 + i}`,
        avatar: null,
        gender: i % 2 === 0 ? 1 : 2,
        isVerified: i % 3 === 0,
        bio: null,
      },
      parentId: i > 4 ? i - 3 : null,
      replyToUser:
        i > 4
          ? {
              id: 200 + i - 3,
              nickname: `用户${2000 + i - 3}`,
              avatar: null,
              gender: 1,
              isVerified: false,
              bio: null,
            }
          : null,
    })),
  };
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { user: currentUser, isLoggedIn } = useCoSyncAuth();
  const inputRef = useRef<TextInput>(null);

  const postId = parseInt(id || "1", 10);
  const [post, setPost] = useState(() => getMockPost(postId));
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: number;
    nickname: string;
  } | null>(null);

  const handleLike = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPost((prev) => ({
      ...prev,
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
    }));
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newComment = {
      id: post.comments.length + 1,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      user: {
        id: currentUser?.id || 0,
        nickname: currentUser?.nickname || "我",
        avatar: null as null,
        gender: currentUser?.gender || 0,
        isVerified: currentUser?.isVerified || false,
        bio: null as null,
      },
      parentId: replyTo?.id || null,
      replyToUser: replyTo
        ? {
            id: replyTo.id,
            nickname: replyTo.nickname,
            avatar: null,
            gender: 0,
            isVerified: false,
            bio: null,
          }
        : null,
    };

    setPost((prev) => ({
      ...prev,
      comments: [newComment, ...prev.comments],
      commentCount: prev.commentCount + 1,
    }));
    setCommentText("");
    setReplyTo(null);
  };

  const handleReply = (comment: { id: number; user: { nickname: string } }) => {
    setReplyTo({ id: comment.id, nickname: comment.user.nickname });
    inputRef.current?.focus();
  };

  const renderHeader = () => (
    <View style={styles.postContainer}>
      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "30" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(post.user.nickname || "?").charAt(0)}
          </Text>
        </View>
        <View style={styles.userMeta}>
          <View style={styles.nameRow}>
            <Text style={[styles.nickname, { color: colors.foreground }]}>
              {post.user.nickname}
            </Text>
            {post.user.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.verifiedText}>已认证</Text>
              </View>
            )}
          </View>
          <Text style={[styles.time, { color: colors.muted }]}>
            {formatTime(post.createdAt)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.content, { color: colors.foreground }]}>{post.content}</Text>

      {/* Images */}
      {post.images.length > 0 && (
        <View style={styles.imageGrid}>
          {post.images.map((uri, index) => (
            <Image
              key={index}
              source={{ uri }}
              style={[
                styles.postImage,
                post.images.length === 1 && styles.singleImage,
              ]}
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleLike}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol
            name={(post.isLiked ? "heart.fill" : "heart") as any}
            size={20}
            color={post.isLiked ? "#EF4444" : colors.muted}
          />
          <Text
            style={[
              styles.actionText,
              { color: post.isLiked ? "#EF4444" : colors.muted },
            ]}
          >
            {post.likeCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol
            name={"bubble.left" as any}
            size={20}
            color={colors.muted}
          />
          <Text style={[styles.actionText, { color: colors.muted }]}>
            {post.commentCount}
          </Text>
        </Pressable>
      </View>

      {/* Comments Header */}
      <View style={styles.commentsHeader}>
        <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
          评论 ({post.commentCount})
        </Text>
      </View>
    </View>
  );

  const renderComment = ({ item }: { item: (typeof post.comments)[0] }) => (
    <Pressable
      onPress={() => handleReply(item)}
      style={({ pressed }) => [
        styles.commentItem,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surface },
      ]}
    >
      <View style={[styles.commentAvatar, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.commentAvatarText, { color: colors.primary }]}>
          {(item.user.nickname || "?").charAt(0)}
        </Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentNickname, { color: colors.foreground }]}>
            {item.user.nickname}
          </Text>
          <Text style={[styles.commentTime, { color: colors.muted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {item.replyToUser && (
          <Text style={[styles.replyLabel, { color: colors.muted }]}>
            回复{" "}
            <Text style={{ color: colors.primary }}>{item.replyToUser.nickname}</Text>
          </Text>
        )}
        <Text style={[styles.commentContent, { color: colors.foreground }]}>
          {item.content}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        {/* Nav Bar */}
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>动态详情</Text>
          <View style={styles.navPlaceholder} />
        </View>

        {/* Comments List */}
        <FlatList
          data={post.comments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderComment}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Comment Input */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          {replyTo && (
            <View style={styles.replyBar}>
              <Text style={[styles.replyBarText, { color: colors.muted }]}>
                回复 {replyTo.nickname}
              </Text>
              <Pressable
                onPress={() => setReplyTo(null)}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <IconSymbol name="xmark" size={14} color={colors.muted} />
              </Pressable>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={[
                styles.commentInput,
                { backgroundColor: colors.surface, color: colors.foreground },
              ]}
              placeholder={replyTo ? `回复 ${replyTo.nickname}...` : "写评论..."}
              placeholderTextColor={colors.muted}
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={handleComment}
              multiline={false}
            />
            <Pressable
              onPress={handleComment}
              disabled={!commentText.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: commentText.trim() ? colors.primary : colors.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol name="paperplane.fill" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  navPlaceholder: { width: 36 },
  listContent: {
    paddingBottom: 100,
  },
  postContainer: {
    paddingHorizontal: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userMeta: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nickname: {
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  time: {
    fontSize: 13,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  postImage: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 10,
  },
  singleImage: {
    width: "100%",
    aspectRatio: 16 / 10,
  },
  actions: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: 0.5,
    gap: 32,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
  commentsHeader: {
    paddingVertical: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  commentItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentNickname: {
    fontSize: 13,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 11,
  },
  replyLabel: {
    fontSize: 12,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  replyBarText: {
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
