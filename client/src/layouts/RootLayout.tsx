import Header from "@/components/general/Header"
import { Toaster } from "sonner"
import { Outlet } from "react-router-dom"

function RootLayout() {
  return (
    <main className="w-screen mi-h-screen overflow-x-hidden bg-zinc-100 dark:bg-zinc-900">
      <Header />
      <Outlet />
      <Toaster />
    </main>
  )
}

export default RootLayout