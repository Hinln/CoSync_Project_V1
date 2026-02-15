import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

// 模拟热门话题
const HOT_TOPICS = [
  { id: 1, title: "周末好去处", postCount: 1234 },
  { id: 2, title: "美食探店", postCount: 892 },
  { id: 3, title: "读书同频", postCount: 567 },
  { id: 4, title: "运动共振", postCount: 445 },
  { id: 5, title: "旅行频率", postCount: 389 },
  { id: 6, title: "摄影波段", postCount: 312 },
];

// 模拟推荐用户
const RECOMMENDED_USERS = [
  { id: 201, nickname: "旅行达人", bio: "走遍世界的角落", gender: 2, isVerified: true },
  { id: 202, nickname: "美食家小陈", bio: "每天发现一家好店", gender: 1, isVerified: true },
  { id: 203, nickname: "读书笔记", bio: "一年读100本书", gender: 2, isVerified: true },
  { id: 204, nickname: "运动少年", bio: "跑步 | 健身 | 游泳", gender: 1, isVerified: false },
];

export default function DiscoverScreen() {
  const colors = useColors();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");

  const handleSearch = () => {
    if (!searchText.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // 搜索功能占位
  };

  const sections = [
    { key: "search" },
    { key: "topics" },
    { key: "users" },
  ];

  const renderItem = ({ item }: { item: { key: string } }) => {
    if (item.key === "search") {
      return (
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconSymbol
              name={"magnifyingglass" as any}
              size={18}
              color={colors.muted}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="搜索同频的人或动态"
              placeholderTextColor={colors.muted}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText("")}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <IconSymbol name="xmark" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    if (item.key === "topics") {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            热门话题
          </Text>
          <View style={styles.topicGrid}>
            {HOT_TOPICS.map((topic) => (
              <Pressable
                key={topic.id}
                style={({ pressed }) => [
                  styles.topicCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.topicTitle, { color: colors.foreground }]}>
                  # {topic.title}
                </Text>
                <Text style={[styles.topicCount, { color: colors.muted }]}>
                  {topic.postCount} 条动态
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    if (item.key === "users") {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            同频推荐
          </Text>
          {RECOMMENDED_USERS.map((u) => (
            <Pressable
              key={u.id}
              style={({ pressed }) => [
                styles.userCard,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.surface },
              ]}
            >
              <View
                style={[styles.userAvatar, { backgroundColor: colors.primary + "25" }]}
              >
                <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                  {u.nickname.charAt(0)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>
                    {u.nickname}
                  </Text>
                  {u.isVerified && (
                    <View
                      style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.verifiedText}>认证</Text>
                    </View>
                  )}
                  <Text
                    style={{
                      color: u.gender === 1 ? "#3B82F6" : "#EC4899",
                      fontSize: 12,
                    }}
                  >
                    {u.gender === 1 ? "♂" : "♀"}
                  </Text>
                </View>
                <Text
                  style={[styles.userBio, { color: colors.muted }]}
                  numberOfLines={1}
                >
                  {u.bio}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.followBtn,
                  { borderColor: colors.primary },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.followBtnText, { color: colors.primary }]}>
                  关注
                </Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      );
    }

    return null;
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>发现</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  listContent: {
    paddingBottom: 100,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: 44,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topicCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    width: "47%",
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  topicCount: {
    fontSize: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  verifiedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  userBio: {
    fontSize: 13,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
