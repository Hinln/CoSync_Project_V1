import { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface ChatMessage {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  isMine: boolean;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { user } = useCoSyncAuth();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      content: "你好呀！最近怎么样？",
      senderId: 101,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isMine: false,
    },
    {
      id: 2,
      content: "挺好的，你呢？",
      senderId: user?.id || 0,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isMine: true,
    },
    {
      id: 3,
      content: "我也不错！今天天气真好",
      senderId: 101,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      isMine: false,
    },
    {
      id: 4,
      content: "是啊，要不要出去走走？",
      senderId: user?.id || 0,
      createdAt: new Date(Date.now() - 900000).toISOString(),
      isMine: true,
    },
    {
      id: 5,
      content: "好呀！下午三点怎么样？",
      senderId: 101,
      createdAt: new Date(Date.now() - 300000).toISOString(),
      isMine: false,
    },
  ]);

  const otherUserName = "小明";

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newMsg: ChatMessage = {
      id: messages.length + 1,
      content: inputText.trim(),
      senderId: user?.id || 0,
      createdAt: new Date().toISOString(),
      isMine: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // 模拟对方回复
    setTimeout(() => {
      const reply: ChatMessage = {
        id: messages.length + 2,
        content: "收到！",
        senderId: 101,
        createdAt: new Date().toISOString(),
        isMine: false,
      };
      setMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  useEffect(() => {
    // 滚动到底部
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages.length]);

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    // 检查是否需要显示时间
    const showTime =
      index === 0 ||
      new Date(item.createdAt).getTime() -
        new Date(messages[index - 1].createdAt).getTime() >
        300000;

    return (
      <View>
        {showTime && (
          <Text style={[styles.timeLabel, { color: colors.muted }]}>
            {formatTime(item.createdAt)}
          </Text>
        )}
        <View
          style={[
            styles.msgRow,
            item.isMine ? styles.msgRowRight : styles.msgRowLeft,
          ]}
        >
          {!item.isMine && (
            <View style={[styles.msgAvatar, { backgroundColor: colors.primary + "30" }]}>
              <Text style={[styles.msgAvatarText, { color: colors.primary }]}>
                {otherUserName.charAt(0)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.msgBubble,
              item.isMine
                ? [styles.myBubble, { backgroundColor: colors.primary }]
                : [styles.otherBubble, { backgroundColor: colors.surface }],
            ]}
          >
            <Text
              style={[
                styles.msgText,
                { color: item.isMine ? "#fff" : colors.foreground },
              ]}
            >
              {item.content}
            </Text>
          </View>
          {item.isMine && (
            <View style={[styles.msgAvatar, { backgroundColor: colors.primary + "30" }]}>
              <Text style={[styles.msgAvatarText, { color: colors.primary }]}>
                {(user?.nickname || "我").charAt(0)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

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
          <Text style={[styles.navTitle, { color: colors.foreground }]}>
            {otherUserName}
          </Text>
          <View style={styles.navPlaceholder} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.chatInput,
              { backgroundColor: colors.surface, color: colors.foreground },
            ]}
            placeholder="输入消息..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: inputText.trim()
                  ? colors.primary
                  : colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#fff" />
          </Pressable>
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
  msgList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  timeLabel: {
    textAlign: "center",
    fontSize: 12,
    marginVertical: 12,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  msgRowLeft: {
    justifyContent: "flex-start",
  },
  msgRowRight: {
    justifyContent: "flex-end",
  },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  msgBubble: {
    maxWidth: "65%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    gap: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
