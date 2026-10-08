import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const DOT = 12;

export function SavingIndicator() {
  const { category } = useTheme();
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const bounce = (v: Animated.Value) =>
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]);
    const loop = Animated.loop(Animated.sequence([Animated.stagger(140, dots.map(bounce)), Animated.delay(160)]));
    loop.start();
    return () => loop.stop();
  }, [dots]);

  const colors = [category.meal, category.nap, category.attendance];
  return (
    <View style={styles.row}>
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: colors[i],
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, height: DOT + 12, alignItems: 'flex-end' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
