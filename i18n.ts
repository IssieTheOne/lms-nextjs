import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  // If invalid or undefined, default to 'en'
  const validLocale = locale && ['en', 'fr', 'ar'].includes(locale) ? locale : 'en';

  return {
    messages: (await import(`./messages/${validLocale}.json`)).default,
    locale: validLocale
  };
});