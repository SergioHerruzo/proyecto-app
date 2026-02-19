import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@indiegames-app/shared';

interface InfiniteListProps<T> {
  endpoint: string;
  limit?: number;
  renderItem: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string | number;
  title?: string;
  emptyMessage?: string;
}

export function InfiniteList<T>({ endpoint, limit = 10, renderItem, getItemKey, title, emptyMessage = 'No hay elementos disponibles' }: InfiniteListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [state, setState] = useState({ page: 0, loading: false, hasMore: true, error: '' });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (loadingRef.current || !state.hasMore) return;
      loadingRef.current = true;
      setState(s => ({ ...s, loading: true, error: '' }));
      try {
        const data = await apiClient<T[]>(`${endpoint}?page=${state.page}&size=${limit}`);
        setItems(prev => [...prev, ...data]);
        setState(s => ({ ...s, page: s.page + 1, hasMore: data.length >= limit, loading: false }));
      } catch (e: any) {
        setState(s => ({ ...s, error: e.message || 'Error', loading: false }));
        setTimeout(() => setState(s => ({ ...s, error: '' })), 3000);
      } finally {
        loadingRef.current = false;
      }
    };

    const observer = new IntersectionObserver(([e]) => e.isIntersecting && load(), { threshold: 0.1 });
    sentinelRef.current && observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [endpoint, limit, state.page, state.hasMore]);

  return (
    <div style={{ padding: 20 }}>
      {title && <h1>{title}</h1>}
      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {items.map(item => <div key={getItemKey(item)}>{renderItem(item)}</div>)}
      </div>
      {state.loading && <p>Cargando...</p>}
      {!state.hasMore && items.length > 0 && <p>{emptyMessage}</p>}
      <div ref={sentinelRef} style={{ height: 20 }} />
    </div>
  );
}
