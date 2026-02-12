import {FC} from 'react'
import {toAbsoluteUrl} from '../../../helpers'

export type IconUserModel = {
  name?: string
  avatar?: string
  initials?: string
  state?: string
}

type Props = {
  users?: Array<IconUserModel>
}

const UsersList: FC<Props> = ({users = []}) => {
  if (!users.length) {
    return null
  }

  return (
    <div className='d-flex align-items-center flex-wrap'>
      {users.map((user, index) => {
        const initials =
          user.initials ??
          user.name
            ?.split(' ')
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase())
            .slice(0, 2)
            .join('')

        return (
          <div
            className='symbol symbol-35px symbol-circle me-2 mb-2'
            key={`${user.name ?? 'user'}-${index}`}
          >
            {user.avatar ? (
              <img alt={user.name ?? 'user'} src={toAbsoluteUrl(user.avatar)} />
            ) : (
              <span
                className={`symbol-label bg-light-${user.state ?? 'primary'} text-${user.state ?? 'primary'} fw-bolder`}
              >
                {initials ?? '?'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export {UsersList}
