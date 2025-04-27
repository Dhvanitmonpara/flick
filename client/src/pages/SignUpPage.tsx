import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { IoMdEye, IoMdEyeOff } from "react-icons/io"
import { Button } from "@/components/ui/button"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import axios from "axios"

const signInSchema = z.object({
  email: z.string().email("Email is invalid"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const inputStyling = "bg-zinc-200 dark:bg-zinc-800 focus:border-zinc-900 focus-visible:ring-zinc-900 dark:focus:border-zinc-100 dark:focus-visible:ring-zinc-100"

type SignInFormData = z.infer<typeof signInSchema>

function SignUpPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordShowing, setIsPasswordShowing] = useState(false)

  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInFormData) => {
    setIsSubmitting(true)
    try {
      console.log("Signing in with", data)
      
      await axios.post(
        `${import.meta.env.VITE_SERVER_API_URL}/users/initialize`,
        { email: data.email, password: data.password },
        { withCredentials: true }
      )

      navigate("/auth/otp")
    } catch (err) {
      console.error("Sign in error", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto px-6 py-8 border dark:border-zinc-800 rounded-lg shadow-lg">
      <h1 className="text-3xl font-semibold mb-6 text-center">Sign Up</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          id="email"
          disabled={isSubmitting}
          className={inputStyling}
          type="email"
          placeholder="Enter your email"
          {...register("email")}
          required
          autoFocus
        />
        {errors.email && <p className="text-red-500 text-sm !mt-1">{errors.email.message}</p>}
        <div className="w-full flex relative">
          <Input
            id="password"
            onCopy={() => {
              toast.warning("Copy password at your own risk!")
            }}
            type={isPasswordShowing ? "text" : "password"}
            disabled={isSubmitting}
            placeholder="Enter password"
            className={inputStyling}
            {...register("password")}
            required
          />
          <div
            className="w-12 absolute right-0 flex justify-center items-center h-full cursor-pointer"
            onClick={() => {
              setIsPasswordShowing((prev) => !prev);
            }}
          >
            {isPasswordShowing ? <IoMdEyeOff /> : <IoMdEye />}
          </div>
        </div>
        {errors.password && <p className="text-red-500 text-sm !mt-1">{errors.password.message}</p>}
        <div className="w-full flex relative">
          <Input
            id="confirm-password"
            className={inputStyling}
            disabled={isSubmitting}
            type={isPasswordShowing ? "text" : "password"}
            placeholder="Confirm password"
            {...register("confirmPassword")}
            required
          />
          <div
            className="w-12 absolute right-0 flex justify-center items-center h-full cursor-pointer"
            onClick={() => {
              setIsPasswordShowing((prev) => !prev);
            }}
          >
            {isPasswordShowing ? <IoMdEyeOff /> : <IoMdEye />}
          </div>
        </div>
        {errors.confirmPassword && <p className="text-red-500 text-sm !mt-1">{errors.confirmPassword?.message}</p>}
        <Button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 font-semibold rounded-md dark:text-zinc-900 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors ${isSubmitting && "bg-zinc-500 cursor-wait"}`}
        >
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait</> : "Create an Account"}
        </Button>
      </form>
      {errors.root && <p className="text-red-500 text-sm !mt-1">{errors.root?.message}</p>}
      <p className={`text-center pt-4 ${isSubmitting && "text-zinc-900/50 dark:text-zinc-100/50"}`}>
        Already have an account?{" "}
        <Link
          to="/auth/signin"
          className={isSubmitting ? "pointer-events-none cursor-not-allowed text-blue-600/50 dark:text-blue-500/50" : "hover:underline text-blue-600 dark:text-blue-500 cursor-pointer"}
        >
          Signin
        </Link>
      </p>
    </div>
  )
}

export default SignUpPage
