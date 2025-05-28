import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { env } from "@/conf/env"
import { zodResolver } from "@hookform/resolvers/zod"
import axios, { isAxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature"], { required_error: "Type is required" }),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
})

type FeedbackFormData = z.infer<typeof feedbackSchema>

function FeedbackPage() {

  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
  })

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true)
    try {
      const res = await axios.post(`${env.serverApiEndpoint}/feedback`, data, {
        withCredentials: true
      })

      if (res.status !== 200) {
        toast.error("Error signing in, Try again")
        return
      }

      navigate('/')

    } catch (err) {
      console.error("Sign in error", err)
      if (isAxiosError(err)) {
        toast.error(err.response?.data.error || "Error signing in, Try again")
      } else {
        toast.error("Error signing in, Try again")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-screen flex justify-center items-center">
      <div className="max-w-md w-full mx-auto px-6 py-8 border dark:border-zinc-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold mb-6 text-center">Feedback</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                disabled={isSubmitting}
                onValueChange={field.onChange}
                defaultValue="feedback"
                value={field.value}
              >
                <SelectTrigger className="bg-zinc-200 dark:bg-zinc-800 focus:border-zinc-900 focus-visible:ring-zinc-900 dark:focus:border-zinc-100 dark:focus-visible:ring-zinc-100">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-200 dark:bg-zinc-800">
                  <SelectItem className="focus:bg-zinc-300 dark:focus:bg-zinc-700" key="feedback" value="feedback">Feedback</SelectItem>
                  <SelectItem className="focus:bg-zinc-300 dark:focus:bg-zinc-700" key="bug" value="bug">Bug</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
          )}
          <div>
            <Input
              variant="filled"
              type="text"
              disabled={isSubmitting}
              placeholder="Enter the title"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>
          <div>
            <Textarea
              variant="filled"
              disabled={isSubmitting}
              placeholder="Enter the Description"
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 font-semibold select-none rounded-md dark:text-zinc-900 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors ${isSubmitting && "bg-zinc-500 cursor-wait"}`}
          >
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait</> : "Login"}
          </Button>
        </form>
        {<p className={`text-center pt-4 ${isSubmitting && "text-zinc-900/50 dark:text-zinc-100/50"}`}>
          Or raise a issue on{" "}
          <a
            className={isSubmitting ? "pointer-events-none cursor-not-allowed text-blue-600/50 dark:text-blue-500/50" : "hover:underline text-blue-600 dark:text-blue-500 cursor-pointer"}
            href="https://github.com/Dhvanitmonpara/blind/issues/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            Github
          </a>
        </p>}
      </div>
    </div>
  )
}

export default FeedbackPage