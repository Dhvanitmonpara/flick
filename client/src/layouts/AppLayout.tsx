import { ReactNode } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { PiCardsThreeFill, PiCardsThreeLight } from "react-icons/pi";
import { RiGraduationCapFill, RiGraduationCapLine } from "react-icons/ri";
import { BiBarChartSquare, BiSolidBarChartSquare } from "react-icons/bi";
import { PiFireFill, PiFireLight } from "react-icons/pi";
import { Separator } from "@/components/ui/separator";

function AppLayout() {
  return (
    <div className="grid grid-cols-10 max-w-[88rem] mx-auto w-full min-h-screen">
      <div className="col-span-2 space-y-2 py-6 px-4">
        <Tab to="/" text="Feed" activeIcon={<PiCardsThreeFill size={22} />} passiveIcon={<PiCardsThreeLight size={22} />} />
        <Tab to="/college" text="My College" activeIcon={<RiGraduationCapFill size={22} />} passiveIcon={<RiGraduationCapLine size={22} />} />
        <Tab to="/polls" text="Polls" activeIcon={<BiSolidBarChartSquare size={22} />} passiveIcon={<BiBarChartSquare size={22} />} />
        <Tab to="/trending" text="Trending" activeIcon={<PiFireFill size={22} />} passiveIcon={<PiFireLight size={22} />} />
        <Separator />
        <Tab to="/home" text="Home" />
        <Tab to="/home" text="Home" />
        <Tab to="/home" text="Home" />
      </div>
      <Outlet />
    </div>
  )
}

function Tab({ to, text, activeIcon, passiveIcon }: { to: string, text: string, activeIcon?: ReactNode, passiveIcon?: ReactNode }) {
  const location = useLocation().pathname
  return <Link to={to} className={`flex justify-start items-center space-x-3 px-4 ${activeIcon && passiveIcon ? "py-2" : "py-1.5"} rounded-md ${location === to ? "bg-zinc-200/50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40"}`}>
    {location === to ? (activeIcon || null) : (passiveIcon || null)}
    <span className="text-md">
      {text}
    </span>
  </Link>
}

export default AppLayout