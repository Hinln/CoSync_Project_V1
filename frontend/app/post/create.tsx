import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

const MAX_CONTENT_LENGTH = 2000;

export default function CreatePostScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isLoggedIn } = useCoSyncAuth();

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 检查实名认证
  if (isLoggedIn && !user?.isVerified) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.verifyPrompt}>
          <IconSymbol
            name={"shield.checkmark.fill" as any}
            size={64}
            color={colors.primary}
          />
          <Text style={[styles.verifyTitle, { color: colors.foreground }]}>
            需要实名认证
          </Text>
          <Text style={[styles.verifyDesc, { color: colors.muted }]}>
            发布动态前需要完成实名认证，保障社区安全
          </Text>
          <Pressable
            onPress={() => router.push("/verify")}
            style={({ pressed }) => [
              styles.verifyBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.verifyBtnText}>前往认证</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={[styles.cancelText, { color: colors.muted }]}>返回</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const handlePublish = async () => {
    if (!content.trim()) {
      Alert.alert("提示", "请输入动态内容");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsLoading(true);

    try {
      // 模拟发布
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert("发布成功", "您的动态已发布", [
        { text: "确定", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("发布失败", "请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Text style={[styles.cancelBtn, { color: colors.muted }]}>取消</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>发布动态</Text>
        <Pressable
          onPress={handlePublish}
          disabled={isLoading || !content.trim()}
          style={({ pressed }) => [
            styles.publishBtn,
            {
              backgroundColor:
                content.trim() ? colors.primary : colors.border,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.publishBtnText}>发布</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Content Input */}
        <TextInput
          style={[styles.contentInput, { color: colors.foreground }]}
          placeholder="分享你的想法..."
          placeholderTextColor={colors.muted}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={MAX_CONTENT_LENGTH}
          textAlignVertical="top"
          autoFocus
        />

        {/* Character Count */}
        <Text style={[styles.charCount, { color: colors.muted }]}>
          {content.length}/{MAX_CONTENT_LENGTH}
        </Text>

        {/* Image Upload Area */}
        <View style={styles.imageSection}>
          <Pressable
            style={({ pressed }) => [
              styles.addImageBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name={"photo" as any} size={28} color={colors.muted} />
            <Text style={[styles.addImageText, { color: colors.muted }]}>添加图片</Text>
          </Pressable>
        </View>
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
  cancelBtn: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  publishBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  publishBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  imageSection: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addImageText: {
    fontSize: 11,
  },
  verifyPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  verifyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  verifyDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  verifyBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 26,
    marginTop: 8,
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelText: {
    fontSize: 15,
    marginTop: 12,
  },
});
