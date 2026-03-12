import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/EmptyState';

export function PhotosPlaceholderScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { flexGrow: 1, padding: 16 },
  }), [colors]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <FlatList
      style={styles.container}
      data={[]}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <EmptyState
          icon="images-outline"
          title="Photos"
          subtitle="Daily moments. Photo sharing will be available in a future update."
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    />
  );
}
