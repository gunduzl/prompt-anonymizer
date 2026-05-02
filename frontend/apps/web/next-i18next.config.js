module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'tr'],
    localePath: './public/locales',
    localeDetection: false,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
}