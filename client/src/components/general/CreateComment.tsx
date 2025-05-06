import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/conf/env";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { IComment } from "@/types/Comment";
import { highlightBannedWords, validatePost } from "@/utils/moderator";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(3, "Content must be at least 10 characters."),
});

type CommentFormValues = z.infer<typeof commentSchema>;

function CreateComment({ parentCommentId, setComments, defaultData }: { parentCommentId?: string, setComments?: React.Dispatch<React.SetStateAction<IComment[]>>, defaultData?: CommentFormValues }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { handleError } = useErrorHandler();

  const { id } = useParams()

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: defaultData ?? {
      content: "",
    },
  });

  const onSubmit = async (data: CommentFormValues) => {
    try {
      setLoading(true);
      if (!id) throw new Error("Post id not found")

      const res = await axios.post(`${env.serverApiEndpoint}/comments/create/${id}`,
        { ...data, parentCommentId: parentCommentId ?? null },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (res.status !== 201) throw new Error("Failed to create post");

      toast.success("Post created successfully!");
      if (setComments) setComments((prev) => [...prev, res.data.comment]);
      form.reset();

    } catch (error) {
      handleError(error as AxiosError | Error, "Failed to create post", setError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          disabled={loading}
          name="content"
          render={({ field }) => {
            const banned = validatePost(field.value);
            const hasBanned = !banned.allowed;

            return (
              <FormItem>
                <FormControl>
                  <>
                    <Textarea
                      placeholder="Post comment..."
                      {...field}
                      onChange={(e) => {
                        setError("");
                        field.onChange(e);
                      }}
                      className={hasBanned ? "border-red-500" : ""}
                    />
                    {field.value && (
                      <div className="mt-2 text-sm">
                        <span className="font-semibold">Preview:</span>
                        {highlightBannedWords(field.value)}
                      </div>
                    )}
                    {hasBanned && (
                      <p className="text-red-500 text-xs mt-1">
                        {banned.reason}
                      </p>
                    )}
                  </>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button disabled={loading || Boolean(error)} type="submit" className="w-full">
          {loading ? <><Loader2 className="animate-spin" /> Creating...</> : "Create"}
        </Button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
    </Form>
  )
}

export default CreateComment