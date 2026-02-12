import {useState, useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import * as Yup from 'yup'
import clsx from 'clsx'
import {useFormik} from 'formik'
import {testGetByEmail } from '../core/_requests'
import {toAbsoluteUrl} from '../../../../_metronic/helpers'
import {useAuth} from '../core/Auth'
import Swal from "sweetalert2";

const loginSchema = (t: any) => Yup.object().shape({
  email: Yup.string()
    .required(t('EMAIL_REQUIRED')),
  password: Yup.string()
    .required(t('PASSWORD_REQUIRED')),
})

const initialValues = {
  email: '',
  password: '',
}

export function Login() {
  const {t} = useTranslation()
  const [loading, setLoading] = useState(false)
  const {saveAuth, setCurrentUser} = useAuth()
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine)

  useEffect(() => {
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema(t),
    onSubmit: async (values, {setStatus, setSubmitting}) => {
      if (!navigator.onLine) {
        Swal.fire({
          icon: "error",
          title: "",
          text: t('NO_INTERNET'),
        })
        setSubmitting(false)
        return
      }
      setLoading(true);
      try {
        const initialValues = await testGetByEmail(values.email, values.password);
        if (initialValues.data == 'User not found') {
            Swal.fire({
              icon: "error",
              title: "",
              text: t('LOGIN_FAILED'),
            })
          
          setSubmitting(false)
          setLoading(false)
        }else {
          const {data: data } = await testGetByEmail(values.email, values.password);
          saveAuth(data[0])
          setCurrentUser(data[0])
        }
      } catch (err) {
        const error = err as {code?: string; message?: string} | undefined
        console.error(error)
        saveAuth(undefined)
        const message = error?.message?.toLowerCase?.() || ''
        const isNetworkError =
          error?.code === 'ERR_NETWORK' ||
          message.includes('network') ||
          message.includes('failed to fetch')
        if (isNetworkError || !navigator.onLine) {
          Swal.fire({
            icon: "error",
            title: "",
            text: t('SERVER_CONNECTION_FAILED'),
          })
        } else {
        setStatus(t('LOGIN_FAILED'))
        }
        setSubmitting(false)
        setLoading(false)
      }
    },
  })
  

  return (
    <form
      className='form w-100'
      onSubmit={formik.handleSubmit}
      noValidate
      id='kt_login_signin_form'
    >
      <div className='text-center mb-11'>
        <img src={toAbsoluteUrl('media/logos/kumonos_logo.png')} width="400" alt='logo' className='h-120px' />
      </div>
      {isOffline && (
        <div className='alert alert-danger py-2 mb-5 text-center'>
          {t('NO_INTERNET')}
        </div>
      )}

      {/* begin::Form group */}
      <div className='fv-row mb-8'>
        <label className='form-label fs-6 fw-bolder text-gray-900'>{t('EMAIL')}</label>
        <input
          placeholder={t('EMAIL')}
          {...formik.getFieldProps('email')}
          className={clsx(
            'form-control bg-transparent',
            {'is-invalid': formik.touched.email && formik.errors.email},
          )}
          type='email'
          name='email'
          autoComplete='off'
        />
        {formik.touched.email && formik.errors.email && (
          <div className='fv-plugins-message-container'>
            <span role='alert'>{formik.errors.email}</span>
          </div>
        )}
      </div>
      <div className='fv-row mb-3'>
        <label className='form-label fw-bolder text-gray-900 fs-6 mb-0'>{t('PASSWORD')}</label>
        <input
          type='password'
          autoComplete='off'
          {...formik.getFieldProps('password')}
          className={clsx(
            'form-control bg-transparent',
            {
              'is-invalid': formik.touched.password && formik.errors.password,
            }
          )}
        />
        {formik.touched.password && formik.errors.password && (
          <div className='fv-plugins-message-container'>
            <div className='fv-help-block'>
              <span role='alert'>{formik.errors.password}</span>
            </div>
          </div>
        )}
      </div>
      <div className='d-flex flex-stack flex-wrap gap-3 fs-base fw-semibold mb-8'>
      </div>
      <div className='d-grid mb-10'>
        <button
          type='submit'
          id='kt_sign_in_submit'
          className='btn btn-primary'
          disabled={formik.isSubmitting || !formik.isValid}
        >
          {!loading && <span className='indicator-label'>{t('LOGIN')}</span>}
          {loading && (
            <span className='indicator-progress' style={{display: 'block'}}>
              {t('PLEASE_WAIT')}
              <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
            </span>
          )}
        </button>
      </div>
    </form>
  )
}
