'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

export interface FeatureFlags {
  legalSearch: boolean;
  debugMode: boolean;
}

export const useFeatureFlags = (): FeatureFlags => {
  const [flags, setFlags] = useState<FeatureFlags>({
    legalSearch: true,
    debugMode: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateFlags = () => {
      setFlags({
        legalSearch:
          posthog.isFeatureEnabled('legal-search') ?? true,
        debugMode: posthog.isFeatureEnabled('debug-mode') ?? false
      });
    };

    updateFlags();
    posthog.onFeatureFlags(updateFlags);
  }, []);

  return flags;
};
