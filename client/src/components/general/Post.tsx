import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FaComment, FaEye, FaThumbsDown } from 'react-icons/fa';
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
import { FaRegBookmark, FaThumbsUp } from "react-icons/fa6";
import { TbMessageReport } from "react-icons/tb";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PostProps {
  avatar: string,
  avatarFallback: string
  createdAt: string
  company: string
  title: string
  content: string
  upvoteCount: number
  downvoteCount: number
  commentsCount: number
  viewsCount: number
  usernameOrDisplayName: string
  branch: string
  topic?: {
    industry: string
  }
}

function Post({ avatar, avatarFallback, createdAt, company, title, content, upvoteCount, downvoteCount, commentsCount, viewsCount, usernameOrDisplayName, branch, topic }: PostProps) {
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
        <EngagementComponent initialCounts={{ upvotes: upvoteCount, downvotes: downvoteCount, comments: commentsCount, views: viewsCount }} key={title} show={['upvotes', "downvotes", 'comments', 'views']} />
      </CardFooter>
    </Card>
  )
}

type EngagementType = 'upvotes' | 'downvotes' | 'comments' | 'views';

type EngagementComponentProps = {
  initialCounts: {
    upvotes?: number;
    downvotes?: number;
    comments?: number;
    views?: number;
  };
  initialUpvoted?: boolean;
  initialDownvoted?: boolean;
  show?: EngagementType[];
};

const EngagementComponent = ({
  initialCounts = { upvotes: 0, downvotes: 0, comments: 0, views: 0 },
  initialUpvoted = false,
  initialDownvoted = false,
  show = ['upvotes', 'downvotes', 'comments', 'views'],
}: EngagementComponentProps) => {
  const [counts, setCounts] = useState({
    upvotes: initialCounts.upvotes || 0,
    downvotes: initialCounts.downvotes || 0,
    comments: initialCounts.comments || 0,
    views: initialCounts.views || 0,
  });

  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [downvoted, setDownvoted] = useState(initialDownvoted);

  const handleUpvote = () => {
    if (downvoted) {
      setDownvoted(false);
      setCounts(prev => ({
        ...prev,
        downvotes: prev.downvotes - 1
      }));
    }

    setUpvoted(!upvoted);
    setCounts(prev => ({
      ...prev,
      upvotes: upvoted ? prev.upvotes - 1 : prev.upvotes + 1
    }));
  };

  const handleDownvote = () => {
    if (upvoted) {
      setUpvoted(false);
      setCounts(prev => ({
        ...prev,
        upvotes: prev.upvotes - 1
      }));
    }

    setDownvoted(!downvoted);
    setCounts(prev => ({
      ...prev,
      downvotes: downvoted ? prev.downvotes - 1 : prev.downvotes + 1
    }));
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      {show.includes('upvotes') && (
        <div className="flex items-center gap-1">
          <button
            onClick={handleUpvote}
            aria-label={upvoted ? 'Remove upvote' : 'Upvote'}
            className="p-0.5 focus:outline-none"
          >
            <FaThumbsUp className={`${upvoted ? "text-blue-500" : "text-gray-400"} hover:scale-110 transition-all text-lg`} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3 cursor-pointer select-none">{counts.upvotes}</span>
        </div>
      )}

      {show.includes('downvotes') && (
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownvote}
            aria-label={downvoted ? 'Remove downvote' : 'Downvote'}
            className="p-0.5 focus:outline-none"
          >
            <FaThumbsDown className={`${downvoted ? "text-red-500" : "text-gray-400"} hover:scale-110 transition-all text-lg`} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3 cursor-pointer select-none">{counts.downvotes}</span>
        </div>
      )}

      {show.includes('comments') && (
        <div className="flex items-center gap-1">
          <FaComment className="text-gray-400 text-lg m-0.5" />
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3">{counts.comments}</span>
        </div>
      )}

      {show.includes('views') && (
        <div className="flex items-center gap-1">
          <FaEye className="text-gray-400 text-lg m-0.5" />
          <span className="text-sm text-gray-600 dark:text-gray-400 w-3">{counts.views}</span>
        </div>
      )}
    </div>
  );
};

export default Post