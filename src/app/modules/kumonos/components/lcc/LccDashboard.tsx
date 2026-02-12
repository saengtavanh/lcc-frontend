import React, {useCallback, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {PageTitle} from '../../../../../_metronic/layout/core'
import {fetchLccTree} from './api'
import {LCC_FILES_CHANGED_EVENT, LCC_TREE_CHANGED_EVENT} from './events'
import './lcc-details.css'

type StatsState = {
  companies: number
  titles: number
  files: number
  storageUsedGb: number
  storageTotalGb: number
  loading: boolean
  error: string | null
}

const LccDashboard: React.FC = () => {
  const {t} = useTranslation()
  const [stats, setStats] = useState<StatsState>({
    companies: 0,
    titles: 0,
    files: 0,
    storageUsedGb: 12.4,
    storageTotalGb: 100,
    loading: true,
    error: null,
  })

  const loadStats = useCallback(async () => {
    setStats((prev) => ({...prev, loading: true, error: null}))
    try {
      const tree = await fetchLccTree()
      const companies = tree.length
      const titles = tree.reduce((acc, c) => acc + c.folders.length, 0)
      const files = tree.reduce(
        (acc, c) =>
          acc + c.folders.reduce((fAcc, f) => fAcc + (f.files ? f.files.length : 0), 0),
        0
      )
      setStats((prev) => ({
        ...prev,
        companies,
        titles,
        files,
        loading: false,
        error: null,
      }))
    } catch (err) {
      console.error(t('UNABLE_TO_LOAD_LCC_STATS'), err)
      setStats((prev) => ({
        ...prev,
        companies: 0,
        titles: 0,
        files: 0,
        loading: false,
        error: t('UNABLE_TO_LOAD_LCC_STATS'),
      }))
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleTreeChanged = () => {
      loadStats()
    }
    const handleFilesChanged = () => {
      loadStats()
    }
    window.addEventListener(LCC_TREE_CHANGED_EVENT, handleTreeChanged)
    window.addEventListener(LCC_FILES_CHANGED_EVENT, handleFilesChanged)
    return () => {
      window.removeEventListener(LCC_TREE_CHANGED_EVENT, handleTreeChanged)
      window.removeEventListener(LCC_FILES_CHANGED_EVENT, handleFilesChanged)
    }
  }, [loadStats])

  return (
    <div className='card'>
      <div className='card-body'>
        {stats.error && (
          <div className='alert alert-danger d-flex align-items-center mb-6'>
            <span className='svg-icon svg-icon-2hx svg-icon-danger me-4'>
              <i className='bi bi-exclamation-triangle'></i>
            </span>
            <div>
              <h4 className='mb-1 text-danger'>{t('ERROR')}</h4>
              <div className='text-gray-700'>{stats.error}</div>
            </div>
          </div>
        )}

        <div className='lcc-home'>
          <div className='lcc-home__body'>
            <div className='lcc-home__header'>
              <div className='d-flex align-items-center gap-3'>
                <div className='lcc-home__icon'>
                  <i className='bi bi-diagram-3-fill'></i>
                </div>
                <div>
                  <PageTitle breadcrumbs={[]}>{t('DASHBOARD')}</PageTitle>
                  <h2 className='fw-bold mb-0'>{t('OVERVIEW_STATS')}</h2>
                </div>
              </div>
            </div>

            <div className='lcc-home__stats'>
              <div className='lcc-home__stat'>
                <div className='lcc-home__stat-icon'>
                  <i className='bi bi-buildings'></i>
                </div> 
                <div>
                  <div className='lcc-home__stat-label'>{t('COMPANIES')}</div>
                  <div className='lcc-home__stat-value'>
                    {stats.loading ? t('PLEASE_WAIT') : stats.companies.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className='lcc-home__stat'>
                <div className='lcc-home__stat-icon'>
                  <i className='bi bi-folder2-open'></i>
                </div>
                <div>
                  <div className='lcc-home__stat-label'>{t('PROJECTS')}</div>
                  <div className='lcc-home__stat-value'>
                    {stats.loading ? t('PLEASE_WAIT') : stats.titles.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className='lcc-home__stat'>
                <div className='lcc-home__stat-icon'>
                  <i className='bi bi-file-earmark-binary'></i>
                </div>
                <div>
                  <div className='lcc-home__stat-label'>{t('FILES')}</div>
                  <div className='lcc-home__stat-value'>
                    {stats.loading ? t('PLEASE_WAIT') : stats.files.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className='lcc-home__stat'>
                <div className='lcc-home__stat-icon'>
                  <i className='bi bi-hdd-stack'></i>
                </div>
                <div>
                  <div className='lcc-home__stat-label'>{t('STORAGE')}</div>
                  <div className='lcc-home__stat-value'>
                    {stats.loading
                      ? t('PLEASE_WAIT')
                      : `${stats.storageUsedGb.toLocaleString()} / ${stats.storageTotalGb.toLocaleString()} GB`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export {LccDashboard}
