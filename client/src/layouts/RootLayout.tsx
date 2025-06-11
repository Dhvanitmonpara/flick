import { Toaster } from "sonner"
import { Outlet } from "react-router-dom"

function RootLayout() {
  return (
    <main className="w-screen h-screen overflow-x-hidden bg-zinc-100 dark:bg-zinc-900">
      <Outlet />
      <Toaster />
    </main>
  )
}

export default RootLayout