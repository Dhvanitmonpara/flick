import Post from "@/components/general/Post"
import { env } from "@/conf/env"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { IPost } from "@/types/Post"
import axios, { AxiosError } from "axios"
import { useCallback, useEffect, useState } from "react"

function FeedPage() {

  const [posts, setPosts] = useState<IPost[] | null>(null)
  const [loading, setLoading] = useState(false)
  const { handleError } = useErrorHandler()

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)

      const res = await axios.get(`${env.serverApiEndpoint}/posts/feed`)

      if (res.status !== 200) {
        throw new Error("Failed to fetch posts")
      }

      setPosts(res.data)
    } catch (error) {
      handleError(error as AxiosError | Error, "Error fetching posts")
    } finally {
      setLoading(false)
    }
  }, [handleError])

  useEffect(() => {
    document.title = "Feed | Flick"
    fetchPosts()
  }, [fetchPosts])

  if (loading) {
    return (
      <div className="flex gap-4 py-6 w-full">
        <section className="w-full max-h-screen overflow-y-auto no-scrollbar">
          {/* create skeleton */}
          loading
        </section>
        <section className="w-full max-w-80">
          <div className="">
            <h2>Most read</h2>
            <div className="mt-2 rounded-md flex justify-center items-center h-64 border-[1px] border-zinc-300 dark:border-zinc-800">
              coming soon
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex gap-4 py-6 w-full">
      <section className="w-full max-h-screen overflow-y-auto no-scrollbar">
        {(posts && posts.length > 0)
          ? posts.map((post) => (
            <Post
              key={post._id}
              avatar={post.postedBy.college.profile}
              usernameOrDisplayName={post.postedBy.username}
              title={post.title}
              branch={post.postedBy.branch}
              viewsCount={post.views}
              content={post.content}
              avatarFallback=""
              company={post.postedBy.college.name}
              createdAt={post.createdAt.getDate() + "/" + (post.createdAt.getMonth() + 1) + "/" + post.createdAt.getFullYear()}
              likesCount={post.likes.length}
              commentsCount={0}
            />
          ))
          : <div className="flex justify-center items-center h-full">
            <p>No posts found</p>
          </div>
        }
      </section>
      <section className="w-full max-w-80">
        <div className="">
          <h2>Most read</h2>
          <div className="mt-2 rounded-md flex justify-center items-center h-64 border-[1px] border-zinc-300 dark:border-zinc-800">
            coming soon
          </div>
        </div>
      </section>
    </div>
  )
}

export default FeedPage