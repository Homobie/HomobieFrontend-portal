import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, ArrowLeft, Shield } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import HomobieLogo from "/attached_assets/wmremove-transformed_-_Edited-removebg-preview.png";
import OAuth from "./OAuth";
import axios from "axios";

type UserRole =
  | "super_admin"
  | "admin"
  | "builder"
  | "telecaller"
  | "broker"
  | "ca"
  | "user";

type ViewState = "login" | "forgot" | "otp" | "reset";

export default function GlassLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  
  // View state management
  const [currentView, setCurrentView] = useState<ViewState>("login");
  
  // Login form state
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
  }>({
    username: "",
    password: "",
  });
  
  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpData, setOtpData] = useState({
    email: "",
    otp: "",
  });
  const [resetData, setResetData] = useState({
    email: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Load remembered username on component mount
  useEffect(() => {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      setFormData((prev) => ({ ...prev, username: rememberedUsername }));
      setRememberMe(true);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      const response = await login({
        username: formData.username,
        password: formData.password,
      });

      if ("email" in response) {
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', formData.username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        toast({
          title: "Welcome back!",
          description: `Logged in as ${response.email}`,
          duration: 5000,
        });

        const role = response.role.toLowerCase() as UserRole;
        RoleBasedRedirect(role);
      }
    } catch (err: any) {
      handleLoginError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!forgotEmail.trim()) {
      setError("Please enter your email address");
      setIsLoading(false);
      return;
    }

    try {
      await axios.post(
        `https://api.homobie.com/request-forgotPassword`,
        null,
        {
          params: {
            email: forgotEmail,
          },
        }
      );

      toast({
        title: "OTP sent!",
        description: "Please check your email for the OTP code",
        duration: 5000,
      });

      setUserEmail(forgotEmail);
      setOtpData(prev => ({ ...prev, email: forgotEmail }));
      setCurrentView("otp");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to send OTP. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!otpData.otp.trim()) {
      setError("Please enter the OTP code");
      setIsLoading(false);
      return;
    }

    if (otpData.otp.length !== 6) {
      setError("OTP must be 6 digits");
      setIsLoading(false);
      return;
    }

    try {
      await axios.post(
        `https://api.homobie.com/verify-Otp`,
        null,
        {
          params: {
            email: otpData.email,
            otp: otpData.otp,
          },
        }
      );

      toast({
        title: "OTP verified!",
        description: "Please set your new password",
        duration: 5000,
      });

      setResetData(prev => ({ ...prev, email: userEmail }));
      setCurrentView("reset");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Invalid OTP. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!resetData.newPassword.trim() || !resetData.confirmNewPassword.trim()) {
      setError("Please fill in all password fields");
      setIsLoading(false);
      return;
    }

    if (resetData.newPassword !== resetData.confirmNewPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (resetData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      await axios.post(
        `https://api.homobie.com/reset-password`,
        null,
        {
          params: {
            email: resetData.email,
            newPassword: resetData.newPassword,
            source: "WEB",
          },
        }
      );

      toast({
        title: "Password reset successful!",
        description: "You can now login with your new password",
        duration: 5000,
      });

      // Reset all forms
      setForgotEmail("");
      setOtpData({ email: "", otp: "" });
      setResetData({ email: "", newPassword: "", confirmNewPassword: "" });
      setUserEmail("");
      setCurrentView("login");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to reset password. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const RoleBasedRedirect = (role: string) => {
    const roleRoutes: Record<string, string> = {
      super_admin: "/admin",
      admin: "/admin",
      builder: "/builder",
      telecaller: "/telecaller",
      broker: "/broker",
      ca: "/ca/portfolio",
      user: "/dashboard",
    };

    const normalizedRole = role.toLowerCase();
    setLocation(roleRoutes[normalizedRole] || "/dashboard");
  };

  const handleLoginError = (err: any) => {
    console.error("Login error:", err);

    let errorMessage = "Login failed. Please try again.";

    if (err?.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err?.message) {
      if (
        err.message.includes("credentials") ||
        err.message.includes("Invalid")
      ) {
        errorMessage = "Invalid username or password";
      } else if (
        err.message.includes("network") ||
        err.message.includes("fetch")
      ) {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.message.includes("timeout")) {
        errorMessage = "Request timeout. Please try again.";
      } else {
        errorMessage = err.message;
      }
    }

    setError(errorMessage);
    setFormData((prev) => ({ ...prev, password: "" }));

    toast({
      title: "Login failed",
      description: errorMessage,
      variant: "destructive",
      duration: 5000,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) {
      setError(null);
    }

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetToLogin = () => {
    setCurrentView("login");
    setError(null);
    setForgotEmail("");
    setOtpData({ email: "", otp: "" });
    setResetData({ email: "", newPassword: "", confirmNewPassword: "" });
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "login": return "Welcome Back";
      case "forgot": return "Forgot Password";
      case "otp": return "Verify OTP";
      case "reset": return "Reset Password";
      default: return "Welcome Back";
    }
  };

  const getViewDescription = () => {
    switch (currentView) {
      case "login": return "Sign in to access your account";
      case "forgot": return "Enter your email to reset your password";
      case "otp": return "Enter the OTP sent to your email";
      case "reset": return "Create your new password";
      default: return "Sign in to access your account";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <GlassBackground />

      {/* Background animation elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20 + Math.random() * 40, 0],
              x: [0, -10 + Math.random() * 20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md px-6 py-12"
      >
        <GlassCard
          gradient="primary"
          blur="xl"
          className="p-8 relative overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute -right-20 -top-20 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl" />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            {currentView === "login" ? (
              <img
                src={HomobieLogo}
                alt="Company Logo"
                className="mx-auto h-24 w-auto mb-4"
              />
            ) : (
              <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center rounded-full bg-blue-500/20">
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gradient-primary mb-2">
              {getViewTitle()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {getViewDescription()}
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center"
            >
              <AlertCircle className="text-red-500 mr-2 h-5 w-5" />
              <span className="text-red-500 text-sm">{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          {currentView === "login" && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onSubmit={handleLoginSubmit}
              className="space-y-6"
            >
              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username or Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="username@example.com"
                    required
                    className="pl-10 bg-white/20 border-white/30 backdrop-blur-sm focus:bg-white/30 focus:border-blue-400 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setCurrentView("forgot")}
                    className="text-sm text-gradient-primary hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="pl-10 pr-10 bg-white/20 border-white/30 backdrop-blur-sm focus:bg-white/30 focus:border-blue-400 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me and Sign In Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    Remember me
                  </label>
                </div>

                <GlassButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isLoading}
                  className={cn(
                    "w-32 justify-center",
                    isLoading && "opacity-80 cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Signing In
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </GlassButton>
              </div>
              <OAuth/>
            </motion.form>
          )}

          {/* Forgot Password */}
          {currentView === "forgot" && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onSubmit={handleForgotPasswordSubmit}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your email address"
                    required
                    className="pl-10 bg-white/20 border-white/30 backdrop-blur-sm focus:bg-white/30 focus:border-blue-400 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={resetToLogin}
                  disabled={isLoading}
                  className="flex-1 justify-center"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isLoading}
                  className="flex-1 justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Sending
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </GlassButton>
              </div>
            </motion.form>
          )}

          {/* OTP Form */}
          {currentView === "otp" && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onSubmit={handleOtpSubmit}
              className="space-y-6"
            >
              <div className="text-center mb-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  We've sent a 6-digit OTP to:{" "}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {userEmail}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enter OTP
                </label>
                <Input
                  type="text"
                  value={otpData.otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpData(prev => ({ ...prev, otp: value }));
                    if (error) setError(null);
                  }}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                  className="text-center text-lg tracking-widest bg-white/20 border-white/30 backdrop-blur-sm focus:bg-white/30 focus:border-blue-400 transition-all"
                  disabled={isLoading}
                />
              </div>

              <div className="text-center">
                <p className="text-gray-500 text-sm mb-2">
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (userEmail) {
                      handleForgotPasswordSubmit({ preventDefault: () => {} } as React.FormEvent);
                    }
                  }}
                  className="text-sm text-gradient-primary font-medium hover:underline"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Resend OTP"}
                </button>
              </div>

              <div className="flex gap-4">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setCurrentView("forgot")}
                  disabled={isLoading}
                  className="flex-1 justify-center"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isLoading}
                  className="flex-1 justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Verifying
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </GlassButton>
              </div>
            </motion.form>
          )}

          {/* Reset Password */}
          {currentView === "reset" && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onSubmit={handleResetPasswordSubmit}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={resetData.newPassword}
                      onChange={(e) => {
                        setResetData(prev => ({ ...prev, newPassword: e.target.value }));
                        if (error) setError(null);
                      }}
                      placeholder="Enter new password"
                      required
                      className="pl-10 pr-10 bg-white/20 border-white/30 backdrop-blur-sm focus:bg-white/30 focus:border-blue-400 transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isLoading}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={resetData.confirmNewPassword}
                      onChange={(e) => {
                        setResetData(prev => ({ ...prev, confirmNewPassword: e.target.value }));
                        if (error) setError(null);
                      }}
                      placeholder="Confirm new password"
                      required
                      className="pl-10 pr-10 bg-white/20 border-white/30 backdrop-blur-sm focus:bg-white/30 focus:border-blue-400 transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={resetToLogin}
                  disabled={isLoading}
                  className="flex-1 justify-center"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isLoading}
                  className="flex-1 justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Resetting
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </GlassButton>
              </div>
            </motion.form>
          )}

          {/* Sign Up Link - Only show on login view */}
          {currentView === "login" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-8 text-center text-sm"
            >
              <p className="text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <Link href="/register">
                  <span className="text-gradient-primary font-medium hover:underline cursor-pointer">
                    Sign up
                  </span>
                </Link>
              </p>
            </motion.div>
          )}
        </GlassCard>

        {/* Footer Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-6 text-center text-xs text-gray-500"
        >
          <p>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}