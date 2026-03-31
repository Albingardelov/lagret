import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import dayjs from 'dayjs'
import 'dayjs/locale/sv'
import 'dayjs/locale/en'

import sv from './sv.json'
import en from './en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { sv: { translation: sv }, en: { translation: en } },
    fallbackLng: 'sv',
    supportedLngs: ['sv', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lagret:language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

const syncDayjs = (lang: string) => dayjs.locale(lang.startsWith('en') ? 'en' : 'sv')
syncDayjs(i18n.language)
i18n.on('languageChanged', syncDayjs)

export default i18n
