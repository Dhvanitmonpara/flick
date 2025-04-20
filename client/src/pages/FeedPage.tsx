import Post from "@/components/general/Post"

function FeedPage() {
  return (
    <div className="py-6 w-full">
      <Post 
        avatar="https://images.unsplash.com/photo-1499714608240-22fc6ad53fb2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=76&q=80"
        avatarFallback="A"
        branch="CSE"
        commentsCount={10}
        company="Google"
        content="Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod."
        createdAt="2022-01-01"
        likesCount={10}
        title="Google sucks"
        usernameOrDisplayName="John Doe"
        viewsCount={10}
        key={1}
        topic={{industry: "Technology"}}
      />
      <Post 
        avatar="https://images.unsplash.com/photo-1499714608240-22fc6ad53fb2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=76&q=80"
        avatarFallback="A"
        branch="CSE"
        commentsCount={10}
        company="Google"
        content="Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod. lorem"
        createdAt="2022-01-01"
        likesCount={10}
        title="Google sucks"
        usernameOrDisplayName="John Doe"
        viewsCount={10}
        key={1}
        topic={{industry: "Technology"}}
      />
      <Post 
        avatar="https://images.unsplash.com/photo-1499714608240-22fc6ad53fb2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=76&q=80"
        avatarFallback="A"
        branch="CSE"
        commentsCount={10}
        company="Google"
        content="Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod."
        createdAt="2022-01-01"
        likesCount={10}
        title="Google sucks"
        usernameOrDisplayName="John Doe"
        viewsCount={10}
        key={1}
        topic={{industry: "Technology"}}
      />
    </div>
  )
}

export default FeedPage