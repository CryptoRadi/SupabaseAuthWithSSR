'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'

export interface FeatureFlags {
  standardSearch: boolean
  perplexitySearch: boolean
  websiteSearch: boolean
  arabicLegalSearch: boolean
  documentUpload: boolean
  debugMode: boolean
}

export const useFeatureFlags = (): FeatureFlags => {
  const [flags, setFlags] = useState<FeatureFlags>({
    standardSearch: true, // Default values
    perplexitySearch: true,
    websiteSearch: false,
    arabicLegalSearch: false,
    documentUpload: true,
    debugMode: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateFlags = () => {
      setFlags({
        standardSearch: posthog.isFeatureEnabled('standard-search') ?? true,
        perplexitySearch: posthog.isFeatureEnabled('perplexity-search') ?? true,
        websiteSearch: posthog.isFeatureEnabled('website-search') ?? false,
        arabicLegalSearch: posthog.isFeatureEnabled('arabic-legal-search') ?? false,
        documentUpload: posthog.isFeatureEnabled('document-upload') ?? true,
        debugMode: posthog.isFeatureEnabled('debug-mode') ?? false,
      })
    }

    // Initial load
    updateFlags()

    // Listen for feature flag updates
    posthog.onFeatureFlags(updateFlags)

    return () => {
      // Cleanup if needed
    }
  }, [])

  return flags
} 