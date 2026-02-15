import { useState, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

// 模拟用户动态
const MOCK_USER_POSTS = Array.from({ length: 6 }, (_, i) => ({
  id: i + 100,
  content:
    i % 2 === 0
      ? "分享一下今天的好心情，希望每天都能这样开心！"
      : "推荐一本好书《人类简史》，读完之后对世界有了全新的认识。",
  images:
    i % 3 === 0
      ? [`https://picsum.photos/seed/${i + 500}/400/300`]
      : [],
  likeCount: Math.floor(Math.random() * 100),
  commentCount: Math.floor(Math.random() * 30),
  createdAt: new Date(Date.now() - 86400000 * (i + 1)).toISOString(),
}));

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "今天";
  if (days < 7) return `${days}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isLoggedIn, logout } = useCoSyncAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const genderLabel =
    user?.gender === 1 ? "男" : user?.gender === 2 ? "女" : "未设置";
  const genderIcon = user?.gender === 1 ? "♂" : user?.gender === 2 ? "♀" : "";
  const genderColor =
    user?.gender === 1 ? "#3B82F6" : user?.gender === 2 ? "#EC4899" : colors.muted;

  if (!isLoggedIn) {
    return (
      <ScreenContainer>
        <View style={styles.notLoggedIn}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.surface }]}>
            <IconSymbol
              name={"person.fill" as any}
              size={48}
              color={colors.muted}
            />
          </View>
          <Text style={[styles.notLoggedTitle, { color: colors.foreground }]}>
            登录同频
          </Text>
          <Text style={[styles.notLoggedDesc, { color: colors.muted }]}>
            同频共振，真实连接
          </Text>
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.loginBtnText}>登录 / 注册</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const menuItems = [
    {
      icon: "shield.checkmark.fill" as any,
      label: "实名认证",
      value: user?.isVerified ? "已认证" : "未认证",
      valueColor: user?.isVerified ? colors.success : colors.warning,
      onPress: () => {
        if (!user?.isVerified) router.push("/verify");
      },
    },
    {
      icon: "gearshape.fill" as any,
      label: "设置",
      value: "",
      valueColor: colors.muted,
      onPress: () => router.push("/settings" as any),
    },
  ];

  const renderHeader = () => (
    <View>
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        {/* Avatar */}
        <Pressable
          onPress={() => router.push("/profile/edit" as any)}
          style={({ pressed }) => pressed && { opacity: 0.8 }}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary + "25" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.nickname || "?").charAt(0)}
            </Text>
          </View>
        </Pressable>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.nickname, { color: colors.foreground }]}>
              {user?.nickname || "未设置昵称"}
            </Text>
            {genderIcon ? (
              <View
                style={[
                  styles.genderBadge,
                  { backgroundColor: genderColor + "20" },
                ]}
              >
                <Text style={{ color: genderColor, fontSize: 13 }}>
                  {genderIcon} {genderLabel}
                </Text>
              </View>
            ) : null}
            {user?.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.verifiedText}>已认证</Text>
              </View>
            )}
          </View>
          <Text style={[styles.bio, { color: colors.muted }]}>
            {user?.bio || "这个人很懒，什么都没写"}
          </Text>
          <Text style={[styles.phone, { color: colors.muted }]}>
            {user?.phone
              ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
              : "未绑定手机号"}
          </Text>
        </View>

        {/* Edit Button */}
        <Pressable
          onPress={() => router.push("/profile/edit" as any)}
          style={({ pressed }) => [
            styles.editBtn,
            { borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.editBtnText, { color: colors.foreground }]}>
            编辑资料
          </Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>
            {MOCK_USER_POSTS.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>动态</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>128</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>获赞</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border },
              pressed && { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.menuLeft}>
              <IconSymbol name={item.icon} size={20} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                {item.label}
              </Text>
            </View>
            <View style={styles.menuRight}>
              {item.value ? (
                <Text style={[styles.menuValue, { color: item.valueColor }]}>
                  {item.value}
                </Text>
              ) : null}
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </View>
          </Pressable>
        ))}
      </View>

      {/* My Posts Header */}
      <View style={styles.postsHeader}>
        <Text style={[styles.postsTitle, { color: colors.foreground }]}>我的动态</Text>
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: (typeof MOCK_USER_POSTS)[0] }) => (
    <Pressable
      onPress={() => router.push(`/post/${item.id}` as any)}
      style={({ pressed }) => [
        styles.postItem,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.postContent}>
        <Text
          style={[styles.postText, { color: colors.foreground }]}
          numberOfLines={3}
        >
          {item.content}
        </Text>
        <View style={styles.postMeta}>
          <Text style={[styles.postDate, { color: colors.muted }]}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={styles.postStats}>
            <IconSymbol name={"heart" as any} size={13} color={colors.muted} />
            <Text style={[styles.postStatText, { color: colors.muted }]}>
              {item.likeCount}
            </Text>
            <IconSymbol name={"bubble.left" as any} size={13} color={colors.muted} />
            <Text style={[styles.postStatText, { color: colors.muted }]}>
              {item.commentCount}
            </Text>
          </View>
        </View>
      </View>
      {item.images.length > 0 && (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.postThumb}
          resizeMode="cover"
        />
      )}
    </Pressable>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={MOCK_USER_POSTS}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  notLoggedIn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  bigAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  notLoggedTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  notLoggedDesc: {
    fontSize: 15,
  },
  loginBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 26,
    marginTop: 12,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  profileCard: {
    padding: 20,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
  },
  userInfo: {
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nickname: {
    fontSize: 22,
    fontWeight: "800",
  },
  genderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  phone: {
    fontSize: 13,
  },
  editBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    marginHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 13,
  },
  statDivider: {
    width: 0.5,
    height: "80%",
    alignSelf: "center",
  },
  menuSection: {
    marginTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  menuValue: {
    fontSize: 14,
  },
  postsHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  postItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  postContent: {
    flex: 1,
    gap: 8,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  postDate: {
    fontSize: 12,
  },
  postStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    marginRight: 8,
  },
  postThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});
