import {useTranslation} from 'react-i18next';
import { useAuth } from '../../../../app/modules/auth';
import appPackage from '../../../../../package.json'
import {KTIcon, toAbsoluteUrl} from '../../../helpers'
import {HeaderNotificationsMenu, HeaderUserMenu, QuickLinks} from '../../../partials'

const AsideFooter = () => {
  const {t} = useTranslation();
  const { currentUser } = useAuth();
  return (
    <div
      className='aside-footer d-flex flex-column align-items-center flex-column-auto'
      id='kt_aside_footer'
    >

      {/* begin::User */}
      <div className='d-flex align-items-center gap-2' id='kt_header_user_menu_toggle'>
        {/* begin::Menu wrapper */}
        <div
          className='cursor-pointer symbol symbol-35px mt-2'
          data-kt-menu-trigger='click'
          data-kt-menu-overflow='false'
          data-kt-menu-placement='top-start'
          title={t('USER_PROFILE')}
        >
          {currentUser?.segment != "systory" ?(
            <img src={toAbsoluteUrl('media/avatars/blank.png')} alt='avatar' />
          ):(
            <img src={`https://trimble.systory.la/public/images/users/${currentUser?.img}`} alt='avatar' />
          )} 
        </div>
        {/* end::Menu wrapper */}
        <span className='aside-version'>{t('VERSION_LABEL')} {appPackage.version}</span>
        <HeaderUserMenu />
      </div>
      {/* end::User */}
    </div>
  )
}

export {AsideFooter}
