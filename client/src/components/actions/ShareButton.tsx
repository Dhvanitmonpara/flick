import { useState } from "react"
import { IoIosShareAlt } from "react-icons/io"
import { FaCheck } from "react-icons/fa6"
import { toast } from "sonner"
import { env } from "@/conf/env"

function ShareButton({ id }: { id: string }) {
  const [shared, setShared] = useState(false)

  const handleShare = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation()
    setShared(true)
    navigator.clipboard.writeText(`${env.baseUrl}/p/${id}`)
    toast.success("Link copied to clipboard")
    setTimeout(() => {
      setShared(false)
    }, 5000);
  }

  return (
    <button disabled={shared} onClick={handleShare}>
      {shared ? <FaCheck className="text-green-500 text-xl m-0.5" /> : <IoIosShareAlt className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 text-xl m-0.5" />}
    </button>
  )
}

export default ShareButton