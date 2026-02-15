import { useState, useCallback, useEffect, useRef } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  Dimensions,
  StyleSheet,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCoSyncAuth } from "@/lib/auth-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PADDING = 16;
const CONTENT_WIDTH = SCREEN_WIDTH - PADDING * 2 - 44 - 12; // minus avatar + margin

// ========== 模拟数据生成 ==========
function generateMockPosts(startId: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const idx = startId + i;
    // 随机 0-9 张图片
    const imageCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const imageCount = imageCounts[idx % imageCounts.length];
    const images = Array.from({ length: imageCount }, (__, j) => ({
      thumb: `https://picsum.photos/seed/${idx * 10 + j + 200}/300/300`,
      full: `https://picsum.photos/seed/${idx * 10 + j + 200}/1080/1080`,
    }));

    const contents = [
      "今天天气真好，出去走走感受一下阳光的温暖，生活中的小确幸就是这样不期而遇 ☀️",
      "分享一下最近读的好书，推荐给大家！每天坚持阅读30分钟，你会发现世界变得不一样。",
      "周末去了一家超棒的咖啡店，拿铁做得很好喝，环境也很舒适，适合一个人安静地待一下午。",
      "和朋友一起去爬山，山顶的风景太美了！运动让人快乐，下次还要来。",
      "新学了一道菜，红烧排骨，味道还不错，分享给大家看看 🍖",
      "深夜的城市灯火阑珊，每一盏灯背后都有一个故事。",
      "终于把一直想看的电影看完了，剧情太精彩了，强烈推荐！",
      "今天开始学习吉他，虽然手指很疼，但弹出第一个和弦的时候真的很开心 🎸",
    ];

    return {
      id: idx,
      content: contents[idx % contents.length],
      images,
      likeCount: Math.floor(Math.random() * 200),
      commentCount: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      user: {
        id: idx + 100,
        nickname: `用户${1000 + idx}`,
        avatar: null as string | null,
        gender: ((idx % 3) + 1) as number,
        isVerified: idx % 2 === 0,
      },
      isLiked: idx % 5 === 0,
      location:
        idx % 3 === 0
          ? "北京·朝阳区"
          : idx % 3 === 1
            ? "上海·静安区"
            : null,
    };
  });
}

type PostImage = { thumb: string; full: string };

