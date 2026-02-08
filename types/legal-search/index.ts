/**
 * Legal Search Types
 *
 * These types mirror the FastAPI backend Pydantic models exactly.
 * Backend: legal-search-backend/main.py
 */

// ============================================================
// Search (Text/Chunks) — POST /api/v1/search
// ============================================================

export interface SearchRequest {
  query_text: string;
  limit?: number; // 1-100, default 10
  filters?: SearchFilters;
  use_hybrid?: boolean; // default true
}

export interface SearchResult {
  id: string | number;
  score: number;
  chunk_id: string;
  text: string;
  section: string;
  decision_id: string;
  legal_category: string;
  quality_score: number;
  entities: Record<string, unknown>;
  court_type: number;
  city: string;
  case_number: string;
  // AI-generated display fields
  ai_descriptive_title: string;
  ai_short_description: string;
  ai_main_topics: string[];
  ai_key_entities: string[];
  ai_legal_areas: string[];
  ai_court_level: string;
  ai_decision_type: string;
  ai_legal_principles: string[];
  ai_cited_laws: string[];
  // Q&A metadata
  has_qa_pairs: boolean;
  qa_count: number;
  metadata: Record<string, unknown>;
  // Hybrid search fields (optional)
  rrf_score?: number;
  dense_rank?: number;
  sparse_rank?: number;
  dense_score?: number;
  sparse_score?: number;
  fusion_method?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

// ============================================================
// Synthesis — POST /api/v1/search/synthesis
// ============================================================

export interface SynthesisResponse {
  query: string;
  total_results: number;
  search_method: string;
  context_chunks: Record<string, unknown>[];
  sources: Record<string, unknown>[];
  metadata_summary: Record<string, unknown>;
  error?: string;
}

// ============================================================
// Q&A Search — POST /api/v1/search/qa
// ============================================================

export interface QASearchRequest {
  question: string;
  filters?: SearchFilters;
  limit?: number; // 1-50, default 10
  score_threshold?: number; // 0.0-1.0, default 0.7
}

export interface MatchedQA {
  // Q&A content (primary)
  qa_id: string;
  question: string;
  answer: string;
  legal_principle: string;
  confidence?: number;
  score: number;
  // Source decision identifiers
  decision_id: string;
  case_number: string;
  // Source decision metadata (for filtering/display)
  court_name: string;
  city: string;
  court_type: string;
  content_type?: string;
  legal_category: string;
  // Additional metadata
  question_type: string;
  embedding_model: string;
}

export interface QASearchResponse {
  total_results: number;
  results: MatchedQA[];
  filters_applied?: Record<string, unknown>;
}

// ============================================================
// Discovery — GET /api/v1/discovery/all
// ============================================================

export interface FacetItem {
  value: string;
  count: number;
}

export interface DiscoveryData {
  courts: FacetItem[];
  cities: FacetItem[];
  court_types: FacetItem[];
  legal_categories: FacetItem[];
  content_types: FacetItem[];
}

// ============================================================
// Shared — Filters
// ============================================================

export interface SearchFilters {
  court_name?: string;
  city?: string;
  court_type?: string;
  content_type?: string;
  legal_category?: string;
  decision_id?: string;
}
