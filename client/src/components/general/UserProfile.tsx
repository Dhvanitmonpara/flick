import useProfileStore from '@/store/profileStore'
import { Link } from 'react-router-dom'
import { Avatar } from '../ui/avatar'

function UserProfile() {
  const { profile } = useProfileStore()
  return (
    <>
      {profile._id
        ? <Avatar />
        : <Link className="bg-zinc-800 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 px-3 py-1 rounded-sm transition-colors" to="/auth/signin">Sign in</Link>
      }
    </>
  )
}

export default UserProfile