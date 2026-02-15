import { useState } from "react";
import {
  Text,
  View,
  TextInput,
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

export default function EditProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, updateUser } = useCoSyncAuth();

  const [nickname, setNickname] = useState(user?.nickname || "");
  const [bio, setBio] = useState(user?.bio || "");

  const genderLabel =
    user?.gender === 1 ? "男" : user?.gender === 2 ? "女" : "未设置";
  const genderLocked = user?.isVerified && (user?.gender === 1 || user?.gender === 2);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert("提示", "请输入昵称");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    await updateUser({
      nickname: nickname.trim(),
      bio: bio.trim(),
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert("保存成功", "资料已更新", [
      { text: "确定", onPress: () => router.back() },
    ]);
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>编辑资料</Text>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "25" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(nickname || user?.nickname || "?").charAt(0)}
            </Text>
          </View>
          <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={[styles.changeAvatarText, { color: colors.primary }]}>
              更换头像
            </Text>
          </Pressable>
        </View>

        {/* Fields */}
        <View style={styles.fieldList}>
          {/* Nickname */}
          <View style={[styles.fieldItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>昵称</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={nickname}
              onChangeText={setNickname}
              placeholder="请输入昵称"
              placeholderTextColor={colors.muted}
              maxLength={50}
              returnKeyType="done"
            />
          </View>

          {/* Bio */}
          <View style={[styles.fieldItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>简介</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={bio}
              onChangeText={setBio}
              placeholder="介绍一下自己"
              placeholderTextColor={colors.muted}
              maxLength={200}
              returnKeyType="done"
            />
          </View>

          {/* Gender (locked) */}
          <View style={[styles.fieldItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>性别</Text>
            <View style={styles.fieldRight}>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                {genderLabel}
              </Text>
              {genderLocked && (
                <View style={styles.lockedRow}>
                  <IconSymbol name="lock.fill" size={12} color={colors.muted} />
                  <Text style={[styles.lockedText, { color: colors.muted }]}>
                    实名锁定
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Phone */}
          <View style={[styles.fieldItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>手机号</Text>
            <Text style={[styles.fieldValue, { color: colors.muted }]}>
              {user?.phone
                ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
                : "未绑定"}
            </Text>
          </View>

          {/* Verification Status */}
          <View style={[styles.fieldItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              实名认证
            </Text>
            <View style={styles.fieldRight}>
              <Text
                style={[
                  styles.fieldValue,
                  { color: user?.isVerified ? colors.success : colors.warning },
                ]}
              >
                {user?.isVerified ? "已认证" : "未认证"}
              </Text>
              {!user?.isVerified && (
                <Pressable
                  onPress={() => router.push("/verify")}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  <Text style={[styles.goVerify, { color: colors.primary }]}>
                    去认证
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
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
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldList: {},
  fieldItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "500",
    width: 80,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    textAlign: "right",
  },
  fieldRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldValue: {
    fontSize: 16,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  lockedText: {
    fontSize: 12,
  },
  goVerify: {
    fontSize: 14,
    fontWeight: "600",
  },
});
