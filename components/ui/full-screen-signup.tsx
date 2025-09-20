"use client";

import { Brain } from "lucide-react";
import { useState } from "react";
import { useSupabaseAuth } from "@/components/supabase-auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface FullScreenSignupProps {
  mode?: "signup" | "signin";
}

export const FullScreenSignup = ({ mode = "signup" }: FullScreenSignupProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signUp, signIn } = useSupabaseAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (value: string) => {
    return value.length >= 8;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (mode === "signup" && password !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);

    try {
      if (mode === "signup") {
        await signUp(email, password, {
          full_name: name,
          email: email,
          accepted_terms: true,
          accepted_terms_at: new Date().toISOString(),
        });
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      } else {
        await signIn(email, password);
        const redirectTo = searchParams.get("redirectTo") || "/explorer";
        router.push(redirectTo);
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
      }
    } catch (error) {
      toast({
        title: mode === "signup" ? "Sign up failed" : "Sign in failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden p-4">
      <div className="w-full relative max-w-5xl overflow-hidden flex flex-col md:flex-row shadow-xl rounded-3xl">
        {/* Background gradient overlay */}
        <div className="w-full h-full z-2 absolute bg-gradient-to-t from-transparent to-black/20 rounded-3xl"></div>
        
        {/* Animated background bars */}
        <div className="flex absolute z-2 overflow-hidden backdrop-blur-2xl rounded-3xl">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className="h-[40rem] z-2 w-[4rem] bg-gradient-to-b from-transparent via-black/50 via-[69%] to-white/30 opacity-30 overflow-hidden"
            />
          ))}
        </div>
        
        {/* Decorative circles */}
        <div className="w-[15rem] h-[15rem] bg-[#FF6B2C] absolute z-1 rounded-full bottom-0 left-0"></div>
        <div className="w-[8rem] h-[5rem] bg-white absolute z-1 rounded-full bottom-0 left-8"></div>
        <div className="w-[6rem] h-[6rem] bg-[#FF6B2C]/20 absolute z-1 rounded-full bottom-12 left-20"></div>

        {/* Left side - Branding */}
        <div className="bg-black text-white p-8 md:p-12 md:w-1/2 relative rounded-l-3xl overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-medium leading-tight tracking-tight mb-4">
              AI-Powered Research Platform for Modern Academics
            </h1>
            <p className="text-white/80 text-lg">
              Transform your research workflow with intelligent tools for literature review, 
              data analysis, and academic writing.
            </p>
            <div className="mt-8 space-y-3 text-white/70">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FF6B2C] rounded-full"></div>
                <span>Smart Literature Discovery</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FF6B2C] rounded-full"></div>
                <span>AI Research Assistant</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FF6B2C] rounded-full"></div>
                <span>Collaborative Workspace</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col bg-secondary z-99 text-secondary-foreground rounded-r-3xl">
          <div className="flex flex-col items-left mb-8">
            <div className="text-[#FF6B2C] mb-4">
              <Brain className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-medium mb-2 tracking-tight">
              {mode === "signup" ? "Get Started" : "Welcome Back"}
            </h2>
            <p className="text-left opacity-80">
              {mode === "signup" 
                ? "Welcome to ThesisFlow-AI — Let's get started" 
                : "Sign in to continue your research journey"
              }
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="block text-sm mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  placeholder="Enter your full name"
                  className="text-sm w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 bg-white text-black focus:ring-[#FF6B2C] border-gray-300"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={mode === "signup"}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm mb-2">
                Your email
              </label>
              <input
                type="email"
                id="email"
                placeholder="researcher@university.edu"
                className={`text-sm w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 bg-white text-black focus:ring-[#FF6B2C] ${
                  emailError ? "border-red-500" : "border-gray-300"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby="email-error"
              />
              {emailError && (
                <p id="email-error" className="text-red-500 text-xs mt-1">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2">
                {mode === "signup" ? "Create new password" : "Password"}
              </label>
              <input
                type="password"
                id="password"
                placeholder={mode === "signup" ? "Create a secure password" : "Enter your password"}
                className={`text-sm w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 bg-white text-black focus:ring-[#FF6B2C] ${
                  passwordError ? "border-red-500" : "border-gray-300"
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!passwordError}
                aria-describedby="password-error"
              />
              {passwordError && (
                <p id="password-error" className="text-red-500 text-xs mt-1">
                  {passwordError}
                </p>
              )}
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm mb-2">
                  Confirm password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  className="text-sm w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 bg-white text-black focus:ring-[#FF6B2C] border-gray-300"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 disabled:bg-[#FF6B2C]/50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading 
                ? (mode === "signup" ? "Creating account..." : "Signing in...") 
                : (mode === "signup" ? "Create a new account" : "Sign in")
              }
            </button>

            <div className="text-center text-gray-600 text-sm">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="text-secondary-foreground font-medium underline">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-secondary-foreground font-medium underline">
                    Sign up
                  </Link>
                  <div className="mt-2">
                    <Link href="/forgot-password" className="text-secondary-foreground font-medium underline">
                      Forgot your password?
                    </Link>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
