import Post from "@/components/general/Post"

function FeedPage() {
  return (
    <div className="flex gap-4 py-6 w-full">
      <section className="w-full max-h-screen overflow-y-auto no-scrollbar">
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
          topic={{ industry: "Technology" }}
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
          topic={{ industry: "Technology" }}
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
          topic={{ industry: "Technology" }}
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
          topic={{ industry: "Technology" }}
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
          topic={{ industry: "Technology" }}
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
          topic={{ industry: "Technology" }}
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
          topic={{ industry: "Technology" }}
        />
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