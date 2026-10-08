import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * The content is a ScrollView/FlatList spread with `keyboardScrollProps`. iOS then insets and
   * scrolls to the focused input natively, so padding is only added on Android.
   */
  scroll?: boolean;
};

/**
 * Keeps inputs above the keyboard on both platforms. Android draws edge-to-edge (Expo SDK 54+),
 * so the window is no longer resized for the keyboard and the padding has to come from here.
 * The offset is measured rather than passed in because KeyboardAvoidingView compares the keyboard
 * position with its own parent-relative frame, which differs under headers and inside modals.
 */
export function KeyboardAvoider({ children, style, scroll = false }: Props) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((_x, y) => setOffset((prev) => (prev === y ? prev : y)));
  }, []);

  return (
    <View ref={ref} style={[styles.flex, style]} onLayout={onLayout}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        enabled={!(scroll && Platform.OS === 'ios')}
        keyboardVerticalOffset={offset}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Spread on every ScrollView/FlatList that contains inputs. */
export const keyboardScrollProps: Pick<
  ScrollViewProps,
  'keyboardShouldPersistTaps' | 'keyboardDismissMode' | 'automaticallyAdjustKeyboardInsets'
> = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
  automaticallyAdjustKeyboardInsets: true,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
