import Post from "@/components/general/Post"
import { env } from "@/conf/env"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { ICollege } from "@/types/College"
import { IPost } from "@/types/Post"
import { IUser } from "@/types/User"
import axios, { AxiosError } from "axios"
import { useCallback, useEffect, useState } from "react"

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function isUser(obj: unknown): obj is IUser {
  return typeof obj === "object" && obj !== null && "college" in obj && "branch" in obj;
}

function isCollege(obj: unknown): obj is ICollege {
  return typeof obj === "object" && obj !== null && "profile" in obj && "name" in obj;
}  

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
      console.log(res.data.posts)
      setPosts(res.data.posts)
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
        {posts && posts.length > 0 ? (
          posts.map((post) => {
            const postedBy = post.postedBy;

            if (!isUser(postedBy)) {
              // postedBy is just a string, fallback
              return (
                <Post
                  key={post._id}
                  avatar=""
                  usernameOrDisplayName="Unknown"
                  title={post.title}
                  branch="Unknown"
                  viewsCount={post.views}
                  content={post.content}
                  avatarFallback=""
                  company="Unknown"
                  createdAt={formatDate(post.createdAt)}
                  upvoteCount={post.upvoteCount}
                  downvoteCount={post.downvoteCount}
                  commentsCount={0}
                />
              )
            }

            // postedBy is a full IUser object here
            return (
              <Post
                key={post._id}
                avatar={isCollege(postedBy.college) ? postedBy.college.profile : ""}
                company={isCollege(postedBy.college) ? postedBy.college.name : "Unknown College"}                             
                usernameOrDisplayName={postedBy.username}
                title={post.title}
                branch={postedBy.branch}
                viewsCount={post.views}
                content={post.content}
                avatarFallback=""
                createdAt={formatDate(post.createdAt)}
                upvoteCount={post.upvoteCount}
                downvoteCount={post.downvoteCount}
                commentsCount={0}
              />
            )
          })
        ) : (
          <div className="flex justify-center items-center h-full">
            <p>No posts found</p>
          </div>
        )}
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