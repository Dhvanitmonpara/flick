import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BsDot } from "react-icons/bs";
import EngagementComponent from "./EngagementComponent";
import PostDropdown from "../actions/PostDropdown";

interface CommentProps {
  _id: string
  createdAt: string
  content: string
  commentedBy: string
  avatar: string
  avatarFallback: string
  userVote: "upvote" | "downvote" | null
  college: string
  branch: string
  upvoteCount: number
  downvoteCount: number
}

function Comment({ avatar, avatarFallback, _id, userVote, createdAt, college, content, branch, commentedBy, upvoteCount, downvoteCount }: CommentProps) {
  return (
    <Card className="dark:bg-transparent bg-transparent border-x-0 border-t-0 border-b-zinc-300/60 dark:border-b-zinc-700/50 shadow-none rounded-none">
      <CardHeader className="flex-row justify-between space-x-2 p-4">
        <div className="flex space-x-4">
          <VisuallyHidden>
            <CardTitle>{college}</CardTitle>
            <CardDescription>{content}</CardDescription>
          </VisuallyHidden>
          <Avatar>
            <AvatarImage src={avatar} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h2>{college}</h2>
            <p className="flex space-x-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{commentedBy}</span>
              <BsDot size={16} />
              <span>{branch}</span>
              <BsDot size={16} />
              <span>{createdAt}</span>
            </p>
          </div>
        </div>
        <PostDropdown id={_id} type="comment" key={_id} editableData={{ title: "", content }} />
      </CardHeader>
      <CardContent>
        <p className="text-zinc-600 dark:text-zinc-400 pt-1">{content}</p>
      </CardContent>
      <CardFooter>
        <EngagementComponent userVote={userVote} _id={_id} targetType="comment" initialCounts={{ upvotes: upvoteCount, downvotes: downvoteCount }} key={_id} show={['upvotes', "downvotes"]} />
      </CardFooter>
    </Card>
  )
}

export default Comment