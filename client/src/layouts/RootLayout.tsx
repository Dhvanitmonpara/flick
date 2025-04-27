import Header from "@/components/general/Header"
import { Toaster } from "sonner"
import { Outlet, useLocation } from "react-router-dom"
import axios from "axios";

let heartbeatInterval: NodeJS.Timeout | null = null;

function startHeartbeat() {
  if (heartbeatInterval) return; // already running

  heartbeatInterval = setInterval(async () => {
    try {
      const response = await axios.patch(
        `${import.meta.env.VITE_SERVER_API_URL}/users/heartbeat`,
        { withCredentials: true }
      )

      if (!response.data.success) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
      window.location.href = '/';
    }
  }, 30000); // Only while user is active
}

function stopHeartbeat() {
  if (!heartbeatInterval) return
  clearInterval(heartbeatInterval);
  heartbeatInterval = null;
}

// Listen to real user activity
window.addEventListener('mousemove', startHeartbeat);
window.addEventListener('keydown', startHeartbeat);
window.addEventListener('blur', stopHeartbeat); // user switched tab
window.addEventListener('focus', startHeartbeat); // user back

function RootLayout() {

  const location = useLocation()
  const showHeader = !(location.pathname.includes("/interview"))

  return (
    <main className="w-screen mi-h-screen overflow-x-hidden bg-zinc-100 dark:bg-zinc-900">
      {showHeader && <Header />}
      <Outlet />
      <Toaster />
    </main>
  )
}

export default RootLayout