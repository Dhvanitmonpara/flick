import useProfileStore from "@/store/profileStore"
import { isCollege } from "@/utils/helpers"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BsDot } from "react-icons/bs"

function ProfilePage() {
  const profile = useProfileStore(state => state.profile)
  return (
    <div className="py-12">
      <div className="flex items-center space-x-4 h-40">
        <Avatar className='cursor-pointer w-28 h-28 transition-colors duration-300 border-2 border-transparent hover:border-zinc-400'>
          <AvatarImage src={isCollege(profile.college) ? profile.college.profile : "Unknown College"} alt={profile.username} />
          <AvatarFallback className='bg-zinc-200 cursor-pointer select-none'>{profile.username.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </div>
      <div className="">
        <h4 className="text-xl font-semibold">{profile.username}</h4>
        <p className="text-zinc-600 dark:text-zinc-500 flex items-center space-x-0.5">
          <span>{isCollege(profile.college) ? profile.college.name : "Unknown College"}</span>
           <BsDot size={24} />
          <span>{profile.branch}</span>
           <BsDot size={24} />
        </p>
      </div>
    </div>
  )
}

export default ProfilePage