interface PostData {
  id: number;
  content: string;
  images: PostImage[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  user: {
    id: number;
    nickname: string;
    avatar: string | null;
    gender: number;
    isVerified: boolean;
  };
  isLiked: boolean;
  location: string | null;
}

// ========== 时间格式化 ==========
function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

// ========== 骨架屏组件 ==========
function SkeletonCard({ colors }: { colors: any }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={skeletonStyles.card}>
      {/* Avatar skeleton */}
      <Animated.View
        style={[
          skeletonStyles.avatar,
          { backgroundColor: colors.border },
          animStyle,
        ]}
      />
      <View style={skeletonStyles.body}>
        {/* Name row */}
        <View style={skeletonStyles.nameRow}>
          <Animated.View
            style={[
              skeletonStyles.nameLine,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
          <Animated.View
            style={[
              skeletonStyles.timeLine,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
        </View>
        {/* Content lines */}
        <Animated.View
          style={[
            skeletonStyles.contentLine1,
            { backgroundColor: colors.border },
            animStyle,
          ]}
        />
        <Animated.View
          style={[
            skeletonStyles.contentLine2,
            { backgroundColor: colors.border },
            animStyle,
          ]}
        />
        {/* Image grid skeleton */}
        <View style={skeletonStyles.imageRow}>
          <Animated.View
            style={[
              skeletonStyles.imageBox,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
          <Animated.View
            style={[
              skeletonStyles.imageBox,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
          <Animated.View
            style={[
              skeletonStyles.imageBox,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
        </View>
        {/* Action bar skeleton */}
        <View style={skeletonStyles.actionRow}>
          <Animated.View
            style={[
              skeletonStyles.actionItem,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
          <Animated.View
            style={[
              skeletonStyles.actionItem,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
          <Animated.View
            style={[
              skeletonStyles.actionItem,
              { backgroundColor: colors.border },
              animStyle,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    paddingHorizontal: PADDING,
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nameLine: {
    width: 80,
    height: 14,
    borderRadius: 7,
  },
  timeLine: {
    width: 50,
    height: 12,
    borderRadius: 6,
  },
  contentLine1: {
    width: "100%",
    height: 14,
    borderRadius: 7,
  },
  contentLine2: {
    width: "70%",
    height: 14,
    borderRadius: 7,
  },
  imageRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  imageBox: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  actionItem: {
    width: 60,
    height: 12,
    borderRadius: 6,
  },
});

// ========== 9 宫格图片网格 ==========
function ImageGrid({
  images,
  onImagePress,
}: {
  images: PostImage[];
  onImagePress: (index: number) => void;
  colors: any;
}) {
  if (images.length === 0) return null;

  const gap = 4;

  // 1 张图片：单张较大
  if (images.length === 1) {
    const size = CONTENT_WIDTH * 0.55;
    return (
      <View style={gridStyles.container}>
        <Pressable
          onPress={() => onImagePress(0)}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <Image
            source={{ uri: images[0].thumb }}
            style={{ width: size, height: size, borderRadius: 8 }}
            resizeMode="cover"
          />
        </Pressable>
      </View>
    );
  }

  // 2 张图片：并排
  if (images.length === 2) {
    const size = (CONTENT_WIDTH * 0.7 - gap) / 2;
    return (
      <View style={[gridStyles.container, { flexDirection: "row", gap }]}>
        {images.map((img, idx) => (
          <Pressable
            key={idx}
            onPress={() => onImagePress(idx)}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <Image
              source={{ uri: img.thumb }}
              style={{ width: size, height: size, borderRadius: 8 }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </View>
    );
  }

  // 3 张图片：1 大 + 2 小
  if (images.length === 3) {
    const bigSize = CONTENT_WIDTH * 0.65 - gap;
    const smallSize = CONTENT_WIDTH * 0.35 - gap;
    const smallHeight = (bigSize - gap) / 2;
    return (
      <View style={[gridStyles.container, { flexDirection: "row", gap }]}>
        <Pressable
          onPress={() => onImagePress(0)}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <Image
            source={{ uri: images[0].thumb }}
            style={{ width: bigSize, height: bigSize, borderRadius: 8 }}
            resizeMode="cover"
          />
        </Pressable>
        <View style={{ gap }}>
          {images.slice(1, 3).map((img, idx) => (
            <Pressable
              key={idx}
              onPress={() => onImagePress(idx + 1)}
              style={({ pressed }) => pressed && { opacity: 0.85 }}
            >
              <Image
                source={{ uri: img.thumb }}
                style={{ width: smallSize, height: smallHeight, borderRadius: 8 }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  // 4 张图片：2x2 网格
  if (images.length === 4) {
    const cellSize = (CONTENT_WIDTH * 0.7 - gap) / 2;
    return (
      <View style={gridStyles.container}>
        <View style={{ flexDirection: "row", gap, flexWrap: "wrap" }}>
          {images.map((img, idx) => (
            <Pressable
              key={idx}
              onPress={() => onImagePress(idx)}
              style={({ pressed }) => pressed && { opacity: 0.85 }}
            >
              <Image
                source={{ uri: img.thumb }}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 8,
                  marginBottom: idx < 2 ? gap : 0,
                }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  // 5-9 张图片：3 列网格（九宫格）
  const cols = 3;
  const cellSize = (CONTENT_WIDTH * 0.85 - gap * (cols - 1)) / cols;
  return (
    <View style={gridStyles.container}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
        {images.slice(0, 9).map((img, idx) => (
          <Pressable
            key={idx}
            onPress={() => onImagePress(idx)}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <Image
              source={{ uri: img.thumb }}
              style={{ width: cellSize, height: cellSize, borderRadius: 6 }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
});

// ========== 大图查看器（手势缩放 + 左右滑动） ==========
function ZoomableImage({
  uri,
  onSwipeLeft,
  onSwipeRight,
  onTapClose,
}: {
  uri: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTapClose: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 重置状态
  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [uri]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        // 缩放状态下平移
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        // 未缩放状态下，水平滑动切换图片
        if (Math.abs(e.translationX) > 60 && Math.abs(e.velocityX) > 200) {
          if (e.translationX > 0) {
            runOnJS(onSwipeRight)();
          } else {
            runOnJS(onSwipeLeft)();
          }
        }
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1, { duration: 250 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(0, { duration: 250 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5, { duration: 250 });
        savedScale.value = 2.5;
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (savedScale.value <= 1) {
        runOnJS(onTapClose)();
      }
    });

  const tapGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const composed = Gesture.Simultaneous(pinchGesture, panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[viewerStyles.imageWrapper, animatedStyle]}>
        <Image
          source={{ uri }}
          style={viewerStyles.fullImage}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

function ImageViewer({
  visible,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  images: PostImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // 当 initialIndex 变化时同步
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible || images.length === 0) return null;

  const goNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };
  const goPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const currentImage = images[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={viewerStyles.overlay}>
        {/* 可缩放图片 */}
        <ZoomableImage
          uri={currentImage?.full || currentImage?.thumb}
          onSwipeLeft={goNext}
          onSwipeRight={goPrev}
          onTapClose={onClose}
        />

        {/* 图片计数 */}
        {images.length > 1 && (
          <View style={viewerStyles.counter}>
            <Text style={viewerStyles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}

        {/* 底部导航点 */}
        {images.length > 1 && images.length <= 9 && (
          <View style={viewerStyles.dotsRow}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  viewerStyles.dot,
                  idx === currentIndex && viewerStyles.dotActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* 关闭按钮 */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            viewerStyles.closeBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={viewerStyles.closeBtnText}>✕</Text>
        </Pressable>

        {/* 缩放提示 */}
        <View style={viewerStyles.hintRow}>
          <Text style={viewerStyles.hintText}>双指缩放 · 双击放大 · 左右滑动切换</Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  counter: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  dotsRow: {
    position: "absolute",
    bottom: 120,
    flexDirection: "row",
    gap: 6,
    alignSelf: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 18,
    borderRadius: 3,
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 18,
  },
  hintRow: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
  },
  hintText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
});

// ========== 单条动态卡片 ==========
function PostCard({
  item,
  onPress,
  onLike,
  onImagePress,
  colors,
}: {
  item: PostData;
  onPress: () => void;
  onLike: () => void;
  onImagePress: (index: number) => void;
  colors: any;
}) {
  const genderColor = item.user.gender === 1 ? "#3B82F6" : "#EC4899";
  const genderIcon = item.user.gender === 1 ? "♂" : "♀";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surface },
      ]}
    >
      {/* 用户头像 */}
      <View style={[styles.avatarContainer, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {item.user.nickname.charAt(0)}
        </Text>
        <View style={[styles.genderBadge, { backgroundColor: genderColor }]}>
          <Text style={styles.genderBadgeText}>{genderIcon}</Text>
        </View>
      </View>

      {/* 右侧内容区 */}
      <View style={styles.cardBody}>
        {/* 用户名行 */}
        <View style={styles.nameRow}>
          <Text style={[styles.nickname, { color: colors.foreground }]} numberOfLines={1}>
            {item.user.nickname}
          </Text>
          {item.user.isVerified && (
            <IconSymbol
              name={"shield.checkmark.fill" as any}
              size={14}
              color={colors.primary}
            />
          )}
          <View style={{ flex: 1 }} />
          <Text style={[styles.timeText, { color: colors.muted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {/* 动态文字 */}
        <Text style={[styles.contentText, { color: colors.foreground }]} numberOfLines={4}>
          {item.content}
        </Text>

        {/* 缩略图网格（支持 1-9 张） */}
        <ImageGrid images={item.images} onImagePress={onImagePress} colors={colors} />

        {/* 位置信息 */}
        {item.location && (
          <View style={styles.locationRow}>
            <IconSymbol name={"location.fill" as any} size={12} color={colors.muted} />
            <Text style={[styles.locationText, { color: colors.muted }]}>
              {item.location}
            </Text>
          </View>
        )}

        {/* 操作栏 */}
        <View style={styles.actionBar}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onLike();
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol
              name={item.isLiked ? ("heart.fill" as any) : ("heart" as any)}
              size={18}
              color={item.isLiked ? "#EF4444" : colors.muted}
            />
            <Text
              style={[
                styles.actionText,
                { color: item.isLiked ? "#EF4444" : colors.muted },
              ]}
            >
              {item.likeCount > 0 ? `${item.likeCount}` : "赞"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol
              name={"bubble.right.fill" as any}
              size={18}
              color={colors.muted}
            />
            <Text style={[styles.actionText, { color: colors.muted }]}>
              {item.commentCount > 0 ? `${item.commentCount}` : "评论"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol
              name={"square.and.arrow.up" as any}
              size={18}
              color={colors.muted}
            />
            <Text style={[styles.actionText, { color: colors.muted }]}>分享</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ========== 加载更多 Footer ==========
function LoadMoreFooter({
  loading,
  hasMore,
  colors,
}: {
  loading: boolean;
  hasMore: boolean;
  colors: any;
}) {
  if (!hasMore) {
    return (
      <View style={footerStyles.container}>
        <View style={[footerStyles.line, { backgroundColor: colors.border }]} />
        <Text style={[footerStyles.endText, { color: colors.muted }]}>
          已经到底啦
        </Text>
        <View style={[footerStyles.line, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={footerStyles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[footerStyles.loadingText, { color: colors.muted }]}>
          加载更多...
        </Text>
      </View>
    );
  }

  return <View style={{ height: 20 }} />;
}

const footerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 40,
    gap: 12,
  },
  line: {
    flex: 1,
    height: 0.5,
  },
  endText: {
    fontSize: 13,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
});

// ========== 主页面 ==========
const PAGE_SIZE = 10;
const MAX_PAGES = 5;

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isLoggedIn } = useCoSyncAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<PostData[]>(() => generateMockPosts(1, PAGE_SIZE));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  // 大图查看器状态
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<PostImage[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // 模拟网络请求
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const newPosts = generateMockPosts(1, PAGE_SIZE);
    setPosts(newPosts);
    pageRef.current = 1;
    setHasMore(true);
    setRefreshing(false);
  }, []);

  // 加载更多
  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // 模拟网络请求
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const nextPage = pageRef.current + 1;
    if (nextPage > MAX_PAGES) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }
    const morePosts = generateMockPosts(nextPage * PAGE_SIZE + 1, PAGE_SIZE);
    setPosts((prev) => [...prev, ...morePosts]);
    pageRef.current = nextPage;
    setLoadingMore(false);
  }, [loadingMore, hasMore]);

  const handlePostPress = (postId: number) => {
    router.push(`/post/${postId}` as any);
  };

  const handleLike = (postId: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p,
      ),
    );
  };

  const handleImagePress = (images: PostImage[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleCreatePost = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (!user?.isVerified) {
      router.push("/verify");
      return;
    }
    router.push("/post/create" as any);
  };

  const renderPost = useCallback(
    ({ item }: { item: PostData }) => (
      <PostCard
        item={item}
        onPress={() => handlePostPress(item.id)}
        onLike={() => handleLike(item.id)}
        onImagePress={(index) => handleImagePress(item.images, index)}
        colors={colors}
      />
    ),
    [colors],
  );

  // 刷新时显示骨架屏
  const ListHeaderSkeleton = refreshing ? (
    <View>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={`skeleton-${i}`} colors={colors} />
      ))}
    </View>
  ) : null;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>同频广场</Text>
      </View>

      {/* 动态列表 */}
      <FlatList
        data={refreshing ? [] : posts}
        keyExtractor={(item) => `post-${item.id}`}
        renderItem={renderPost}
        ListHeaderComponent={ListHeaderSkeleton}
        ListFooterComponent={
          !refreshing ? (
            <LoadMoreFooter loading={loadingMore} hasMore={hasMore} colors={colors} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
      />

      {/* FAB 发布按钮 */}
      <Pressable
        onPress={handleCreatePost}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary },
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      >
        <IconSymbol name={"plus" as any} size={28} color="#fff" />
      </Pressable>

      {/* 大图查看器 */}
      <ImageViewer
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: PADDING,
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
  card: {
    flexDirection: "row",
    paddingHorizontal: PADDING,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  genderBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  genderBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  cardBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  nickname: {
    fontSize: 15,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 12,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
  },
  actionBar: {
    flexDirection: "row",
    marginTop: 12,
    gap: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: "center",
  },
  actionText: {
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
