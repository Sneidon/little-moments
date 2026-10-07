import { useCallback, useState } from 'react';

export function useRefreshPulse(durationMs = 400) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), durationMs);
  }, [durationMs]);
  return { refreshing, onRefresh };
}
