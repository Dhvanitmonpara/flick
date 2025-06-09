import NotificationCard from "@/components/general/NotificationCard"
import { env } from "@/conf/env"
import { INotification } from "@/types/Notification"
import axios from "axios"
import { useEffect, useState } from "react"
import { toast } from "sonner"

function NotificationsPage() {

  const [notifications, setNotifications] = useState<INotification[]>([])

  useEffect(() => {
    (async () => {
      const res = await axios.get(`${env.serverApiEndpoint}/notifications/list`, { withCredentials: true })
      if (res.status !== 200) {
        toast.error("Failed to fetch notifications")
        return
      }

      setNotifications([...res.data.redisNotifications, ...res.data.mongoNotifications])
    })()
  }, [])

  return (
    <div>
      {notifications.map((n) => (
        <NotificationCard
          key={n._id || n._redisId}
          postId={n.postId}
          _redisId={n._redisId}
          actorUsernames={n.actorUsernames}
          post={n.post}
          _id={n._id}
          receiverId={n.receiverId}
          seen={n.seen}
          type={n.type}
          _retries={n._retries}
        />
      ))}
    </div>
  )
}

export default NotificationsPage