import React, {useEffect, useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate, useParams} from 'react-router-dom'
import Button from 'react-bootstrap/Button'
import {checkLccPassword, fetchLccFile, LccFile} from './api'
import './lcc-details.css'

const LccPasswordGate: React.FC = () => {
  const {t} = useTranslation()
  const {id} = useParams<{id?: string}>()
  const navigate = useNavigate()
  const [file, setFile] = useState<LccFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    let ignore = false
    const loadFile = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await fetchLccFile(id)
        if (ignore) return
        setFile(payload)
      } catch (err) {
        console.error('Unable to load LCC file', err)
        if (!ignore) {
          setError(t('SERVER_CONNECTION_FAILED'))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    loadFile()
    return () => {
      ignore = true
    }
  }, [id])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('lcc-password-active')
    return () => {
      document.body.classList.remove('lcc-password-active')
    }
  }, [])

  const accessLink = useMemo(() => {
    if (!file?.link) return ''
    return encodeURI(file.link)
  }, [file?.link])

  const handleOpen = () => {
    if (!accessLink) return
    window.open(accessLink, '_blank', 'noopener')
  }

  const handleSubmit = async () => {
    if (!id) return
    const trimmed = password.trim()
    const key = `lcc_unlock_${id}`;
    if (!trimmed) {
      setError(t('PASSWORD_REQUIRED'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await checkLccPassword(id, trimmed)
      if (!result?.success) {
        setError(result?.message || t('LOGIN_FAILED'))
        setSubmitting(false)
        return
      }
      
      const token = result.token
      if (token) {
        window.location.replace(`https://r9j95nhk-5501.asse.devtunnels.ms/examples/three.html?id=${id}&token=${token}`)
        // Clean up session usage if we rely purely on token verification now, 
        // or keep logic if needed by other parts, but token flow is primary.
        sessionStorage.setItem(`lcc_unlock_${id}`, '1') 
      } else {
        setError('Server did not provide verification token.')
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || t('LOGIN_FAILED')
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!id) {
    return (
      <div className='lcc-password-page'>
        <div className='lcc-password-page__content'>
          <div className='lcc-password-page__title'>{t('INVALID_LINK')}</div>
          <div className='lcc-password-page__subtitle'>{t('MISSING_ID')}</div>
          <Button variant='primary' onClick={() => navigate('/kumonos/dashboard')}>
            {t('BACK_TO_DASHBOARD')}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='lcc-password-page'>
        <div className='lcc-password-page__content'>
          <div className='lcc-password-page__title'>{t('PLEASE_WAIT')}</div>
          <div className='lcc-password-page__subtitle'>{t('PREPARING_FILE')}</div>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className='lcc-password-page'>
        <div className='lcc-password-page__content'>
          <div className='lcc-password-page__title'>{t('FILE_NOT_FOUND')}</div>
          <div className='lcc-password-page__subtitle'>{t('CHECK_LINK_AGAIN')}</div>
          <Button variant='primary' onClick={() => navigate('/kumonos/dashboard')}>
            {t('BACK_TO_DASHBOARD')}
          </Button>
        </div>
      </div>
    )
  }

  if (!file.enablePassword) {
    return (
      <div className='lcc-password-page'>
        <div className='lcc-password-page__content'>
          <div className='lcc-password-page__title'>{file.name}</div>
          <div className='lcc-password-page__subtitle'>{t('NO_PASSWORD_REQUIRED')}</div>
          <Button variant='primary' onClick={handleOpen}>
            {t('OPEN_LCC_FILE')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='lcc-password-page'>
      <div className='lcc-password-page__content'>
        <div className='lcc-password-page__title'>{t('ENTER_PASSWORD')}</div>
        <div className='lcc-password-page__subtitle'>{file.name}</div>
        <div className={`lcc-password-page__input-row ${error ? 'is-invalid' : ''}`}>
          <input
            type='password'
            className='lcc-password-page__input'
            placeholder={t('ENTER_PASSWORD')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type='button'
            className='lcc-password-page__ok'
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t('PLEASE_WAIT') : t('OK')}
          </button>
        </div>
        {error && <div className='form-text text-danger mt-2'>{error}</div>}
      </div>
    </div>
  )
}

export {LccPasswordGate}
