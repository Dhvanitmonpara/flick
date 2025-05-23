import { ReactNode } from "react"
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom"
import { PiCardsThreeFill, PiCardsThreeLight } from "react-icons/pi";
import { RiGraduationCapFill, RiGraduationCapLine } from "react-icons/ri";
import { BiBarChartSquare, BiSolidBarChartSquare } from "react-icons/bi";
import { PiFireFill, PiFireLight } from "react-icons/pi";
import { Separator } from "@/components/ui/separator";
import TerminateSessions from "@/components/actions/TerminateSessions";
import useProfileStore from "@/store/profileStore";
import CreatePost from "@/components/general/CreatePost";
import AuthCard from "@/components/general/AuthCard";

function AppLayout() {

  const profile = useProfileStore(state => state.profile)
  const [searchParams] = useSearchParams();
  const reset = searchParams.get('reset');

  return (
    <div className="flex max-w-[88rem] mx-auto w-full min-h-screen pr-8">
      <div className="hidden md:block w-[270px] space-y-1 py-6 px-4">
        <div className="flex justify-center items-center">
          <Link to="/">
            <img className="h-14 w-14 p-2" src={profile.theme === "dark" ? "/logo-b.png" : "/logo-w.png"} alt="logo" />
          </Link>
        </div>
        <section className="space-y-2">
          <CreatePost />
          <Tab to="/" text="Feed" activeIcon={<PiCardsThreeFill size={22} />} passiveIcon={<PiCardsThreeLight size={22} />} />
          <Tab to="/college" text="My College" activeIcon={<RiGraduationCapFill size={22} />} passiveIcon={<RiGraduationCapLine size={22} />} />
          <Tab to="/polls" text="Polls" activeIcon={<BiSolidBarChartSquare size={22} />} passiveIcon={<BiBarChartSquare size={22} />} />
          <Tab to="/trending" text="Trending" activeIcon={<PiFireFill size={22} />} passiveIcon={<PiFireLight size={22} />} />
        </section>
        <Separator />
        <Heading text="Branches" />
        <Tab to="/bca" text="Bca" />
        <Tab to="/mca" text="Mca" />
        <Tab to="/btech" text="B.tech" />
        <AuthCard />
      </div>
      <Outlet />
      {(reset === "true") && <TerminateSessions />}
    </div>
  )
}

function Tab({ to, text, activeIcon, passiveIcon }: { to: string, text: string, activeIcon?: ReactNode, passiveIcon?: ReactNode }) {
  const location = useLocation().pathname
  return <Link to={to} className={`flex justify-start items-center space-x-3 px-4 ${activeIcon && passiveIcon ? "py-2" : "py-1.5"} rounded-md ${location === to ? "bg-zinc-200/50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40"}`}>
    {location === to ? (activeIcon || null) : (passiveIcon || null)}
    <span>
      {text}
    </span>
  </Link>
}

function Heading({ text }: { text: string }) {
  return (
    <h3 className="text-lg uppercase px-4 pt-3 pb-1">{text}</h3>
  )
}

export default AppLayout