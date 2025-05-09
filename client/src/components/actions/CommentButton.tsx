import { useState } from "react";
import { FaComment } from "react-icons/fa6";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateComment from "../general/CreateComment";

function CommentButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button onClick={(e) => e.stopPropagation()} aria-label={"comments"} className="p-0.5 focus:outline-none">
            <FaComment className="text-gray-400 text-lg m-0.5" />
          </button>
        </DialogTrigger>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <CreateComment setOpen={setOpen} />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CommentButton