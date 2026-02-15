// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for CoSync app.
 */
const MAPPING = {
  // Tab bar icons
  "house.fill": "home",
  "square.grid.2x2.fill": "apps",
  "bubble.left.and.bubble.right.fill": "forum",
  "magnifyingglass": "search",
  "person.fill": "person",
  // Navigation & actions
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "plus": "add",
  "xmark": "close",
  "checkmark": "check",
  "arrow.left": "arrow-back",
  // Content
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "bubble.right.fill": "chat-bubble",
  "photo.fill": "photo",
  "camera.fill": "camera-alt",
  // Profile & settings
  "gearshape.fill": "settings",
  "pencil": "edit",
  "rectangle.portrait.and.arrow.right": "logout",
  // Security & verification
  "shield.checkmark.fill": "verified-user",
  "lock.fill": "lock",
  "shield.fill": "shield",
  // Messaging
  "ellipsis.bubble.fill": "message",
  "person.2.fill": "group",
  "plus.bubble.fill": "add-comment",
  "photo.on.rectangle": "photo-library",
  "location.fill": "location-on",
  "square.and.arrow.up": "share",
  "ellipsis": "more-horiz",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
