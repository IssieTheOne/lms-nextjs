import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !['en', 'fr', 'ar'].includes(locale)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    locale
  };
});