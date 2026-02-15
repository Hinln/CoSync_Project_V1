import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function CreateGroupScreen() {
  const colors = useColors();
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert("提示", "请输入群聊名称");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert("创建成功", `群聊「${groupName}」已创建`, [
        { text: "确定", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("创建失败", "请稍后重试");
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
          <Text style={[styles.cancelText, { color: colors.muted }]}>取消</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>创建群聊</Text>
        <Pressable
          onPress={handleCreate}
          disabled={isLoading || !groupName.trim()}
          style={({ pressed }) => [
            styles.createBtn,
            {
              backgroundColor: groupName.trim()
                ? colors.primary
                : colors.border,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.createBtnText}>创建</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Group Icon */}
        <View style={styles.iconSection}>
          <View style={[styles.groupIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol
              name={"person.3.fill" as any}
              size={36}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Group Name Input */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>群聊名称</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="请输入群聊名称"
            placeholderTextColor={colors.muted}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={100}
            returnKeyType="done"
            autoFocus
          />
          <Text style={[styles.hint, { color: colors.muted }]}>
            {groupName.length}/100
          </Text>
        </View>
      </View>
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
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  createBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  createBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    padding: 24,
    gap: 32,
  },
  iconSection: {
    alignItems: "center",
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    textAlign: "right",
  },
});
