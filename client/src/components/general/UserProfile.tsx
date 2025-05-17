import useProfileStore from '@/store/profileStore'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { IUser } from '@/types/User';
import { isCollege, isUser } from '@/utils/helpers';

const getCollegeProfile = (user: IUser | string) => isUser(user) && isCollege(user.college) ? user.college.profile : "Unknown College";

function UserProfile() {
  const { profile } = useProfileStore()
  return (
    <>
      {profile._id
        ? <Avatar>
          <AvatarImage src={getCollegeProfile(profile)} alt={profile.username} />
          <AvatarFallback className='bg-zinc-200 cursor-pointer select-none'>{profile.username.slice(0, 2)}</AvatarFallback>
        </Avatar>
        : <Link className="flex justify-center items-center bg-zinc-800 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 px-3 py-1 rounded-sm transition-colors" to="/auth/signin">Sign in</Link>
      }
    </>
  )
}

export default UserProfile