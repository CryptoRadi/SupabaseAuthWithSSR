'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { searchDecisions, searchQA, getDiscoveryData } from './api';
import type {
  SearchRequest,
  SearchResponse,
  QASearchRequest,
  QASearchResponse,
  DiscoveryData,
  SearchFilters
} from '@/types/legal-search';

/**
 * Hook for discovery facet data (courts, cities, categories, etc.).
 * Uses SWR for caching — data doesn't change frequently.
 */
export function useDiscovery() {
  return useSWR<DiscoveryData>('legal-search-discovery', getDiscoveryData, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000 // 5 min cache
  });
}

/**
 * Hook for text search on decision chunks.
 * Returns search function + state (results, loading, error).
 */
export function useTextSearch() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (request: SearchRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await searchDecisions(request);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, search, reset };
}

/**
 * Hook for Q&A search on legal_qa_pairs collection.
 * Returns search function + state (results, loading, error).
 */
export function useQASearch() {
  const [data, setData] = useState<QASearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (request: QASearchRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await searchQA(request);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QA search failed');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, search, reset };
}

/**
 * Hook for managing search filters state.
 */
export function useSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters>({});

  const setFilter = useCallback(
    (key: keyof SearchFilters, value: string | undefined) => {
      setFilters((prev) => {
        if (value === undefined) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasFilters = Object.keys(filters).length > 0;

  return { filters, setFilter, clearFilters, hasFilters };
}
