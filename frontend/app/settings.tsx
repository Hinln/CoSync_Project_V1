import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout, isLoggedIn } = useCoSyncAuth();

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出登录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: () => {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          logout();
          router.replace("/(tabs)" as any);
        },
      },
    ]);
  };

  const settingsSections = [
    {
      title: "账号安全",
      items: [
        {
          icon: "shield.checkmark.fill" as any,
          label: "实名认证",
          onPress: () => router.push("/verify"),
        },
        {
          icon: "lock.fill" as any,
          label: "隐私设置",
          onPress: () => {},
        },
      ],
    },
    {
      title: "通用",
      items: [
        {
          icon: "bell.fill" as any,
          label: "通知设置",
          onPress: () => {},
        },
        {
          icon: "paintbrush.fill" as any,
          label: "外观设置",
          onPress: () => {},
        },
      ],
    },
    {
      title: "关于",
      items: [
        {
          icon: "info.circle.fill" as any,
          label: "关于同频",
          onPress: () => {
            Alert.alert("关于同频", "版本 1.0.0\n同频共振，真实连接");
          },
        },
        {
          icon: "doc.text.fill" as any,
          label: "用户协议",
          onPress: () => {},
        },
        {
          icon: "hand.raised.fill" as any,
          label: "隐私政策",
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>设置</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {settingsSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              {section.items.map((item, iIdx) => (
                <Pressable
                  key={iIdx}
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.settingItem,
                    iIdx < section.items.length - 1 && {
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingLeft}>
                    <IconSymbol name={item.icon} size={20} color={colors.primary} />
                    <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                      {item.label}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        {isLoggedIn && (
          <View style={styles.logoutSection}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                { backgroundColor: colors.surface },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.logoutText, { color: colors.error }]}>退出登录</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  placeholder: { width: 36 },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: "uppercase",
  },
  sectionCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  logoutSection: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  logoutBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
