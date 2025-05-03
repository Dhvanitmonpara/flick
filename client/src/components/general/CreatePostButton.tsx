"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaPlus } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios, { AxiosError } from "axios";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { env } from "@/conf/env";
import useProfileStore from "@/store/profileStore";

const postSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  content: z.string().min(10, "Content must be at least 10 characters."),
});

type PostFormValues = z.infer<typeof postSchema>;

function CreatePostButton() {
  const [open, setOpen] = useState(false);

  const { profile } = useProfileStore()
  const { handleError } = useErrorHandler()

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const onSubmit = async (data: PostFormValues) => {
    try {

      const postedBy = profile?._id
      if (!postedBy) throw new Error("User not found");

      const res = await axios.post(`${env.serverApiEndpoint}/posts`, {...data, postedBy}, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status !== 201) throw new Error("Failed to create post");

      toast.success("Post created successfully!");

      form.reset();
      setOpen(false);
    } catch (error) {
      handleError(error as AxiosError | Error, "Failed to create post");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DialogTrigger className="flex items-center cursor-pointer space-x-2 px-4 py-2 rounded-md bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700/70 active:scale-95 transition-all dark:text-zinc-200">
          <FaPlus />
          <span>create</span>
        </DialogTrigger>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter post title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write your post..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePostButton;
