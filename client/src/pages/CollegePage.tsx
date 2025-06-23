import Post from "@/components/general/Post"
import { env } from "@/conf/env"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import usePostStore from "@/store/postStore"
import useProfileStore from "@/store/profileStore"
import { formatDate, getAvatarUrl, getCollegeName, isUser } from "@/utils/helpers"
import axios, { AxiosError } from "axios"
import { useCallback, useEffect, useState } from "react"

function CollegePage() {

  const [loading, setLoading] = useState(false)
  const { handleError } = useErrorHandler()
  const profile = useProfileStore(state => state.profile)
  const posts = usePostStore(state => state.posts)
  const setPosts = usePostStore(state => state.setPosts)

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      if(!profile.college) return

      const res = await axios.get(`${env.serverApiEndpoint}/posts/college/${profile.college}`, { withCredentials: true })

      if (res.status !== 200) {
        throw new Error("Failed to fetch posts")
      }
      setPosts(res.data.posts)
    } catch (error) {
      await handleError(error as AxiosError | Error, "Error fetching posts", undefined, () => fetchPosts(), "Failed to fetch posts")
    } finally {
      setLoading(false)
    }
  }, [handleError, profile.college, setPosts])

  useEffect(() => {
    document.title = "Feed | Flick"
    fetchPosts()
  }, [fetchPosts])

  const removedPostOnAction = () => {
    // TODO: Make this
  }

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
      <section className="w-full max-h-screen overflow-y-auto no-scrollbar divide-y divide-zinc-300/60 dark:divide-zinc-700/50">
        {posts && posts.length > 0 ? (
          posts.map((post) => {
            const postedBy = post.postedBy;

            if (!isUser(postedBy)) {
              // postedBy is just a string, fallback
              return (
                <Post
                  key={post._id}
                  _id={post._id}
                  avatar=""
                  userVote={post.userVote ?? null}
                  username="Unknown"
                  title={post.title}
                  topic={post.topic}
                  bookmarked={post.bookmarked ?? false}
                  branch="Unknown"
                  viewsCount={post.views}
                  content={post.content}
                  avatarFallback=""
                  college="Unknown"
                  createdAt={formatDate(post.createdAt)}
                  upvoteCount={post.upvoteCount}
                  downvoteCount={post.downvoteCount}
                  commentsCount={post.commentsCount ?? 0}
                />
              )
            }

            // postedBy is a full IUser object here
            return (
              <Post
                key={post._id}
                _id={post._id}
                avatar={getAvatarUrl(postedBy)}
                college={getCollegeName(postedBy)}
                topic={post.topic}
                username={postedBy.username}
                userVote={post.userVote ?? null}
                title={post.title}
                bookmarked={post.bookmarked ?? false}
                branch={postedBy.branch}
                viewsCount={post.views}
                content={post.content}
                avatarFallback=""
                removedPostOnAction={removedPostOnAction}
                createdAt={formatDate(post.createdAt)}
                upvoteCount={post.upvoteCount}
                downvoteCount={post.downvoteCount}
                commentsCount={post.commentsCount ?? 0}
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

export default CollegePage