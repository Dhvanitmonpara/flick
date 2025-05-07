import Comment from "@/components/general/Comment";
import CreateComment from "@/components/general/CreateComment";
import Post from "@/components/general/Post"
import { env } from "@/conf/env";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import useCommentStore from "@/store/commentStore";
import usePostStore from "@/store/postStore";
import useProfileStore from "@/store/profileStore";
import { IPost } from "@/types/Post";
import { IUser } from "@/types/User";
import { formatDate, isCollege, isUser } from "@/utils/helpers";
import axios, { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const getAvatarUrl = (user: IUser | string) => isUser(user) && isCollege(user.college) ? user.college.profile : "";
const getCollegeName = (user: IUser | string) => isUser(user) && isCollege(user.college) ? user.college.name : "Unknown College";
const getUsername = (user: IUser | string) => isUser(user) ? user.username : "Anonymous";

function PostPage() {

  const [currentPost, setCurrentPost] = useState<IPost | null>(null)
  const [loading, setLoading] = useState(false)
  const { profile } = useProfileStore()
  const { comments, setComments, resetComments } = useCommentStore()

  const { handleError } = useErrorHandler()

  const { id } = useParams();
  const navigate = useNavigate();
  const { posts } = usePostStore()

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${env.serverApiEndpoint}/comments/p/${id}?user=${profile._id}`)
      if (res.status !== 200) {
        throw new Error("Failed to fetch comments")
      }
      setComments(res.data.comments)
    } catch (error) {
      await handleError(error as AxiosError | Error, "Error fetching comments", undefined, fetchComments, "Failed to fetch comments")
    } finally {
      setLoading(false)
    }
  }, [handleError, id, profile._id, setComments])

  useEffect(() => {
    resetComments()
    if (!posts || posts.length === 0 || !id) {
      navigate("/")
      return
    }
    const post = posts.find((post) => post._id === id)
    if (!post) {
      navigate("/")
      return
    }
    setCurrentPost(post)
    fetchComments()

  }, [fetchComments, handleError, id, navigate, posts, resetComments])

  return (
    <div>
      {currentPost?._id &&
        <Post
          key={currentPost._id}
          _id={currentPost._id}
          avatar={getAvatarUrl(currentPost.postedBy)}
          college={getCollegeName(currentPost.postedBy)}
          username={getUsername(currentPost.postedBy)}
          userVote={currentPost.userVote ?? null}
          title={currentPost.title}
          branch={isUser(currentPost.postedBy) ? currentPost.postedBy.branch : "Unknown Branch"}
          viewsCount={currentPost.views}
          content={currentPost.content}
          avatarFallback=""
          createdAt={formatDate(currentPost.createdAt)}
          upvoteCount={currentPost.upvoteCount}
          downvoteCount={currentPost.downvoteCount}
          commentsCount={comments?.length ?? 0}
        />
      }
      <CreateComment />
      {loading
        ? <Loader2 className="animate-spin" />
        : (comments
          ? comments.map(({ _id, commentedBy, content, createdAt, upvoteCount, downvoteCount, userVote }) => (
            <Comment
              key={_id}
              _id={_id}
              avatar={getAvatarUrl(commentedBy)}
              college={getCollegeName(commentedBy)}
              commentedBy={getUsername(commentedBy)}
              userVote={userVote ?? null}
              branch={isUser(commentedBy) ? commentedBy.branch : "Unknown Branch"}
              content={content}
              avatarFallback=""
              createdAt={formatDate(createdAt)}
              upvoteCount={upvoteCount}
              downvoteCount={downvoteCount}
            />
          ))
          : <p>Comments not found</p>
        )}
    </div >
  )
}

export default PostPage