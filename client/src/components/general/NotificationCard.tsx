import { INotification } from "@/types/Notification"
import { useNavigate } from "react-router-dom"
import { PiArrowFatUpFill } from "react-icons/pi";
import { BiRepost } from "react-icons/bi";

function NotificationCard({ _redisId, actorUsernames, post, postId, _id, receiverId, seen, type, _retries }: INotification) {
  const navigate = useNavigate()
  return (
    <div
      className={`flex items-center space-x-6 py-4 px-6 border-[1px] border-zinc-200 dark:border-zinc-800 ${seen ? "hover:bg-zinc-100 dark:hover:bg-zinc-800" : "bg-blue-600/5"} cursor-pointer`}
      onClick={() => navigate(`/p/${postId}`)}
      key={_id || _redisId}
    >
      <div className="flex justify-center items-center text-3xl">
        {(type === "upvoted_post" || type === "upvoted_comment") && <PiArrowFatUpFill className="text-blue-500" />}
        {(type === "replied" || type === "posted") && <PiArrowFatUpFill className="text-blue-500" />}
        {type === "re-posted" && <BiRepost className="text-green-500" />}
      </div>
      <div className="flex flex-col">
        <p >{actorUsernames[0]} {actorUsernames.length > 1 ? "and" : ""} {actorUsernames.length > 2 ? `${actorUsernames.length - 1} others` : actorUsernames[1]} liked your post</p>
        <p className="text-zinc-600 dark:text-zinc-400">{post?.content}</p>
      </div>
    </div>
  )
}

export default NotificationCard