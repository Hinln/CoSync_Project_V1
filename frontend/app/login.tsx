import { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import Svg, { Path } from "react-native-svg";
import { trpc } from "@/lib/trpc";

// 频率波形组件 — 视觉延伸"频率/波段"概念
function WaveformDecor({ color, opacity = 0.15 }: { color: string; opacity?: number }) {
  return (
    <Svg width="280" height="60" viewBox="0 0 280 60" style={{ opacity }}>
      <Path
        d="M0 30 Q20 10 40 30 Q60 50 80 30 Q100 10 120 30 Q140 50 160 30 Q180 10 200 30 Q220 50 240 30 Q260 10 280 30"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M0 30 Q20 50 40 30 Q60 10 80 30 Q100 50 120 30 Q140 10 160 30 Q180 50 200 30 Q220 10 240 30 Q260 50 280 30"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity={0.6}
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useCoSyncAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const codeInputRef = useRef<TextInput>(null);
  const timerRef = useRef<NodeJS.Timeout | number | null>(null);

  // Logo 呼吸动画
  const glowScale = useSharedValue(1);
  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  // 发送验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current as any);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current as any);
    };
  }, [countdown]);

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      Alert.alert("提示", "请输入正确的手机号");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await trpc.sms.sendCode.mutate({ phone });
      setCountdown(60);
      setStep("code");
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 300);
      Alert.alert("验证码已发送", "验证码已发送至你的手机");
    } catch (e: any) {
      Alert.alert("错误", e.message || "发送失败");
    }
  };

  const handleLogin = async () => {
    if (!code || code.length < 4) {
      Alert.alert("提示", "请输入验证码");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsLoading(true);

    try {
      const res = await trpc.sms.verifyCode.mutate({ phone, code });
      if (!res.success) {
        Alert.alert("错误", "验证码不正确或已过期");
        return;
      }
      const user = {
        id: Math.floor(Math.random() * 10000) + 1,
        nickname: `用户${phone.slice(-4)}`,
        avatar: null,
        phone: phone,
        bio: null,
        gender: 0,
        isVerified: false,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
      };
      await login(user);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("错误", error.message || "登录失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* 频率波形装饰 - 顶部 */}
          <View style={styles.waveTop}>
            <WaveformDecor color={colors.primary} opacity={0.12} />
          </View>

          {/* Logo & Title */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
            <Animated.View style={glowStyle}>
              <View style={[styles.logoOuter, { borderColor: colors.primary + "30" }]}>
                <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
                  <Text style={styles.logoText}>≈</Text>
                </View>
              </View>
            </Animated.View>
            <Text style={[styles.title, { color: colors.foreground }]}>同频</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              同频共振，真实连接
            </Text>
          </Animated.View>

          {/* Phone Input */}
          <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.inputGroup}>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.prefix, { color: colors.foreground }]}>+86</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="请输入手机号"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                maxLength={11}
                value={phone}
                onChangeText={setPhone}
                returnKeyType="done"
              />
            </View>

            {/* Code Input */}
            {step === "code" && (
              <Animated.View
                entering={FadeInDown.duration(400)}
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <TextInput
                  ref={codeInputRef}
                  style={[styles.input, { color: colors.foreground, flex: 1 }]}
                  placeholder="请输入验证码"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  onPress={handleSendCode}
                  disabled={countdown > 0}
                  style={({ pressed }) => [
                    styles.codeBtn,
                    { backgroundColor: countdown > 0 ? colors.border : colors.primary },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.codeBtnText}>
                    {countdown > 0 ? `${countdown}s` : "重新发送"}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>

          {/* Action Button */}
          <Animated.View entering={FadeInDown.duration(600).delay(400)}>
            <Pressable
              onPress={step === "phone" ? handleSendCode : handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary },
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                isLoading && { opacity: 0.7 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {step === "phone" ? "获取验证码" : "登录 / 注册"}
                </Text>
              )}
            </Pressable>
          </Animated.View>

          {/* 1个手机号 = 1个账号 提示 */}
          <Animated.View entering={FadeInDown.duration(600).delay(500)}>
            <View style={[styles.hintRow, { backgroundColor: colors.primary + "10" }]}>
              <Text style={[styles.hintIcon, { color: colors.primary }]}>◉</Text>
              <Text style={[styles.hintText, { color: colors.muted }]}>
                一个手机号对应一个唯一账号，注册即绑定
              </Text>
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              登录即表示同意
            </Text>
            <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Text style={[styles.linkText, { color: colors.primary }]}>
                《用户协议》
              </Text>
            </Pressable>
            <Text style={[styles.footerText, { color: colors.muted }]}>和</Text>
            <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Text style={[styles.linkText, { color: colors.primary }]}>
                《隐私政策》
              </Text>
            </Pressable>
          </Animated.View>

          {/* 频率波形装饰 - 底部 */}
          <View style={styles.waveBottom}>
            <WaveformDecor color={colors.primary} opacity={0.08} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  waveTop: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  waveBottom: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    letterSpacing: 2,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
  },
  prefix: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 12,
  },
  divider: {
    width: 1,
    height: 24,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: 52,
  },
  codeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  codeBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  actionBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 24,
    gap: 8,
  },
  hintIcon: {
    fontSize: 12,
  },
  hintText: {
    fontSize: 12,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: 12,
  },
  linkText: {
    fontSize: 12,
  },
});
