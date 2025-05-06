import { HiDotsHorizontal } from "react-icons/hi";
import { RiDeleteBin6Fill, RiEdit2Fill } from "react-icons/ri";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TbMessageReport } from "react-icons/tb";
import { FaRegBookmark } from "react-icons/fa6";
import { useState } from "react";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import axios, { AxiosError } from "axios";
import { env } from "@/conf/env";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Form } from "../ui/form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CreatePostForm } from "../general/CreatePost";
import CreateComment from "../general/CreateComment";

type DialogType = "DELETE" | "REPORT" | "EDIT" | "SAVE" | null;

const ReportReasons = [
  "INAPPROPRIATE",
  "SPAM",
  "HARASSMENT",
  "VIOLENCE",
  "HATE_SPEECH",
  "TERRORISM",
  "SELF_HARM",
  "CHILD_ABUSE",
  "EXTREMISM",
  "OTHER",
] as const;

const reportSchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters."),
  reason: z.enum(ReportReasons),
});

type ReportFormValues = z.infer<typeof reportSchema>;

function PostDropdown({ type, id, editableData }: { type: ("post" | "comment"), id: string, editableData?: { title: string, content: string } }) {
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { handleError } = useErrorHandler()

  const openDialog = (type: DialogType) => {
    setDialogType(type);
    setOpen(true);
  };

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      message: "",
    },
  });

  const handleDelete = async () => {
    try {
      setLoading(true);

      const res = await axios.delete(
        `${env.serverApiEndpoint}/${type}s/${id}`,
        { withCredentials: true }
      )

      if (res.status !== 200) throw new Error(`Failed to delete ${type}`)
      toast.success(`Successfully deleted ${type}`)

    } catch (error) {
      handleError(error as AxiosError | Error, `Failed to delete ${type}`)
    } finally {
      setLoading(false)
      setDialogType(null)
    }
  }

  const handleReport = async (data: ReportFormValues) => {
    try {
      setLoading(true)

      const res = await axios.post(
        `${env.serverApiEndpoint}/${type}s/report`,
        {
          targetId: id,
          type,
          reason: data.reason,
          message: data.message
        },
        { withCredentials: true }
      )

      if (res.status !== 200) throw new Error(`Failed to report ${type}`)
      toast.success(`Successfully reported ${type}`)

    } catch (error) {
      handleError(error as AxiosError | Error, `Failed to report ${type}`)
    } finally {
      setLoading(false)
      setDialogType(null)
      form.reset()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full p-2 text-lg transition-colors hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60"><HiDotsHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog("REPORT") }}>
            <TbMessageReport />
            <span>Report</span>
          </DropdownMenuItem>
          {/* TODO: Add a component that asks for money when user wants to use this feature */}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog("EDIT") }}>
            <RiEdit2Fill />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("This feature is not available yet.")}>
            <FaRegBookmark />
            <span>Save</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog("DELETE") }} className="hover:!bg-red-400/50 dark:hover:!bg-red-600/40">
            <RiDeleteBin6Fill />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Centralized Dialog */}
      <Dialog open={open} onOpenChange={(o) => {
        setOpen(o);
        if (!o) setDialogType(null);
      }}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          {dialogType === "DELETE" && (
            <>
              <DialogHeader>
                <DialogTitle>Delete Post</DialogTitle>
                <DialogDescription>Are you sure you want to delete this post?</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center items-center space-x-2">
                <Button className="w-full" disabled={loading} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button className="w-full" disabled={loading} onClick={handleDelete} variant="destructive">
                  {loading ? <><Loader2 className="animate-spin" /> Deleting...</> : "Delete"}
                </Button>
              </div>
            </>
          )}
          {dialogType === "REPORT" && (
            <>
              <DialogHeader>
                <DialogTitle>Report Post</DialogTitle>
                <DialogDescription>Explain why you're reporting this post.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleReport)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    disabled={loading}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ReportReasons.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    disabled={loading}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter message" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button disabled={loading} type="submit" className="w-full">
                    {loading ? <><Loader2 className="animate-spin" /> Reporting...</> : "Report"}
                  </Button>
                </form>
              </Form>
            </>
          )}
          {dialogType === "EDIT" &&
            <>
              <DialogHeader>
                <DialogTitle>Edit Post</DialogTitle>
                <DialogDescription>Edit this post.</DialogDescription>
              </DialogHeader>
              {type === "post" ? <CreatePostForm defaultData={{title: editableData?.title || "", content: editableData?.content || ""}} /> : <CreateComment defaultData={{content: editableData?.content || ""}} />}
            </>
          }
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PostDropdown