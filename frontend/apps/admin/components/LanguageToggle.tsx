import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { Globe } from 'lucide-react'

export default function LanguageToggle() {
  const { t } = useTranslation('common')
  const router = useRouter()

  const toggleLanguage = () => {
    const newLocale = router.locale === 'en' ? 'tr' : 'en'
    router.push(router.asPath, router.asPath, { locale: newLocale })
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      title={t('language.toggle')}
    >
      <Globe size={16} />
      <span className="text-sm font-medium">
        {router.locale === 'en' ? 'EN' : 'TR'}
      </span>
    </button>
  )
}