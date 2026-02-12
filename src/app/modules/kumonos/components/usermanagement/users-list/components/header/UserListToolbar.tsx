import {KTIcon} from '../../../../../../../../_metronic/helpers'
import {useListView} from '../../core/ListViewProvider'
import {UsersListFilter} from './UsersListFilter'
import { useAuth } from '../../../../../../../modules/auth/core/Auth'
import { useTranslation } from 'react-i18next';

const UsersListToolbar = () => {
  const {setItemIdForUpdate} = useListView();
  const { currentUser } = useAuth()  
  const {t} = useTranslation()
  const openAddUserModal = () => {
    setItemIdForUpdate(null)
  }

  return (
    <div className='d-flex justify-content-end' data-kt-user-table-toolbar='base'>
      {currentUser?.role == 'administrator' && 
      <button type='button' className='btn btn-primary' onClick={openAddUserModal}>
        <KTIcon iconName='plus' className='fs-2' />
        {t('ADD_USER')}
      </button>
      }
      {/* end::Add user */}
    </div>
  )
}

export {UsersListToolbar}
