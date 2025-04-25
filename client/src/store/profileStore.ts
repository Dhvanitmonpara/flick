import { themeType, User } from "@/lib/types";
import { create } from "zustand";

interface ProfileState {
  profile: User;
  setProfile: (profile: User) => void;
  updateProfile: (updatedProfile: Partial<User>) => void;
  removeProfile: () => void;
  setTheme: (theme: themeType) => void;
}

const useProfileStore = create<ProfileState>(
  (set) => ({
    profile: {
      _id: "",
      email: "",
      name: "",
      phone: "",
      github: "",
      achievements: "",
      college: "",
      currentJobRole: "",
      higherEducation: "",
      linkedin: "",
      theme: "light",
      createdAt: "",
      updatedAt: "",
      _v: 0,
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
          email: "",
          name: "",
          phone: "",
          github: "",
          achievements: "",
          college: "",
          currentJobRole: "",
          higherEducation: "",
          linkedin: "",
          theme: "light",
          createdAt: "",
          updatedAt: "",
          _v: 0,
        },
      }),
    setTheme: (theme) =>
      set((state) => ({
        profile: { ...state.profile, theme },
      })),
  })
);

export default useProfileStore;
export type { User };
