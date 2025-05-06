import Comment from "@/components/general/Comment";
import CreateComment from "@/components/general/CreateComment";
import Post from "@/components/general/Post"
import { env } from "@/conf/env";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import usePostStore from "@/store/postStore";
import useProfileStore from "@/store/profileStore";
import { IComment } from "@/types/Comment";
import { IPost } from "@/types/Post";
import { formatDate, isCollege, isUser } from "@/utils/helpers";
import axios, { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function PostPage() {

  const [currentPost, setCurrentPost] = useState<IPost | null>(null)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<IComment[]>([])
  const { profile } = useProfileStore()

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
      console.log(res.data.comments)
      setComments(res.data.comments)
    } catch (error) {
      handleError(error as AxiosError | Error, "Error fetching comments")
    } finally {
      setLoading(false)
    }
  }, [handleError, id, profile._id])

  useEffect(() => {
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

  }, [fetchComments, handleError, id, navigate, posts])

  return (
    <div>
      {currentPost?._id &&
        <Post
          key={currentPost._id}
          _id={currentPost._id}
          avatar={isUser(currentPost.postedBy) && isCollege(currentPost.postedBy.college) ? currentPost.postedBy.college.profile : ""}
          company={isUser(currentPost.postedBy) && isCollege(currentPost.postedBy.college) ? currentPost.postedBy.college.name : "Unknown College"}
          usernameOrDisplayName={isUser(currentPost.postedBy) ? currentPost.postedBy.username : "Unknown User"}
          userVote={currentPost.userVote ?? null}
          title={currentPost.title}
          branch={isUser(currentPost.postedBy) ? currentPost.postedBy.branch : "Unknown Branch"}
          viewsCount={currentPost.views}
          content={currentPost.content}
          avatarFallback=""
          createdAt={formatDate(currentPost.createdAt)}
          upvoteCount={currentPost.upvoteCount}
          downvoteCount={currentPost.downvoteCount}
          commentsCount={0}
        />
      }
      <CreateComment setComments={setComments} />
      {/* <Comment /> */}

      {loading ? <Loader2 className="animate-spin" /> : comments.map(({ _id, commentedBy, content, createdAt, upvoteCount, downvoteCount, userVote }) => (
        <Comment
          key={_id}
          _id={_id}
          avatar={isUser(commentedBy) && isCollege(commentedBy.college) ? commentedBy.college.profile : ""}
          college={isUser(commentedBy) && isCollege(commentedBy.college) ? commentedBy.college.name : "Unknown College"}
          commentedBy={isUser(commentedBy) ? commentedBy.username : "Anonymous"}
          userVote={userVote ?? null}
          branch={isUser(commentedBy) ? commentedBy.branch : "Unknown Branch"}
          content={content}
          avatarFallback=""
          createdAt={formatDate(createdAt)}
          upvoteCount={upvoteCount}
          downvoteCount={downvoteCount}
        />
      ))}
    </div >
  )
}

export default PostPage