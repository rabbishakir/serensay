"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { FormEvent, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const usernameRef = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "Invalid username or password")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Unable to sign in. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-[#EDE0E2] bg-white p-10 shadow-md">
        <Image
          src="/logo.png"
          width={100}
          height={100}
          alt="Serene Say"
          className="mx-auto mb-2"
        />
        <p className="text-center text-sm font-bold tracking-widest text-[#1E1215]">SERENE SAY</p>
        <p className="mb-8 mt-1 text-center text-xs tracking-widest text-[#C4878E]">Beauty Products</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              ref={usernameRef}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              type="text"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              autoComplete="current-password"
            />
          </div>

          <p className={`min-h-5 text-xs text-red-600 ${error ? "visible" : "invisible"}`}>
            {error || "placeholder"}
          </p>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#C4878E] text-white hover:bg-[#A86870]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[#A08488]">Internal use only · Serene Say</p>
      </div>
    </div>
  )
}
