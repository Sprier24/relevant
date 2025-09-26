"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"  
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { toast } from "@/hooks/use-toast"
import { ReloadIcon } from "@radix-ui/react-icons"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false)
  const [emailSent, setEmailSent] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const router = useRouter()

  // Handle Forgot Password Submit
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setEmailSent(true);
      toast({
        title: "Success",
        description: data.message,
      });
    } catch (error: any) {
      console.error("Forgot password error", error);
      setEmailSent(true);
      toast({
        title: "If an account exists with this email, you'll receive a password reset link.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = () => {
      if (password.length < 8) return "Password must be at least 8 characters";
      if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
      if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
      if (!/[0-9]/.test(password)) return "Password must contain at least one number";
      if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
      return "";
    };

    const passwordError = passwordValidation();
    if (passwordError) {
      toast({
        title: "Invalid password",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const userResponse = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const userData = await userResponse.json();
      if (userResponse.ok) {
        localStorage.setItem("userId", userData.user.id);
        localStorage.setItem("authToken", userData.accessToken);
        toast({
          title: "Login successful",
        });
        router.push("/user/dashboard"); // Redirect to user dashboard after successful login
        return;
      }

      const adminResponse = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const adminData = await adminResponse.json();
      if (adminResponse.ok) {
        localStorage.setItem("authToken", adminData.accessToken);
        localStorage.setItem("adminId", adminData.admin.id);
        localStorage.setItem("adminEmail", adminData.admin.email);
        toast({
          title: "Admin login successful",
        });
        router.push("/admin/dashboard"); // Redirect to admin dashboard after successful login
        return;
      }

      const errorMessage = userData.error || adminData.error || "Invalid credentials";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isForgotPassword ? (
        emailSent ? (
          <div className="border border-black dark:border-black rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-xl text-black dark:text-black">Check your email</h2>
            <p className="text-black text-sm mt-2 dark:text-black">
              If an account exists with this email, you'll receive a password reset link.
            </p>
            <p
              className="flex items-center justify-center gap-1 text-sm text-blue-600 dark:text-blue-600 hover:underline cursor-pointer mt-4"
              onClick={() => {
                setIsForgotPassword(false);
                setEmailSent(false);
              }}
            >
              Back to Login
            </p>
          </div>
        ) : (
          <div className="border border-black dark:border-black rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-xl text-black dark:text-black">Forgot Password</h2>
            <p className="text-black text-sm mt-2 dark:text-black">
              Enter your email address to receive a password reset link
            </p>
            <form onSubmit={handleForgotPasswordSubmit} className="my-8">
              <div className="mb-4">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
            <p
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-600 hover:underline cursor-pointer"
              onClick={() => setIsForgotPassword(false)}
            >
              Back to Login
            </p>
          </div>
        )
      ) : (
        <Card className="w-[350px]">
          <CardHeader>
            <img src="/img/rps.png" className="w-full h-auto max-w-[450px]" alt="Logo" />
            <CardTitle className=" text-2xl text-center">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col space-y-1.5 relative">
                <Label htmlFor="password">Password</Label>
                <Input
                  type={passwordVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <div
                  className="flex flex-col absolute top-5 right-2 cursor-pointer"
                  onClick={() => !loading && setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? (
                    <AiOutlineEyeInvisible size={24} className={loading ? "opacity-50" : ""} />
                  ) : (
                    <AiOutlineEye size={24} className={loading ? "opacity-50" : ""} />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex justify-end mb-8">
              <p
                className="text-sm text-blue-700 dark:text-blue-700 hover:underline cursor-pointer"
                onClick={() => setIsForgotPassword(true)}
              >
                Forgot Password?
              </p>
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
