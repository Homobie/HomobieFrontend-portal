import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Chrome } from "lucide-react";
import { authService } from "../lib/auth";

type UserRole =
  | "super_admin"
  | "admin"
  | "builder"
  | "telecaller"
  | "broker"
  | "ca"
  | "user";

const OAuth = () => {
  const [, setLocation] = useLocation();

  // Role-based redirect function (same as in your login component)
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
    const redirectPath = roleRoutes[normalizedRole] || "/dashboard";
    
    console.log(`Redirecting user with role '${role}' to '${redirectPath}'`);
    setLocation(redirectPath);
  };

  useEffect(() => {
    console.log("OAuth component mounted, checking URL params...");
    
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const error = urlParams.get('error');

    console.log("URL params:", { authCode, error });

    if (error) {
      console.error("OAuth error:", error);
      toast.error("Google login failed. Please try again.");
      setTimeout(() => {
        console.log("Redirecting to login due to error");
        setLocation('/login');
      }, 2000);
      return;
    }

    if (authCode) {
      console.log("Auth code found, processing callback...");
      handleOAuthCallback(authCode);
    } else {
      console.log("No auth code found in URL");
    }
  }, [setLocation]);

  const handleOAuthCallback = async (code) => {
    console.log("Starting OAuth callback with code:", code);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/auth/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          source: 'WEB'
        }),
      });

      console.log("OAuth callback response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("OAuth callback response data:", data);
        
        if (data.user && data.tokens) {
          console.log("Valid user and tokens received, setting auth data...");
          authService.setAuthData(data.user, data.tokens);
          
          console.log("Auth data set successfully");
          toast.success("Login successful!");
          
          // Clean up the URL
          console.log("Cleaning up URL...");
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Use role-based redirect instead of hardcoded dashboard
          console.log("User data received:", data.user);
          
          if (data.user.role) {
            console.log("User role found:", data.user.role);
            
            // Add a small delay to ensure toast shows and auth data is set
            setTimeout(() => {
              RoleBasedRedirect(data.user.role);
            }, 500);
          } else {
            console.log("No role found in user data, redirecting to default dashboard");
            setTimeout(() => {
              setLocation('/dashboard');
            }, 500);
          }
          
        } else {
          console.error("Invalid response format:", data);
          throw new Error('Invalid response format from server');
        }
      } else {
        const errorData = await response.json();
        console.error("OAuth callback failed:", errorData);
        throw new Error(errorData.message || 'Authentication failed');
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      toast.error(error.message || "Authentication failed. Please try again.");
      
      setTimeout(() => {
        console.log("Redirecting to login due to callback error");
        setLocation('/login');
      }, 1000);
    }
  };

  const handleGoogleLogin = () => {
    console.log("Starting Google OAuth login...");
    
    try {
      // Store current location for potential redirect back
      const currentPath = window.location.pathname;
      console.log("Current path:", currentPath);
      
      if (currentPath !== '/oauth' && currentPath !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        console.log("Stored redirect path:", currentPath);
      }
      
      // Redirect to your backend OAuth2 endpoint
      console.log("Redirecting to Google OAuth...");
      window.location.href = `${import.meta.env.VITE_BASE_URL}/oauth2/authorization/google`;
    } catch (error) {
      console.error("OAuth redirect failed:", error);
      toast.error("Failed to initiate Google login. Please try again.");
    }
  };

  // Show loading state if we're processing OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const isProcessingOAuth = urlParams.get('code') || urlParams.get('error');

  if (isProcessingOAuth) {
    return (
      <div className="w-full space-y-4 text-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-gray-600">Processing login...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
  <button
    onClick={handleGoogleLogin}
    className="w-full flex items-center justify-center gap-3 px-4 py-3 
               border border-gray-300 rounded-lg bg-white 
               text-gray-700 font-medium 
               hover:bg-gray-50 hover:shadow-sm 
               transition-all duration-200"
  >
    {/* Google Icon */}
    <svg className="w-5 h-5" viewBox="0 0 533.5 544.3">
      <path
        fill="#4285F4"
        d="M533.5 278.4c0-18.5-1.5-37.1-4.9-55h-254v104h145c-6.1 
           33.5-25.1 61.9-53.6 80.9v67h86.6c50.7-46.7 
           80.9-115.7 80.9-196.9z"
      />
      <path
        fill="#34A853"
        d="M274.6 544.3c72.5 0 133.5-23.9 
           178.1-64.7l-86.6-67c-24.1 16.3-55 25.9-91.5 
           25.9-70.1 0-129.5-47.3-150.7-110.6h-89.7v69.7c44.8 
           88.1 136.1 146.7 240.4 146.7z"
      />
      <path
        fill="#FBBC05"
        d="M123.9 328c-10.7-31.5-10.7-65.6 
           0-97.1v-69.7h-89.7c-37.6 74.5-37.6 
           162.3 0 236.8l89.7-69.7z"
      />
      <path
        fill="#EA4335"
        d="M274.6 109c39.6 0 75.4 13.6 
           103.6 40.3l77.3-77.3C408.1 24.2 
           347.1 0 274.6 0 170.3 0 79 58.6 
           34.2 146.7l89.7 69.7C145.1 
           156.3 204.5 109 274.6 109z"
      />
    </svg>

    <span>Continue with Google</span>
  </button>
</div>
  );
};

export default OAuth;