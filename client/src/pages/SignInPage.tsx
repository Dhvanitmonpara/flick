'use client'

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Link } from "react-router-dom"

const signInSchema = z.object({
  email: z.string().email("Email is invalid"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const inputStyling = "bg-zinc-200 dark:bg-zinc-800 focus:border-zinc-900 focus-visible:ring-zinc-900 dark:focus:border-zinc-100 dark:focus-visible:ring-zinc-100"

type SignInFormData = z.infer<typeof signInSchema>

function SignInPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      // TODO: Replace with actual API call
      await new Promise((res) => setTimeout(res, 1000))
    } catch (err) {
      console.error("Sign in error", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto px-6 py-8 border dark:border-zinc-800 rounded-lg shadow-lg">
      <h1 className="text-3xl font-semibold mb-6 text-center">Sign In</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Input
            className={inputStyling}
            type="email"
            disabled={isSubmitting}
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Input
            className={inputStyling}
            type="password"
            disabled={isSubmitting}
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 font-semibold rounded-md ${isSubmitting ? "bg-zinc-500" : "bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-900"
            } transition-colors`}
        >
          {isSubmitting 
          ? <span className="flex justify-center items-center space-x-2">
            <Loader2 className="animate-spin" />
            <span className="ml-2">Signing In</span>
          </span> 
          : "Sign In"
          }
        </button>
      </form>
      <p className="text-center pt-6 text-sm">Don&apos;t have an account? <Link className="text-blue-600 dark:text-blue-500 hover:underline" to="/auth/signup">Sign Up</Link></p>
    </div>
  )
}

export default SignInPage
