import type {
  SearchRequest,
  SearchResponse,
  QASearchRequest,
  QASearchResponse,
  DiscoveryData
} from '@/types/legal-search';

/**
 * Search decision text chunks.
 * Proxied through Next.js → FastAPI backend.
 */
export async function searchDecisions(
  request: SearchRequest
): Promise<SearchResponse> {
  const response = await fetch('/api/legal-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `Search failed (${response.status})`);
  }

  return response.json();
}

/**
 * Search Q&A pairs from legal_qa_pairs collection.
 * Proxied through Next.js → FastAPI backend.
 */
export async function searchQA(
  request: QASearchRequest
): Promise<QASearchResponse> {
  const response = await fetch('/api/legal-search/qa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `QA search failed (${response.status})`);
  }

  return response.json();
}

/**
 * Fetch all discovery facets (courts, cities, court_types, etc.).
 * Proxied through Next.js → FastAPI backend.
 */
export async function getDiscoveryData(): Promise<DiscoveryData> {
  const response = await fetch('/api/legal-search/discovery');

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `Discovery failed (${response.status})`);
  }

  return response.json();
}
