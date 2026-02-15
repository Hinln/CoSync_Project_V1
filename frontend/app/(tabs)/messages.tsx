import { useState, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

// 模拟会话数据
const MOCK_CONVERSATIONS = [
  {
    id: 1,
    type: "private" as const,
    name: null,
    avatar: null,
    lastMessage: "今天一起吃饭吗？",
    lastMessageAt: new Date(Date.now() - 300000).toISOString(),
    unreadCount: 2,
    otherUser: {
      id: 101,
      nickname: "小明",
      avatar: null,
      gender: 1,
      isVerified: true,
      bio: null,
    },
  },
  {
    id: 2,
    type: "private" as const,
    name: null,
    avatar: null,
    lastMessage: "好的，收到！",
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 0,
    otherUser: {
      id: 102,
      nickname: "小红",
      avatar: null,
      gender: 2,
      isVerified: true,
      bio: null,
    },
  },
  {
    id: 3,
    type: "group" as const,
    name: "周末活动群",
    avatar: null,
    lastMessage: "这周六有人去爬山吗？",
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    unreadCount: 5,
    memberCount: 12,
  },
  {
    id: 4,
    type: "group" as const,
    name: "技术交流群",
    avatar: null,
    lastMessage: "React Native 新版本发布了",
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 0,
    memberCount: 45,
  },
  {
    id: 5,
    type: "private" as const,
    name: null,
    avatar: null,
    lastMessage: "明天见！",
    lastMessageAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    unreadCount: 0,
    otherUser: {
      id: 103,
      nickname: "张三",
      avatar: null,
      gender: 1,
      isVerified: false,
      bio: null,
    },
  },
];

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
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function MessagesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isLoggedIn } = useCoSyncAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [conversations] = useState(MOCK_CONVERSATIONS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const handleConversationPress = (conv: (typeof MOCK_CONVERSATIONS)[0]) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (conv.type === "private") {
      router.push(`/chat/${conv.id}` as any);
    } else {
      router.push(`/group/${conv.id}` as any);
    }
  };

  const handleCreateGroup = () => {
    router.push("/group/create" as any);
  };

  if (!isLoggedIn) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <IconSymbol name={"bubble.left" as any} size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            登录后查看消息
          </Text>
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.loginBtnText}>去登录</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const renderItem = ({ item }: { item: (typeof MOCK_CONVERSATIONS)[0] }) => {
    const displayName =
      item.type === "private"
        ? item.otherUser?.nickname || "未知用户"
        : item.name || "群聊";
    const initial = displayName.charAt(0);
    const isGroup = item.type === "group";

    return (
      <Pressable
        onPress={() => handleConversationPress(item)}
        style={({ pressed }) => [
          styles.convItem,
          { borderBottomColor: colors.border },
          pressed && { backgroundColor: colors.surface },
        ]}
      >
        {/* Avatar */}
        <View
          style={[
            styles.convAvatar,
            {
              backgroundColor: isGroup
                ? colors.primary + "20"
                : colors.primary + "30",
            },
          ]}
        >
          {isGroup ? (
            <IconSymbol
              name={"person.3.fill" as any}
              size={20}
              color={colors.primary}
            />
          ) : (
            <Text style={[styles.convAvatarText, { color: colors.primary }]}>
              {initial}
            </Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.convContent}>
          <View style={styles.convHeader}>
            <Text
              style={[styles.convName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text style={[styles.convTime, { color: colors.muted }]}>
              {item.lastMessageAt ? formatTime(item.lastMessageAt) : ""}
            </Text>
          </View>
          <View style={styles.convFooter}>
            <Text
              style={[styles.convLastMsg, { color: colors.muted }]}
              numberOfLines={1}
            >
              {isGroup && item.memberCount
                ? `[${item.memberCount}人] `
                : ""}
              {item.lastMessage || "暂无消息"}
            </Text>
            {item.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>消息</Text>
        <Pressable
          onPress={handleCreateGroup}
          style={({ pressed }) => [
            styles.headerBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name={"plus" as any} size={22} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name={"bubble.left" as any} size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              暂无消息
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 100,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  convAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  convAvatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  convContent: {
    flex: 1,
    gap: 4,
  },
  convHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    fontSize: 12,
  },
  convFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convLastMsg: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  loginBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 8,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
