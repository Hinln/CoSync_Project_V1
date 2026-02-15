import { useState, useEffect } from "react";
import { Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from 'expo-web-browser';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, FadeInDown } from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import Svg, { Path, Circle } from "react-native-svg";

// 频率连接动画图标
function ConnectionIcon({ color }: { color: string }) {
  return (
    <Svg width="120" height="60" viewBox="0 0 120 60">
      <Circle cx="15" cy="30" r="8" fill={color} opacity={0.3} />
      <Circle cx="15" cy="30" r="4" fill={color} />
      <Path d="M23 30 Q35 10 50 30 Q65 50 77 30 Q89 10 97 30" stroke={color} strokeWidth="2" fill="none" opacity={0.6} />
      <Circle cx="105" cy="30" r="8" fill={color} opacity={0.3} />
      <Circle cx="105" cy="30" r="4" fill={color} />
    </Svg>
  );
}

export default function VerifyScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, updateUser } = useCoSyncAuth();

  const [realName, setRealName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 动画逻辑保持不变
  const shieldPulse = useSharedValue(1);
  useEffect(() => {
    shieldPulse.value = withRepeat(withSequence(withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })), -1, true);
  }, []);

  const shieldStyle = useAnimatedStyle(() => ({ transform: [{ scale: shieldPulse.value }] }));

  // tRPC 接口
  const initMutation = trpc.verify.init.useMutation();
  const checkMutation = trpc.verify.checkResult.useMutation();

  const getAliyunMetaInfo = async (): Promise<string> => {
    if (Platform.OS === "web" && typeof (globalThis as any).getMetaInfo === "function") {
      const ret = await (globalThis as any).getMetaInfo();
      return typeof ret === "string" ? ret : JSON.stringify(ret);
    }
    return '{"zimId":"v1"}';
  };

  const handleSubmit = async () => {
    if (!realName || realName.length < 2) {
      Alert.alert("提示", "请输入正确的姓名");
      return;
    }
    if (!/^\d{17}[\dXx]$/.test(idNumber)) {
      Alert.alert("提示", "请输入正确的身份证号");
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsLoading(true);
    try {
      // 1. 获取 H5 链接
      const metaInfo = await getAliyunMetaInfo();
      const { certifyId, certifyUrl } = await initMutation.mutateAsync({
        realName,
        idNumber,
        metaInfo
      });

      // 2. 跳转到阿里云 H5 认证页
      await WebBrowser.openBrowserAsync(certifyUrl);

      // 3. 从网页返回后，后端查询结果并同步性别
      const result = await checkMutation.mutateAsync({ certifyId, idNumber });

      if (result.success) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await updateUser({ isVerified: true, gender: result.gender });
        Alert.alert("认证成功", "您的性别已自动同步", [{ text: "确定", onPress: () => router.back() }]);
      } else {
        Alert.alert("提示", "未检测到完成实人认证，请重试");
      }
    } catch (err: any) {
      Alert.alert("错误", err.message || "系统繁忙");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBar}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
              <IconSymbol name="xmark" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>实人认证</Text>
            <View style={styles.placeholder} />
          </View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.shieldContainer}>
            <Animated.View style={shieldStyle}>
              <View style={[styles.shieldCircle, { backgroundColor: colors.primary + "15" }]}>
                <View style={[styles.shieldInner, { backgroundColor: colors.primary + "10" }]}>
                  <IconSymbol name={"shield.checkmark.fill" as any} size={48} color={colors.primary} />
                </View>
              </View>
            </Animated.View>
            <View style={styles.connectionIcon}><ConnectionIcon color={colors.primary} /></View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <View style={[styles.privacyCard, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "20" }]}>
              <View style={styles.privacyRow}>
                <IconSymbol name="lock.fill" size={16} color={colors.primary} />
                <Text style={[styles.privacyTitle, { color: colors.primary }]}>隐私安全</Text>
              </View>
              <Text style={[styles.privacyText, { color: colors.muted }]}>身份信息直连公安系统核验，同频不存储您的身份证号与真实姓名。</Text>
            </View>
          </Animated.View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>手机号</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.6 }]}>
                <IconSymbol name="lock.fill" size={16} color={colors.muted} />
                <Text style={[styles.lockedText, { color: colors.muted }]}>
                  {user?.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "未绑定"}
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>真实姓名</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="姓名" value={realName} onChangeText={setRealName} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>身份证号</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="18位身份证号" value={idNumber} onChangeText={setIdNumber} maxLength={18} />
              </View>
            </View>
          </View>

          <Pressable onPress={handleSubmit} disabled={isLoading} style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary }, isLoading && { opacity: 0.7 }]}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>开始人脸识别</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  placeholder: { width: 36 },
  shieldContainer: { alignItems: "center", marginTop: 8, marginBottom: 20 },
  shieldCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  shieldInner: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  connectionIcon: { marginTop: 8 },
  privacyCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 28 },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  privacyTitle: { fontSize: 14, fontWeight: "700" },
  privacyText: { fontSize: 13, lineHeight: 20 },
  form: { gap: 20, marginBottom: 32 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, height: 50, gap: 10 },
  input: { flex: 1, fontSize: 16, height: 50 },
  lockedText: { fontSize: 16 },
  submitBtn: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
