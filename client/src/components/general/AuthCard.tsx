import ThemeToggler from "./ThemeToggler"
import UserProfile from "./UserProfile";
import { useCallback, useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import useProfileStore from "@/store/profileStore";
import { toast } from "sonner";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { env } from "@/conf/env";
import { IoMdNotifications } from "react-icons/io";
import { Link } from "react-router-dom";
import useSocket from "@/socket/useSocket";

function AuthCard({ className }: { className?: string }) {

  const [fetching, setFetching] = useState(true)
  const setProfile = useProfileStore(state => state.setProfile);
  const { handleError } = useErrorHandler()

  const fetchUser = useCallback(async () => {
    try {
      const user = await axios.get(`${env.serverApiEndpoint}/users/me`, {
        withCredentials: true,
      })

      if (user.status !== 200) {
        toast.error(user.data.message || "Something went wrong while fetching user")
        return
      }

      setProfile(user.data.data)
    } catch (error) {
      handleError(error as AxiosError | Error, "Something went wrong while fetching user", undefined, () => fetchUser(), "Failed to fetch user")
    } finally {
      setFetching(false)
    }
  }, [handleError, setProfile])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <div className={`flex justify-center items-center gap-4 ${className}`}>
      <ThemeToggler />
      {fetching
        ? <span className="bg-zinc-300 animate-pulse h-10 w-10 rounded-full"></span>
        : <>
          <NotificationButton />
          <UserProfile />
        </>
      }
    </div>
  )
}

function NotificationButton() {
  const [notificationCount, setNotificationCount] = useState(0)

  const socket = useSocket()

  const listenToNotifications = useCallback(() => {
    if (!socket) return;

    socket.emit("initial-setup", {
      userId: useProfileStore.getState().profile._id
    });

    socket.on("notification", (notification) => {
      toast.success(`New notification: ${notification.content}`, {
        duration: 5000,
        action: {
          label: "View",
          onClick: () => {
            // Navigate to notifications page or handle the notification
          },
        },
      });
    });

    socket.on("notifications-count", (notification) => {
      console.log(notification)
      setNotificationCount(notification.count);
    })

    return () => {
      socket.off("notification");
      socket.off("notifications-count");
    };
  }, [socket])

  useEffect(() => {
    listenToNotifications()
  }, [listenToNotifications])

  return (
    <Link className="relative" to="/notifications">
      <IoMdNotifications />
      {notificationCount > 0 && <span className="absolute top-0 right-0 text-xs w-4 h-4 flex justify-center items-center bg-red-500 rounded-full">
        {notificationCount}
      </span>}
    </Link>
  )
}

export default AuthCard