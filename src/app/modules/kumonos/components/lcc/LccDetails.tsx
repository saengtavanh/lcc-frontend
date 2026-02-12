import React, {useEffect, useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import axios from 'axios'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import {useNavigate, useParams} from 'react-router-dom'
import {KTIcon} from '../../../../../_metronic/helpers'
import {useAuth} from '../../../auth'
import {
  createLccFile,
  deleteLccFile,
  fetchFolderDetails,
  LccFile,
  LccFolderDetails,
  updateCompany,
  updateLccFile,
  updateLccFolder,
} from './api'
import {
  LCC_FILES_CHANGED_EVENT,
  LCC_OPEN_ADD_DATA_EVENT,
  LCC_TREE_CHANGED_EVENT,
  LccFilesChangedDetail,
} from './events'
import Swal from 'sweetalert2'
import './lcc-details.css'

type EditModalState = {
  open: boolean
  mode: 'edit' | 'upload'
  file: LccFile | null
  values: {
    name: string
    link: string
  }
  saving: boolean
  selectedFolder: string | null
  uploadFiles: File[]
  uploadStatus: string
  uploadProgress: number
  enablePassword: boolean
  password: string
  confirmPassword: string
  resetPassword: boolean
}

const generatePassword = (len: number) => {
  const digits = '0123456789'
  let out = ''
  for (let i = 0; i < len; i += 1) {
    out += digits[Math.floor(Math.random() * digits.length)]
  }
  return out
}

const INITIAL_EDIT_STATE: EditModalState = {
  open: false,
  mode: 'edit',
  file: null,
  values: {name: '', link: ''},
  saving: false,
  selectedFolder: null,
  uploadFiles: [],
  uploadStatus: '',
  uploadProgress: 0,
  enablePassword: false,
  password: '',
  confirmPassword: '',
  resetPassword: false,
}

const LccDetails: React.FC = () => {
  const {t} = useTranslation()
  const navigate = useNavigate()
  const {folderId} = useParams<{companyId?: string; folderId?: string}>()
  const {currentUser} = useAuth()
  const userId = currentUser?._id ? String(currentUser._id) : undefined
  const isAdmin = currentUser?.role === 'administrator'
  const LS_ACTIVE_KEY = 'aside.dynamic.active'
  const LS_OPEN_ADD_DATA_KEY = 'lcc.open-add-data'
  // Force upload base to localhost:9000 as requested
  const UPLOAD_API_BASE = 'http://localhost:9000'
  const [hasRestoredSelection, setHasRestoredSelection] = useState(false)

  const [details, setDetails] = useState<LccFolderDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<EditModalState>(INITIAL_EDIT_STATE)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [companyModal, setCompanyModal] = useState({
    open: false,
    name: '',
    saving: false,
    error: '',
  })
  const [projectModal, setProjectModal] = useState({
    open: false,
    name: '',
    saving: false,
    error: '',
  })
  const duplicateMessages = new Set([
    t("COMPANY_ALREADY_EXISTS"),
    t("PROJECT_ALREADY_EXISTS"),
    t("TITLE_ALREADY_EXISTS"),
  ])

  const hasSelection = Boolean(folderId)

  useEffect(() => {
    setEditModal(INITIAL_EDIT_STATE)
    setPage(1)
  }, [folderId])

  useEffect(() => {
    if (hasSelection || hasRestoredSelection) return
    try {
      const raw = localStorage.getItem(LS_ACTIVE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {path?: string}
      if (parsed?.path) {
        setHasRestoredSelection(true)
        navigate(parsed.path, {replace: true})
      }
    } catch {
      // ignore parse errors
    }
  }, [hasSelection, hasRestoredSelection, navigate])

  useEffect(() => {
    let ignore = false

    const loadDetails = async () => {
      if (!folderId) {
        setDetails(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await fetchFolderDetails(folderId)
        if (!ignore) {
          setDetails(response)
        }
      } catch (err) {
        console.error('Unable to load folder details', err)
        if (!ignore) {
          setError(t('SERVER_CONNECTION_FAILED'))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadDetails()

    return () => {
      ignore = true
    }
  }, [folderId, refreshKey])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleFilesChanged = (event: Event) => {
      const detail = (event as CustomEvent<LccFilesChangedDetail>).detail
      if (detail?.folderId === folderId) {
        setRefreshKey((prev) => prev + 1)
      }
    }

    window.addEventListener(LCC_FILES_CHANGED_EVENT, handleFilesChanged)
    return () => {
      window.removeEventListener(LCC_FILES_CHANGED_EVENT, handleFilesChanged)
    }
  }, [folderId])

  useEffect(() => {
    if (!folderId) return
    const pending = localStorage.getItem(LS_OPEN_ADD_DATA_KEY)
    if (pending && pending === folderId) {
      openUploadModal(details?.folder?.name)
      localStorage.removeItem(LS_OPEN_ADD_DATA_KEY)
    }
  }, [folderId, details?.folder?.name])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleOpenAddData = (event: Event) => {
      const detail = (event as CustomEvent<{folderId?: string; folderName?: string}>).detail
      if (!detail?.folderId || detail.folderId !== folderId) return
      openUploadModal(detail.folderName)
    }
    window.addEventListener(LCC_OPEN_ADD_DATA_EVENT, handleOpenAddData)
    return () => {
      window.removeEventListener(LCC_OPEN_ADD_DATA_EVENT, handleOpenAddData)
    }
  }, [folderId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleTreeChanged = () => {
      setRefreshKey((prev) => prev + 1)
    }
    window.addEventListener(LCC_TREE_CHANGED_EVENT, handleTreeChanged)
    return () => {
      window.removeEventListener(LCC_TREE_CHANGED_EVENT, handleTreeChanged)
    }
  }, [])

  const getAccessLink = (fileId: string) => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/kumonos/lcc-access/${fileId}`
  }

  const handleCopyLink = async (file: LccFile) => {
    const shareLink = file.enablePassword ? getAccessLink(file.id) : `http://localhost:5174?id=${file.id}`
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = shareLink
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedFileId(file.id)
      setTimeout(() => {
        setCopiedFileId((prev) => (prev === file.id ? null : prev))
      }, 2000)
    } catch (err) {
      console.error('Unable to copy link', err)
    }
  }

  const handleView = (file: LccFile) => {
    // if (file.enablePassword) {
    //   navigate(`/kumonos/lcc-access/${file.id}`)
    //   return
    // }
    // if (file.link) {
    //   const encodedLink = encodeURI(file.link)
    //   window.open(encodedLink, '_blank', 'noopener')
    // }
    window.open(`https://r9j95nhk-5501.asse.devtunnels.ms/examples/three.html?id=${file.id}`, '_blank', 'noopener')
  }

  const getReplaceFolderId = (link?: string) => {
    if (!link) return ''
    try {
      const url = new URL(link)
      const marker = '/uploads/'
      const idx = url.pathname.indexOf(marker)
      if (idx === -1) return ''
      const remainder = url.pathname.slice(idx + marker.length)
      const parts = remainder.split('/').filter(Boolean)
      return parts.length >= 3 ? parts[2] : ''
    } catch {
      return ''
    }
  }

  const openEditModal = (file: LccFile) => {
    setEditModal({
      open: true,
      mode: 'edit',
      file,
      values: {name: file.name, link: file.link},
      saving: false,
      selectedFolder: null,
      uploadFiles: [],
      uploadStatus: '',
      uploadProgress: 0,
      enablePassword: Boolean(file.enablePassword),
      password: '',
      confirmPassword: '',
      resetPassword: false,
    })
  }

  const openUploadModal = (folderName?: string) => {
    setEditModal({
      open: true,
      mode: 'upload',
      file: null,
      values: {name: folderName ?? details?.folder?.name ?? '', link: ''},
      saving: false,
      selectedFolder: null,
      uploadFiles: [],
      uploadStatus: '',
      uploadProgress: 0,
      enablePassword: false,
      password: '',
      confirmPassword: '',
      resetPassword: false,
    })
  }

  const closeEditModal = () => {
    setEditModal(INITIAL_EDIT_STATE)
    setShowPassword(false)
    setCopiedPassword(false)
  }

  const openCompanyModal = () => {
    setCompanyModal({
      open: true,
      name: details?.company?.name ?? '',
      saving: false,
      error: '',
    })
  }

  const closeCompanyModal = () =>
    setCompanyModal({
      open: false,
      name: '',
      saving: false,
      error: '',
    })

  const openProjectModal = () => {
    setProjectModal({
      open: true,
      name: details?.folder?.name ?? '',
      saving: false,
      error: '',
    })
  }

  const closeProjectModal = () =>
    setProjectModal({
      open: false,
      name: '',
      saving: false,
      error: '',
    })

  const submitCompanyEdit = async () => {
    if (!details?.company?.id) return
    const trimmedName = companyModal.name.trim()
    if (!trimmedName) {
      setCompanyModal((prev) => ({...prev, error: `${t('COMPANY_NAME')} ${t('IS_REQUIRED')}`}))
      return
    }
    setCompanyModal((prev) => ({...prev, saving: true, error: ''}))
    try {
      const updated = await updateCompany(details.company.id, {
        name: trimmedName,
        ...(userId ? {updatedBy: userId} : {}),
      })
      setDetails((prev) =>
        prev
          ? {
              ...prev,
              company: prev.company ? {...prev.company, name: updated.name} : prev.company,
            }
          : prev
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LCC_TREE_CHANGED_EVENT))
      }
      closeCompanyModal()
    } catch (err) {
      const message = (err as any)?.response?.data?.message
      if (message && duplicateMessages.has(message)) {
        setCompanyModal((prev) => ({...prev, saving: false, error: message}))
        return
      }
      console.error(t('UNABLE_TO_UPDATE_COMPANY'), err)
      setCompanyModal((prev) => ({...prev, saving: false, error: t('SERVER_ERROR')}))
    }
  }

  const submitProjectEdit = async () => {
    if (!details?.folder?.id) return
    const trimmedName = projectModal.name.trim()
    if (!trimmedName) {
      setProjectModal((prev) => ({...prev, error: `${t('PROJECT_NAME')} ${t('IS_REQUIRED')}`}))
      return
    }
    setProjectModal((prev) => ({...prev, saving: true, error: ''}))
    try {
      const updated = await updateLccFolder(details.folder.id, {
        name: trimmedName,
        ...(userId ? {updatedBy: userId} : {}),
      })
      setDetails((prev) =>
        prev
          ? {
              ...prev,
              folder: {...prev.folder, name: updated.name},
            }
          : prev
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LCC_TREE_CHANGED_EVENT))
      }
      closeProjectModal()
    } catch (err) {
      const message = (err as any)?.response?.data?.message
      if (message && duplicateMessages.has(message)) {
        setProjectModal((prev) => ({...prev, saving: false, error: message}))
        return
      }
      console.error(t('UNABLE_TO_UPDATE_PROJECT'), err)
      setProjectModal((prev) => ({...prev, saving: false, error: t('UNABLE_TO_UPDATE_PROJECT')}))
    }
  }

  const submitEdit = async () => {
    if (editModal.mode === 'upload') {
      if (!details?.folder?.id) return
      if (!editModal.values.name.trim()) {
        setEditModal((prev) => ({...prev, uploadStatus: `error: ${t('TITLE_NAME')} ${t('IS_REQUIRED')}`}))
        return
      }
      if (editModal.uploadFiles.length === 0) {
        setEditModal((prev) => ({...prev, uploadStatus: `error: ${t('CHOOSE_ZIP_TO_UPLOAD')}`}))
        return
      }
      if (editModal.enablePassword) {
        const pwd = editModal.password.trim()
        if (!pwd) {
          setEditModal((prev) => ({...prev, uploadStatus: t('PASSWORD_REQUIRED')}))
          return
        }
        if (pwd.length < 8) {
          setEditModal((prev) => ({...prev, uploadStatus: t('PASSWORD_MIN_LENGTH')}))
          return
        }
        if (pwd !== editModal.confirmPassword.trim()) {
          setEditModal((prev) => ({...prev, uploadStatus: t('PASSWORD_MATCH')}))
          return
        }
      }

      const formData = new FormData()
      formData.append('companyName', details.company?.name ?? 'company_default')
      formData.append('projectName', details.folder.name ?? 'project_default')
      formData.append('titleName', editModal.values.name.trim())
      formData.append('file', editModal.uploadFiles[0])

      setEditModal((prev) => ({...prev, saving: true, uploadStatus: t('UPLOADING'), uploadProgress: 0}))
      try {
        const response = await axios.post(`${UPLOAD_API_BASE}/upload`, formData, {
          headers: {'Content-Type': 'multipart/form-data'},
          onUploadProgress: (event) => {
            if (!event.total) return
            const percent = Math.round((event.loaded * 100) / event.total)
            setEditModal((prev) => ({...prev, uploadProgress: percent}))
          },
        })

        if (!response) {
          setEditModal((prev) => ({
            ...prev,
            saving: false,
            uploadStatus: `error: ${t('UPLOAD_FAILED')}`,
            uploadProgress: 0,
          }))
          return
        }

        if (response.status >= 400) {
          const message = (response as any)?.data?.message || t('UPLOAD_FAILED')
          setEditModal((prev) => ({
            ...prev,
            saving: false,
            uploadStatus: `error: ${message}`,
            uploadProgress: 0,
          }))
          return
        }

        const folderUrl: string | undefined = response.data?.folderUrl
        const entryFile: string | undefined = response.data?.entryFile
        setEditModal((prev) => ({...prev, uploadStatus: t('SUCCESS'), uploadProgress: 100}))

        if (!folderUrl || !entryFile) {
          setEditModal((prev) => ({
            ...prev,
            saving: false,
            uploadStatus: `error: ${t('ZIP_NO_LCC')}`,
          }))
          return
        }

        const friendlyName = editModal.values.name.trim()

        await createLccFile(details.folder.id, {
          name: friendlyName,
          link: `${UPLOAD_API_BASE}${folderUrl}/${entryFile}`,
          enablePassword: editModal.enablePassword,
          password: editModal.enablePassword ? editModal.password.trim() : undefined,
          ...(userId ? {createdBy: userId, updatedBy: userId} : {}),
        })

        setEditModal((prev) => ({
          ...prev,
          uploadStatus: t('SUCCESS'),
          uploadProgress: 100,
        }))

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent<LccFilesChangedDetail>(LCC_FILES_CHANGED_EVENT, {
              detail: {folderId: details.folder.id},
            })
          )
        }

        setTimeout(() => {
          setEditModal(INITIAL_EDIT_STATE)
        }, 500)
      } catch (err) {
        const message = (err as any)?.response?.data?.message
        if (message && duplicateMessages.has(message)) {
          Swal.fire({icon: 'error', title: t('DUPLICATE_NAME'), text: message})
          closeEditModal()
          return
        }
        console.error(t('UNABLE_TO_UPLOAD_LCC'), err)
        setEditModal((prev) => ({
          ...prev,
          saving: false,
          uploadStatus: t('UPLOAD_FAILED'),
          uploadProgress: 0,
        }))
      }
      return
    }

    if (!editModal.file) return
    if (!editModal.values.name.trim()) {
      setEditModal((prev) => ({...prev, uploadStatus: `error: ${t('TITLE_NAME')} ${t('IS_REQUIRED')}`}))
      return
    }
    if (editModal.enablePassword && (editModal.resetPassword || !editModal.file.enablePassword)) {
      const pwd = editModal.password.trim()
      if (!pwd) {
        setEditModal((prev) => ({...prev, uploadStatus: t('PASSWORD_REQUIRED')}))
        return
      }
      if (pwd.length < 8) {
        setEditModal((prev) => ({...prev, uploadStatus: t('PASSWORD_MIN_LENGTH')}))
        return
      }
      if (pwd !== editModal.confirmPassword.trim()) {
        setEditModal((prev) => ({...prev, uploadStatus: t('PASSWORD_MATCH')}))
        return
      }
    }
    setEditModal((prev) => ({...prev, saving: true}))
    try {
      let nextLink = editModal.values.link.trim()

      if (editModal.uploadFiles.length > 0) {
        if (!details?.folder?.id) return
        const formData = new FormData()
        formData.append('companyName', details.company?.name ?? 'company_default')
        formData.append('projectName', details.folder.name ?? 'project_default')
        formData.append('titleName', editModal.values.name.trim())
        const replaceFolderId = getReplaceFolderId(editModal.file?.link)
        if (replaceFolderId) {
          formData.append('replaceFolderId', replaceFolderId)
        }
        formData.append('file', editModal.uploadFiles[0])

        setEditModal((prev) => ({...prev, uploadStatus: t('UPLOADING'), uploadProgress: 0}))
        const response = await axios.post(`${UPLOAD_API_BASE}/upload`, formData, {
          headers: {'Content-Type': 'multipart/form-data'},
          onUploadProgress: (event) => {
            if (!event.total) return
            const percent = Math.round((event.loaded * 100) / event.total)
            setEditModal((prev) => ({...prev, uploadProgress: percent}))
          },
        })

        if (!response || response.status >= 400) {
          const message = (response as any)?.data?.message || t('UPLOAD_FAILED')
          setEditModal((prev) => ({
            ...prev,
            saving: false,
            uploadStatus: `error: ${message}`,
            uploadProgress: 0,
          }))
          return
        }

        const folderUrl: string | undefined = response.data?.folderUrl
        const entryFile: string | undefined = response.data?.entryFile
        if (!folderUrl || !entryFile) {
          setEditModal((prev) => ({
            ...prev,
            saving: false,
            uploadStatus: `error: ${t('ZIP_NO_LCC')}`,
          }))
          return
        }
        nextLink = `${UPLOAD_API_BASE}${folderUrl}/${entryFile}`
      }

      const updated = await updateLccFile(editModal.file.id, {
        name: editModal.values.name.trim(),
        link: nextLink,
        enablePassword: editModal.enablePassword,
        password:
          editModal.enablePassword && (editModal.resetPassword || !editModal.file.enablePassword)
            ? editModal.password.trim()
            : undefined,
        ...(userId ? {updatedBy: userId} : {}),
      })
      setDetails((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.map((file) => (file.id === updated.id ? updated : file)),
            }
          : prev
      )
      closeEditModal()
    } catch (err) {
      const message = (err as any)?.response?.data?.message
      if (message && duplicateMessages.has(message)) {
        Swal.fire({icon: 'error', title: t('DUPLICATE_NAME'), text: message})
        closeEditModal()
      }
      console.error(t('UNABLE_TO_UPDATE_LCC'), err)
      setEditModal((prev) => ({...prev, saving: false}))
    }
  }

  const handleDelete = async (file: LccFile) => {
    if (!details?.folder?.id) return
    const confirmed = await Swal.fire({
      title: t('ARE_YOU_SURE'),
      text: `${t('DELETE')} "${file.name}"? ${t('REVERT_NOTICE')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t('DELETE'),
      cancelButtonText: t('CANCEL'),
      focusCancel: true,
    })
    if (!confirmed.isConfirmed) return

    setDeletingId(file.id)
    try {
      await deleteLccFile(file.id)
      setDetails((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.filter((f) => f.id !== file.id),
            }
          : prev
      )

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<LccFilesChangedDetail>(LCC_FILES_CHANGED_EVENT, {
            detail: {folderId: details.folder.id},
          })
        )
      }
    } catch (err) {
      console.error(t('UNABLE_TO_DELETE_LCC'), err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopyPassword = async () => {
    if (!editModal.password) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(editModal.password)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = editModal.password
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 1500)
    } catch (err) {
      console.error(t('UNABLE_TO_COPY_PASSWORD'), err)
    }
  }

  const passwordValue = editModal.password.trim()
  const confirmValue = editModal.confirmPassword.trim()
  const passwordTooShort =
    editModal.enablePassword && passwordValue.length > 0 && passwordValue.length < 8
  const passwordMissing = editModal.enablePassword && passwordValue.length === 0
  const confirmMissing = editModal.enablePassword && confirmValue.length === 0
  const confirmMismatch =
    editModal.enablePassword && confirmValue.length > 0 && passwordValue !== confirmValue

  const files = useMemo(() => details?.files ?? [], [details])
  const totalPages = Math.max(1, Math.ceil(files.length / pageSize))
  const pagedFiles = useMemo(() => {
    const start = (page - 1) * pageSize
    return files.slice(start, start + pageSize)
  }, [files, page, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  return (
    <div className='card lcc-data-card'>
      <div className='card-body lcc-data-card__body'>
        {hasSelection && (
          <>
            <div className='d-flex flex-wrap justify-content-between align-items-start mb-6'>
              <div className='pe-3'>
                <h2 className='fw-semibold mb-2'>{t('LCC_DATA')}</h2>
                <div className='text-muted lcc-description'>
                  {t('MANAGE_FILES_DESCRIPTION')}
                </div>
              </div>
            </div>

            <div className='row g-4 align-items-end mb-8'>
              <div className='col-12 col-md-6 col-lg-4'>
                <div className='text-muted fw-semibold mb-1'>{t('COMPANY_NAME')}</div>
                <div className='d-flex align-items-center gap-2'>
                  <div className='fw-semibold text-gray-900'>{details?.company?.name ?? '-'}</div>
                  {details?.company?.id && (
                    <button
                      type='button'
                      className='btn btn-icon btn-sm btn-light-primary'
                      onClick={openCompanyModal}
                    >
                      <i className='bi bi-pencil-square'></i>
                    </button>
                  )}
                </div>
              </div>
              <div className='col-12 col-md-6 col-lg-4'>
                <div className='text-muted fw-semibold mb-1'>{t('PROJECT_NAME')}</div>
                <div className='d-flex align-items-center gap-2'>
                  <div className='fw-semibold text-gray-900'>{details?.folder?.name ?? '-'}</div>
                  {details?.folder?.id && (
                    <button
                      type='button'
                      className='btn btn-icon btn-sm btn-light-primary'
                      onClick={openProjectModal}
                    >
                      <i className='bi bi-pencil-square'></i>
                    </button>
                  )}
                </div>
              </div>
              <div className='col-12 col-md-12 col-lg-4 d-flex justify-content-lg-end'>
                <button
                  type='button'
                  className='btn btn-sm btn-light-primary d-inline-flex align-items-center gap-2 px-4 shadow-sm rounded-2'
                  onClick={() => {
                    setEditModal({
                      open: true,
                      mode: 'upload',
                      file: null,
                      values: {name: details?.folder?.name ?? '', link: ''},
                      saving: false,
                      selectedFolder: null,
                      uploadFiles: [],
                      uploadStatus: '',
                      uploadProgress: 0,
                      enablePassword: false,
                      password: '',
                      confirmPassword: '',
                      resetPassword: false,
                    })
                  }}
                >
                  <i className='bi bi-upload'></i>
                  <span>{t('UPLOAD')}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {!loading && !error && !hasSelection && (
          <div className='border border-dashed rounded p-10 text-center text-muted lcc-empty-state'>
            {t('SELECT_COMPANY_LCC_PROJECT')}
          </div>
        )}

        {error && (
          <div className='alert alert-danger d-flex align-items-center mb-6'>
            <span className='svg-icon svg-icon-2hx svg-icon-danger me-4'>
              <KTIcon iconName='information-5' className='fs-2 text-danger' />
            </span>
            <div>
              <h4 className='mb-1 text-danger'>{t('ERROR')}</h4>
              <div className='text-gray-700'>{error}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className='d-flex justify-content-center my-10'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>{t('PLEASE_WAIT')}</span>
            </div>
          </div>
        )}

        {!loading && hasSelection && !error && (
          <div className='d-flex flex-column gap-4 lcc-data-content'>
            {files.length === 0 && (
              <div className='border border-dashed rounded p-10 text-center text-muted'>
                {t('NO_LCC_DATA')}
              </div>
            )}

            {files.length > 0 && (
              <div className='border rounded-3' style={{overflow: 'auto'}}>
                {pagedFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    className={`lcc-file-row p-3 p-md-4 ${idx !== pagedFiles.length - 1 ? 'border-bottom' : ''}`}
                  >
                    <div className='lcc-col-name'>
                      <div className='text-muted text-uppercase small fw-semibold mb-1'>{t('TITLE_NAME')}</div>
                      <div className='fw-semibold fs-6 mb-1 d-flex align-items-center gap-2'>
                        <span>{file.name}</span>
                      </div>
                    </div>
                    <div className='lcc-col-link'>
                      <div className='text-muted text-uppercase small fw-semibold mb-1'>{t('LINK')}</div>
                      {file.link ? (
                        <div className='d-flex align-items-center gap-2'>
                          {file.enablePassword ? (
                            <i className='bi bi-lock-fill text-warning' title={t('PASSWORD_ENABLED')}></i>
                          ) : (
                            <i className='bi bi-unlock text-muted' title={t('PASSWORD_DISABLED')}></i>
                          )}
                          <a
                            href={file.enablePassword ? getAccessLink(file.id) : `http://localhost:5174?id=${file.id}`}
                            target='_blank'
                            rel='noreferrer'
                            className='text-primary small lcc-link'
                            title={file.enablePassword ? getAccessLink(file.id) : `http://localhost:5174?id=${file.id}`}
                          >
                            {file.enablePassword ? getAccessLink(file.id) : `http://localhost:5174?id=${file.id}`}
                          </a>
                        </div>
                      ) : (
                        <div className='text-muted small'>{t('NO_LINK_PROVIDED')}</div>
                      )}
                    </div>
                    <div className='lcc-col-actions'>
                      <div className='lcc-actions'>
                        <button className='btn btn-sm btn-icon btn-light-primary' type='button' onClick={() => handleView(file)}>
                          <i className='bi bi-eye'></i>
                        </button>
                        <button className='btn btn-sm btn-icon btn-light-warning' type='button' onClick={() => openEditModal(file)}>
                          <i className='bi bi-pencil-square'></i>
                        </button>
                        <button className='btn btn-sm btn-icon btn-light-success' type='button' onClick={() => handleCopyLink(file)}>
                          <i className='bi bi-link-45deg'></i>
                        </button>
                        {isAdmin && (
                          <button
                            className='btn btn-sm btn-icon btn-light-danger'
                            type='button'
                            onClick={() => handleDelete(file)}
                            disabled={deletingId === file.id}
                          >
                            {deletingId === file.id ? (
                              <span className='spinner-border spinner-border-sm' role='status' aria-hidden='true'></span>
                            ) : (
                              <i className='bi bi-trash'></i>
                            )}
                          </button>
                        )}
                        {copiedFileId === file.id && <span className='badge badge-light-success'>{t('COPIED')}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className='d-flex flex-wrap align-items-center justify-content-between gap-3 lcc-pagination-row'>
                <div className='d-flex align-items-center gap-2'>
                  <span className='text-muted small'>{t('ROWS_PER_PAGE')}</span>
                  <select
                    className='form-select form-select-sm'
                    style={{width: 90}}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                  >
                    {[5, 10, 15, 25, 50].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='d-flex align-items-center gap-2'>
                  <Button
                    variant='light'
                    size='sm'
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    {t('PREVIOUS')}
                  </Button>
                  <span className='text-muted small'>
                    {t('PAGE_OF', {page, total: totalPages})}
                  </span>
                  <Button
                    variant='light'
                    size='sm'
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    {t('NEXT')}
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      <Modal show={editModal.open} onHide={closeEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editModal.mode === 'upload' ? t('ADD_LCC_DATA') : t('EDIT_LCC_DATA')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='mb-5'>
            <label className='form-label required'>{t('TITLE_NAME')}</label>
            <input
              type='text'
              className={`form-control ${
                editModal.uploadStatus === `error: ${t('TITLE_NAME_IS_REQUIRED')}` ? 'is-invalid' : ''
              }`}
              value={editModal.values.name}
              onChange={(e) =>
                setEditModal((prev) => ({...prev, values: {...prev.values, name: e.target.value}}))
              }
              placeholder={t('ENTER_TITLE_NAME')}
            />
            {editModal.uploadStatus === `error: ${t('TITLE_NAME_IS_REQUIRED')}` && (
              <div className='form-text text-danger'>{t('TITLE_ALREADY_EXISTS')}</div>
            )}
          </div>
          <div className='mb-3'>
            <div className='form-check form-switch'>
              <input
                className='form-check-input'
                type='checkbox'
                id='lcc-enable-password'
                checked={editModal.enablePassword}
                onChange={(e) => {
                  const nextEnabled = e.target.checked
                  const nextPwd = nextEnabled ? generatePassword(8) : ''
                  setEditModal((prev) => ({
                    ...prev,
                    enablePassword: nextEnabled,
                    // auto-generate 8-digit password on enable (user can edit)
                    password: nextPwd,
                    confirmPassword: nextPwd,
                    resetPassword: nextEnabled ? prev.resetPassword : false,
                  }))
                }}
              />
              <label className='form-check-label' htmlFor='lcc-enable-password'>
                {t('ENABLE_PASSWORD')}
              </label>
            </div>
          </div>
          {editModal.mode === 'edit' && editModal.enablePassword && (
            <div className='mb-3'>
              <Button
                variant='outline-primary'
                size='sm'
                onClick={() =>
                  setEditModal((prev) => ({
                    ...prev,
                    resetPassword: !prev.resetPassword,
                    password: '',
                    confirmPassword: '',
                  }))
                }
              >
                {editModal.resetPassword ? t('CANCEL') : t('RESET_PASSWORD')}
              </Button>
            </div>
          )}
          {editModal.enablePassword && (editModal.mode === 'upload' || editModal.resetPassword) && (
            <div className='mb-4'>
              <label className='form-label required'>
                {editModal.mode === 'edit' ? t('NEW_PASSWORD') : t('PASSWORD')}
              </label>
              <div className='input-group mb-3'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control ${
                    passwordMissing || passwordTooShort ? 'is-invalid' : ''
                  }`}
                  value={editModal.password}
                  onChange={(e) => setEditModal((prev) => ({...prev, password: e.target.value}))}
                  placeholder={editModal.mode === 'edit' ? t('ENTER_NEW_PASSWORD_DESC') : t('ENTER_PASSWORD')}
                />
                <button
                  type='button'
                  className='btn btn-light btn-icon'
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? t('HIDE_PASSWORD') : t('SHOW_PASSWORD')}
                  aria-label={showPassword ? t('HIDE_PASSWORD') : t('SHOW_PASSWORD')}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
                <button
                  type='button'
                  className='btn btn-light btn-icon'
                  onClick={handleCopyPassword}
                  title={t('COPY_PASSWORD')}
                  aria-label={t('COPY_PASSWORD')}
                  disabled={!editModal.password}
                >
                  <i className='bi bi-clipboard'></i>
                </button>
              </div>
              {copiedPassword && <div className='form-text text-success'>{t('COPIED')}</div>}
              <label className='form-label required'>
                {editModal.mode === 'edit' ? t('CONFIRM_NEW_PASSWORD') : t('CONFIRM_PASSWORD')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-control ${
                  confirmMissing || confirmMismatch ? 'is-invalid' : ''
                }`}
                value={editModal.confirmPassword}
                onChange={(e) => setEditModal((prev) => ({...prev, confirmPassword: e.target.value}))}
                placeholder={editModal.mode === 'edit' ? t('CONFIRM_NEW_PASSWORD') : t('CONFIRM_PASSWORD')}
              />
            </div>
          )}
          <div className='mb-3'>
            <label className='form-label'>
              {editModal.mode === 'upload' ? t('UPLOAD_ZIP') : t('REPLACE_ZIP')}
            </label>
            <div className='d-flex align-items-center gap-3'>
              <Button
                variant='primary'
                size='sm'
                onClick={() => document.getElementById('lcc-folder-picker')?.click()}
              >
                {editModal.mode === 'upload' ? 'Upload zip' : 'Select zip'}
              </Button>
              <span className='text-muted small'>
                {editModal.selectedFolder ? editModal.selectedFolder : t('NO_ZIP_SELECTED')}
              </span>
            </div>
            <input
              id='lcc-folder-picker'
              type='file'
              style={{display: 'none'}}
              accept='.zip'
              onChange={(e) => {
                const fileList = e.target.files ? Array.from(e.target.files) : []
                const zipName = fileList[0]?.name || ''
                setEditModal((prev) => ({
                  ...prev,
                  selectedFolder: zipName || null,
                  uploadFiles: fileList.length ? [fileList[0]] : [],
                  uploadStatus: fileList.length ? `${fileList[0].name} ${t('SELECTED')}` : t('NO_FILES_SELECTED'),
                  uploadProgress: 0,
                  values: {
                    ...prev.values,
                  },
                }))
              }}
            />
          </div>
          {(editModal.mode === 'upload' || editModal.uploadFiles.length > 0) && (
            <div className='mb-3'>
              {editModal.uploadStatus !== `error: ${t('TITLE_NAME_IS_REQUIRED')}` && (
                <div
                  className={
                    editModal.uploadStatus && editModal.uploadStatus.startsWith('error:')
                      ? 'form-text text-danger'
                      : 'form-text'
                  }
                >
                  {editModal.uploadStatus
                    ? editModal.uploadStatus.replace(/^error:\s*/i, '')
                    : t('PICK_ZIP_TO_UPLOAD')}
                </div>
              )}
              {editModal.uploadProgress > 0 && (
                <div className='progress mt-2' style={{height: 6}}>
                  <div
                    className='progress-bar bg-primary'
                    role='progressbar'
                    style={{width: `${editModal.uploadProgress}%`}}
                    aria-valuenow={editModal.uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
              )}
              {editModal.uploadFiles.length > 0 && (
                <div className='mt-3'>
                  <div className='fw-semibold small mb-1'>{t('FILES_TO_UPLOAD')}</div>
                  <ul className='mb-0 ps-3 small text-muted'>
                    {editModal.uploadFiles.slice(0, 5).map((file) => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                    {editModal.uploadFiles.length > 5 && (
                      <li>+{editModal.uploadFiles.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant='light' onClick={closeEditModal} disabled={editModal.saving}>
            {t('CANCEL')}
          </Button>
          <Button variant='primary' onClick={submitEdit} disabled={editModal.saving}>
            {editModal.mode === 'upload'
              ? editModal.saving
                ? t('UPLOADING')
                : t('UPLOAD')
              : editModal.saving
              ? t('PLEASE_WAIT')
              : t('SAVE_CHANGES')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={companyModal.open} onHide={closeCompanyModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('EDIT_COMPANY_NAME')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='mb-3'>
            <label className='form-label required'>{t('COMPANY_NAME')}</label>
            <input
              type='text'
              className='form-control'
              value={companyModal.name}
              onChange={(e) => setCompanyModal((prev) => ({...prev, name: e.target.value}))}
              placeholder={t('ENTER_COMPANY_NAME')}
            />
            {companyModal.error && <div className='form-text text-danger'>{companyModal.error}</div>}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='light' onClick={closeCompanyModal} disabled={companyModal.saving}>
            {t('CANCEL')}
          </Button>
          <Button variant='primary' onClick={submitCompanyEdit} disabled={companyModal.saving}>
            {companyModal.saving ? t('PLEASE_WAIT') : t('SAVE')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={projectModal.open} onHide={closeProjectModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('EDIT_PROJECT_NAME')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='mb-3'>
            <label className='form-label required'>{t('PROJECT_NAME')}</label>
            <input
              type='text'
              className='form-control'
              value={projectModal.name}
              onChange={(e) => setProjectModal((prev) => ({...prev, name: e.target.value}))}
              placeholder={t('ENTER_PROJECT_NAME')}
            />
            {projectModal.error && <div className='form-text text-danger'>{projectModal.error}</div>}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='light' onClick={closeProjectModal} disabled={projectModal.saving}>
            {t('CANCEL')}
          </Button>
          <Button variant='primary' onClick={submitProjectEdit} disabled={projectModal.saving}>
            {projectModal.saving ? t('PLEASE_WAIT') : t('SAVE')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export {LccDetails}
