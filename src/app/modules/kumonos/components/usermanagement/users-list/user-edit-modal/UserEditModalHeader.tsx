import {KTIcon} from '../../../../../../../_metronic/helpers'
import {useListView} from '../core/ListViewProvider'
import { useTranslation } from 'react-i18next';

const UserEditModalHeader = () => {
  const {itemIdForUpdate, setItemIdForUpdate} = useListView()
  const {t} = useTranslation();

  return (
    <div className='modal-header'>
      {/* begin::Modal title */}
      <h2 className='fw-bolder'>{itemIdForUpdate == null ? t("ADD_USER") : t("EDIT_PROFILE")}</h2>
      {/* end::Modal title */}

      {/* begin::Close */}
      <div
        className='btn btn-icon btn-sm btn-active-icon-primary'
        data-kt-users-modal-action='close'
        onClick={() => setItemIdForUpdate(undefined)}
        style={{cursor: 'pointer'}}
      >
        <KTIcon iconName='cross' className='fs-1' />
      </div>
      {/* end::Close */}
    </div>
  )
}

export {UserEditModalHeader}
