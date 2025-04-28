import { Link, NavLink } from "react-router-dom"
import ThemeToggler from "./ThemeToggler"
import UserProfile from "./UserProfile";
import { useEffect } from "react";
import axios from "axios";
import useProfileStore from "@/store/profileStore";

const navLinks = [
  { to: "/home", label: "Home" },
  { to: "/", label: "Feed" },
];

function Header() {

  const { setProfile } = useProfileStore()

  useEffect(() => {
    try {
      const fetchUser = async () => {
        const user = await axios.get(`${import.meta.env.VITE_SERVER_API_URL}/users/me`,{
          withCredentials: true
        })

        if (user.status !== 201) {
          return
        }
        console.log(user.data)

        setProfile(user.data)
      }
      fetchUser()
    } catch (error) {
      console.log(error)
    }
  }, [setProfile])

  return (
    <>
      <nav className="fixed h-14 z-50 bg-zinc-100 dark:bg-zinc-900 dark:border-b-2 dark:border-zinc-800 top-0 left-0 shadow-md w-full">
        <div className="max-w-[88rem] flex justify-between mx-auto items-center px-4">
          <Link to="/">
            <img className="h-14 w-14" src="/Logo.png" alt="logo" />
          </Link>
          <ul className="flex gap-4 h-14">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `font-semibold h-full border-b-2 flex items-center ${isActive ? "text-zinc-950 dark:text-zinc-100 border-zinc-950 dark:border-zinc-100" : "text-gray-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </ul>
          <div className="flex gap-4">
            <ThemeToggler />
            <UserProfile />
          </div>
        </div>
      </nav>
      <div className="h-14"></div>
    </>
  )
}

export default Header