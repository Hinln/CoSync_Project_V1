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

interface GroupMessage {
  id: number;
  content: string;
  senderId: number;
  senderName: string;
  createdAt: string;
  isMine: boolean;
  messageType: "text" | "system";
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { user } = useCoSyncAuth();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [inputText, setInputText] = useState("");
  const groupName = "周末活动群";

  const [messages, setMessages] = useState<GroupMessage[]>([
    {
      id: 0,
      content: "群聊已创建",
      senderId: 0,
      senderName: "",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      isMine: false,
      messageType: "system",
    },
    {
      id: 1,
      content: "大家好！这个周末有什么安排吗？",
      senderId: 201,
      senderName: "小李",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      isMine: false,
      messageType: "text",
    },
    {
      id: 2,
      content: "我想去爬山！",
      senderId: 202,
      senderName: "小王",
      createdAt: new Date(Date.now() - 6000000).toISOString(),
      isMine: false,
      messageType: "text",
    },
    {
      id: 3,
      content: "好主意，去哪座山？",
      senderId: user?.id || 0,
      senderName: user?.nickname || "我",
      createdAt: new Date(Date.now() - 5400000).toISOString(),
      isMine: true,
      messageType: "text",
    },
    {
      id: 4,
      content: "香山怎么样？秋天景色很美",
      senderId: 201,
      senderName: "小李",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isMine: false,
      messageType: "text",
    },
    {
      id: 5,
      content: "这周六有人去爬山吗？",
      senderId: 203,
      senderName: "小张",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      isMine: false,
      messageType: "text",
    },
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newMsg: GroupMessage = {
      id: messages.length + 1,
      content: inputText.trim(),
      senderId: user?.id || 0,
      senderName: user?.nickname || "我",
      createdAt: new Date().toISOString(),
      isMine: true,
      messageType: "text",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages.length]);

  const renderMessage = ({ item, index }: { item: GroupMessage; index: number }) => {
    if (item.messageType === "system") {
      return (
        <View style={styles.systemMsg}>
          <Text style={[styles.systemMsgText, { color: colors.muted }]}>
            {item.content}
          </Text>
        </View>
      );
    }

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
            <View style={[styles.msgAvatar, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.msgAvatarText, { color: colors.primary }]}>
                {item.senderName.charAt(0)}
              </Text>
            </View>
          )}
          <View style={item.isMine ? styles.myMsgCol : styles.otherMsgCol}>
            {!item.isMine && (
              <Text style={[styles.senderName, { color: colors.muted }]}>
                {item.senderName}
              </Text>
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
          <View style={styles.navCenter}>
            <Text style={[styles.navTitle, { color: colors.foreground }]}>
              {groupName}
            </Text>
            <Text style={[styles.navSubtitle, { color: colors.muted }]}>
              12人
            </Text>
          </View>
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
  navCenter: {
    alignItems: "center",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  navSubtitle: {
    fontSize: 12,
  },
  navPlaceholder: { width: 36 },
  msgList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  systemMsg: {
    alignItems: "center",
    marginVertical: 12,
  },
  systemMsgText: {
    fontSize: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
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
  myMsgCol: {
    alignItems: "flex-end",
    maxWidth: "65%",
  },
  otherMsgCol: {
    alignItems: "flex-start",
    maxWidth: "65%",
  },
  senderName: {
    fontSize: 12,
    marginBottom: 2,
  },
  msgBubble: {
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
