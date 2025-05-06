import { IPost } from "@/types/Post";
import { create } from "zustand";

interface PostState {
  posts: IPost[] | null;
  setPosts: (posts: IPost[]) => void;
  updatePost: (id: string, updatedPost: Partial<IPost>) => void;
}

const usePostStore = create<PostState>((set) => ({
  posts: null,
  setPosts: (posts) => set({ posts }),
  updatePost: (id, updatedPost) =>
    set((state) => ({
      posts: state.posts?.map((post) =>
        post._id === id ? { ...post, ...updatedPost } : post
      ),
    })),
}));

export default usePostStore;
