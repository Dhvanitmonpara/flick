import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FaComment, FaEye } from 'react-icons/fa';
import { BsDot } from "react-icons/bs";
import { HiDotsHorizontal } from "react-icons/hi";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FaRegBookmark } from "react-icons/fa6";
import { TbMessageReport } from "react-icons/tb";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PiArrowFatUpFill, PiArrowFatDownFill } from "react-icons/pi";
import axios, { AxiosError } from "axios";
import { env } from "@/conf/env";
import { useErrorHandler } from "@/hooks/useErrorHandler";

interface PostProps {
  avatar: string,
  avatarFallback: string
  createdAt: string
  company: string
  _id: string
  title: string
  content: string
  upvoteCount: number
  downvoteCount: number
  commentsCount: number
  userVote: "upvote" | "downvote" | null
  viewsCount: number
  usernameOrDisplayName: string
  branch: string
  topic?: {
    industry: string
  }
}

function Post({ avatar, userVote, avatarFallback, _id, createdAt, company, title, content, upvoteCount, downvoteCount, commentsCount, viewsCount, usernameOrDisplayName, branch, topic }: PostProps) {
  console.log(topic)
  return (
    <Card className="dark:bg-transparent bg-transparent border-x-0 border-t-0 border-b-zinc-300/60 dark:border-b-zinc-700/50 shadow-none rounded-none">
      <CardHeader className="flex-row justify-between space-x-2 p-4">
        <div className="flex space-x-4">
          <VisuallyHidden>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{content}</CardDescription>
          </VisuallyHidden>
          <Avatar>
            <AvatarImage src={avatar} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h2>{company}</h2>
            <p className="flex space-x-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{usernameOrDisplayName}</span>
              <BsDot size={16} />
              <span>{branch}</span>
              <BsDot size={16} />
              <span>{createdAt}</span>
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full p-2 text-lg transition-colors hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60"><HiDotsHorizontal /></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <TbMessageReport />
              <span>Report</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FaRegBookmark />
              <span>Save</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-zinc-600 dark:text-zinc-400 pt-1">{content}</p>
      </CardContent>
      <CardFooter>
        <EngagementComponent userVote={userVote} _id={_id} targetType="post" initialCounts={{ upvotes: upvoteCount, downvotes: downvoteCount, comments: commentsCount, views: viewsCount }} key={title} show={['upvotes', "downvotes", 'comments', 'views']} />
      </CardFooter>
    </Card>
  )
}

type EngagementType = 'upvotes' | 'downvotes' | 'comments' | 'views';

type Count = {
  upvotes?: number;
  downvotes?: number;
  comments?: number;
  views?: number;
}

type EngagementComponentProps = {
  initialCounts: Count;
  _id: string
  targetType: 'post' | 'comment'
  initialUpvoted?: boolean;
  initialDownvoted?: boolean;
  userVote: "upvote" | "downvote" | null
  show?: EngagementType[];
};

const EngagementComponent = ({
  initialCounts = { upvotes: 0, downvotes: 0, comments: 0, views: 0 },
  _id,
  userVote,
  targetType = 'post',
  show = ['upvotes', 'downvotes', 'comments', 'views'],
}: EngagementComponentProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticCounts, setOptimisticCounts] = useState(initialCounts);

  const [upvoted, setUpvoted] = useState(userVote === 'upvote');
  const [downvoted, setDownvoted] = useState(userVote === 'downvote');

  const { handleError } = useErrorHandler()

  useEffect(() => {
    setUpvoted(userVote === 'upvote');
    setDownvoted(userVote === 'downvote');
  }, [userVote]);

  const getUpdatedCounts = (prevCounts: Count, upvoted: boolean, downvoted: boolean, type: 'upvote' | 'downvote') => {
    const newCounts = { ...prevCounts };
    if (type === 'upvote') {
      if (downvoted) newCounts.downvotes = (newCounts.downvotes ?? 0) - 1;
      newCounts.upvotes = (newCounts.upvotes ?? 0) + (upvoted ? -1 : 1);
    } else {
      if (upvoted) newCounts.upvotes = (newCounts.upvotes ?? 0) - 1;
      newCounts.downvotes = (newCounts.downvotes ?? 0) + (downvoted ? -1 : 1);
    }
    return newCounts;
  };

  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (isVoting) return;

    const previousCounts = optimisticCounts;
    const prevUpvoted = upvoted;
    const prevDownvoted = downvoted;

    let action: 'post' | 'delete' = 'post'

    if (type === 'upvote') {
      if (upvoted) action = 'delete';
      else if (downvoted) action = 'delete';
    } else {
      if (downvoted) action = 'delete';
      else if (upvoted) action = 'delete';
    }

    setOptimisticCounts(prev => getUpdatedCounts(prev, upvoted, downvoted, type));

    if (type === 'upvote') {
      if (downvoted) setDownvoted(false);
      setUpvoted(!upvoted);
    } else {
      if (upvoted) setUpvoted(false);
      setDownvoted(!downvoted);
    }

    setIsVoting(true);
    try {
      if (action === 'post') {
        await axios.post(`${env.serverApiEndpoint}/votes`, {
          voteType: type,
          targetId: _id,
          targetType
        }, { withCredentials: true });
      } else if (action === 'delete') {
        await axios.delete(`${env.serverApiEndpoint}/votes`, {
          data: { targetId: _id, targetType },
          withCredentials: true,
        });
      }
    } catch (error) {
      handleError(error as AxiosError | Error, "Failed to update vote");
      setOptimisticCounts(previousCounts);
      setUpvoted(prevUpvoted);
      setDownvoted(prevDownvoted);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      {show.includes('upvotes') && (
        <div className="flex items-center gap-1">
          <button disabled={isVoting} onClick={() => handleVote("upvote")} aria-label={upvoted ? 'Remove upvote' : 'Upvote'} className="p-0.5 focus:outline-none">
            <PiArrowFatUpFill className={`${upvoted ? "text-blue-500" : "text-gray-400"} hover:scale-110 transition-all text-lg`} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3 cursor-pointer select-none">{optimisticCounts.upvotes}</span>
        </div>
      )}

      {show.includes('downvotes') && (
        <div className="flex items-center gap-1">
          <button disabled={isVoting} onClick={() => handleVote("downvote")} aria-label={downvoted ? 'Remove downvote' : 'Downvote'} className="p-0.5 focus:outline-none">
            <PiArrowFatDownFill className={`${downvoted ? "text-red-500" : "text-gray-400"} hover:scale-110 transition-all text-lg`} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3 cursor-pointer select-none">{optimisticCounts.downvotes}</span>
        </div>
      )}

      {show.includes('comments') && (
        <div className="flex items-center gap-1">
          <FaComment className="text-gray-400 text-lg m-0.5" />
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3">{optimisticCounts.comments}</span>
        </div>
      )}

      {show.includes('views') && (
        <div className="flex items-center gap-1">
          <FaEye className="text-gray-400 text-lg m-0.5" />
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3">{optimisticCounts.views}</span>
        </div>
      )}
    </div>
  );
};

export default Post