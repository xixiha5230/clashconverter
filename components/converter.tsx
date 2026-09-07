'use client';

import { useTranslations } from 'next-intl';
import { ConverterHeader } from './converter-header';
import { SubscriptionPanel } from './subscription-panel';

export function Converter() {
  const t = useTranslations();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 lg:py-16 space-y-6 md:space-y-8">
      {/* Header - Entrance with stagger */}
      <ConverterHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Hosted subscription link generator */}
      <SubscriptionPanel />
    </div>
  );
}