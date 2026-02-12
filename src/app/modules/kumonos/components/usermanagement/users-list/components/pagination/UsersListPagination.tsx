
import {useQueryResponseLoading, useQueryResponsePagination} from '../../core/QueryResponseProvider'
import {useQueryRequest} from '../../core/QueryRequestProvider'
import {useMemo} from 'react'
import { useTranslation } from 'react-i18next'


const UsersListPagination = () => {
  const {t} = useTranslation()
  const pagination = useQueryResponsePagination()
  const isLoading = useQueryResponseLoading()
  const {updateState} = useQueryRequest()
  const perPageOptions = [5, 10, 15, 25, 50]
  const updatePage = (page: number | undefined | null) => {
    if (!page || isLoading || pagination.page === page) {
      return
    }

    updateState({page, items_per_page: pagination.items_per_page || 5})
  }

  const updatePerPage = (value: number) => {
    if (isLoading) return
    updateState({page: 1, items_per_page: value as 5 | 10 | 15 | 25 | 50})
  }

  const resolvedTotalPages = useMemo(() => {
    if (pagination.totalPages) return pagination.totalPages
    const linkCount = pagination.links ? Math.max(0, pagination.links.length - 2) : 0
    return Math.max(1, linkCount)
  }, [pagination])

  const canPrev = pagination.page > 1
  const canNext = pagination.page < resolvedTotalPages

  return (
    <div className='row' style={{paddingTop: '1rem'}}>
      <div className='col-sm-12 col-md-5 d-flex align-items-center gap-3 justify-content-center justify-content-md-start'>
        <div className='d-flex align-items-center gap-2'>
          <span className='text-muted small'>{t('ROWS_PER_PAGE')}</span>
          <select
            className='form-select form-select-sm'
            style={{width: 90}}
            value={pagination.items_per_page}
            onChange={(e) => updatePerPage(Number(e.target.value))}
            disabled={isLoading}
          >
            {perPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className='text-muted small'>
          {t('PAGE_OF', {page: pagination.page, total: resolvedTotalPages})}
        </div>
      </div>
      <div className='col-sm-12 col-md-7 d-flex align-items-center justify-content-center justify-content-md-end'>
        <div id='kt_table_users_paginate'>
          <div className='d-flex align-items-center gap-2'>
            <button
              type='button'
              className='btn btn-sm btn-light'
              disabled={!canPrev || isLoading}
              onClick={() => updatePage(pagination.page - 1)}
            >
              {t('PREVIOUS')}
            </button>
            <span className='text-muted small'>
              {t('PAGE_OF', {page: pagination.page, total: resolvedTotalPages})}
            </span>
            <button
              type='button'
              className='btn btn-sm btn-light'
              disabled={!canNext || isLoading}
              onClick={() => updatePage(pagination.page + 1)}
            >
              {t('NEXT')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export {UsersListPagination}
