// 1. Get the post and comment karma
const post = await PostModel.findById(postId);
const comment = commentId ? await CommentModel.findById(commentId) : null;

// 2. Update karma based on voteType
let karmaChange = 0;
if (voteType === "upvote") karmaChange = 1;
else if (voteType === "downvote") karmaChange = -1;

// 3. Update post karma
await PostModel.findByIdAndUpdate(postId, { 
  $inc: { karma: karmaChange },
});

// If it’s a comment, update comment karma too
if (comment) {
  await CommentModel.findByIdAndUpdate(commentId, { 
    $inc: { karma: karmaChange },
  });
}

// 4. Update user karma
const user = await UserModel.findById(post.postedBy);

// Calculate total karma for the user by summing all posts and comments karma
const totalPostKarma = await PostModel.aggregate([
  { $match: { postedBy: user._id } },
  { $group: { _id: null, totalKarma: { $sum: "$karma" } } },
]);

const totalCommentKarma = await CommentModel.aggregate([
  { $match: { postedBy: user._id } },
  { $group: { _id: null, totalKarma: { $sum: "$karma" } } },
]);

// Sum total karma
const totalKarma = (totalPostKarma[0]?.totalKarma || 0) + (totalCommentKarma[0]?.totalKarma || 0);

// 5. Update user karma
await UserModel.findByIdAndUpdate(user._id, {
  karma: totalKarma,
});
