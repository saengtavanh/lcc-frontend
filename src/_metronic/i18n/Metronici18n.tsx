/* eslint-disable react-refresh/only-export-components */
import {FC, createContext, useContext, useState, useEffect} from 'react'
import {WithChildren} from '../helpers'

const I18N_CONFIG_KEY = import.meta.env.VITE_APP_I18N_CONFIG_KEY || 'i18nConfig'

type Props = {
  selectedLang: 'de' | 'en' | 'es' | 'fr' | 'ja' | 'zh'
  setLanguage: (lang: string) => void
}

const initialState: Props = {
  selectedLang: 'en',
  setLanguage: () => {},
}

function getConfig(): string {
  const ls = localStorage.getItem(I18N_CONFIG_KEY)
  if (ls) {
    try {
      return (JSON.parse(ls) as {selectedLang: string}).selectedLang
    } catch (er) {
      console.error(er)
    }
  }
  return 'en'
}

const I18nContext = createContext<Props>(initialState)

const useLang = () => {
  return useContext(I18nContext).selectedLang
}

const useSetLang = () => {
  return useContext(I18nContext).setLanguage
}

const MetronicI18nProvider: FC<WithChildren> = ({children}) => {
  const [lang, setLang] = useState(getConfig())

  const updateLang = (newLang: string) => {
    setLang(newLang)
    localStorage.setItem(I18N_CONFIG_KEY, JSON.stringify({selectedLang: newLang}))
  }

  return (
    <I18nContext.Provider value={{selectedLang: lang as any, setLanguage: updateLang}}>
      {children}
    </I18nContext.Provider>
  )
}

export {MetronicI18nProvider, useLang, useSetLang}
