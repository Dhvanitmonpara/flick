import Post from "@/components/general/Post"
import { env } from "@/conf/env"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { IPost } from "@/types/Post"
import { useCallback, useEffect, useState } from "react"
import axios, { AxiosError } from "axios"
import { isCollege, isUser } from "@/utils/helpers"

function BookmarksPage() {

  const [posts, setPosts] = useState<IPost[]>([])
  const [loading, setLoading] = useState(true)
  const { handleError } = useErrorHandler()

  const getBookmarks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${env.serverApiEndpoint}/bookmarks/user`, { withCredentials: true })
      if (res.status !== 200) throw new Error("Failed to get bookmarks");
      setPosts(res.data.posts)
    } catch (error) {
      handleError(error as AxiosError, "Failed to get bookmarks")
    } finally {
      setLoading(false)
    }
  }, [handleError])

  useEffect(() => {
    getBookmarks()
  }, [getBookmarks])

  const removedPostOnAction = (id: string) => {
    setPosts((prev) => prev.filter((post) => post._id !== id))
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {posts.length > 0 && posts.map((post) => (
        <div>
          <Post
            avatarFallback={isUser(post.postedBy) ? post.postedBy.username.slice(0, 2) : ""}
            branch={isUser(post.postedBy) ? post.postedBy.branch : ""}
            commentsCount={0}
            userVote={post.userVote ?? null}
            viewsCount={0}
            key={post._id}
            _id={post._id}
            topic={post.topic}
            removedPostOnAction={removedPostOnAction}
            bookmarked={true}
            avatar={isUser(post.postedBy) && isCollege(post.postedBy.college) ? post.postedBy.college.profile : ""}
            username={isUser(post.postedBy) ? post.postedBy.username : ""}
            college={isUser(post.postedBy) && isCollege(post.postedBy.college) ? post.postedBy.college.name : "Unknown College"}
            title={post.title}
            content={post.content}
            createdAt={post.createdAt}
            upvoteCount={post.upvoteCount}
            downvoteCount={post.downvoteCount}
          />
        </div>
      ))}
    </div>
  )
}

export default BookmarksPage