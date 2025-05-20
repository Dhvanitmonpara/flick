import { themeType } from "@/lib/types";
import { IUser } from "@/types/User";
import { create } from "zustand";

interface ProfileState {
  profile: IUser;
  setProfile: (profile: IUser) => void;
  updateProfile: (updatedProfile: Partial<IUser>) => void;
  removeProfile: () => void;
  setTheme: (theme: themeType) => void;
}

const useProfileStore = create<ProfileState>((set) => ({
  profile: {
    _id: "",
    bookmarks: [],
    branch: "",
    isBlocked: false,
    suspension: {
      ends: new Date(),
      howManyTimes: 0,
      reason: "",
    },
    theme: "light",
    username: "",
    college: "",
  },
  setProfile: (profile) => set({ profile }),
  updateProfile: (updatedProfile) =>
    set((state) => ({
      profile: { ...state.profile, ...updatedProfile },
    })),
  removeProfile: () =>
    set({
      profile: {
        _id: "",
        branch: "",
        theme: "light",
        isBlocked: false,
        suspension: {
          ends: new Date(),
          howManyTimes: 0,
          reason: "",
        },
        username: "",
        college: "",
      },
    }),
  setTheme: (theme) =>
    set((state) => {
    if (state.profile.theme === theme) return { profile: { ...state.profile } };
      return {
        profile: {
          ...state.profile,
          theme,
        },
      };
    }),
}));

export default useProfileStore;
