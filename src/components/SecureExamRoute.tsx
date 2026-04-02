import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SecureExamRouteProps {
  children: React.ReactNode;
  requireSecureEntry?: boolean;
}

const SecureExamRoute = ({ children, requireSecureEntry = true }: SecureExamRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthorization = () => {
      // Check if user came through proper student login flow
      const studentLoggedIn = sessionStorage.getItem("student_logged_in") === "true";
      const secureExamMode = sessionStorage.getItem("secure_exam_mode") === "true";
      const hasValidSession = sessionStorage.getItem("session_id");
      
      // Check referrer to ensure they came through /student route
      const validReferrers = [
        '/student',
        '/student/dashboard',
        '/exam/'
      ];
      
      const referrer = document.referrer;
      const cameFromValidRoute = validReferrers.some(route => 
        referrer.includes(route) || location.pathname.includes(route)
      );

      // For exam pages, require secure entry
      if (location.pathname.includes('/exam/') && location.pathname.includes('/take')) {
        if (requireSecureEntry && !secureExamMode) {
          // Redirect to secure entry
          navigate('/student', { 
            state: { 
              requireSecureEntry: true,
              returnTo: location.pathname 
            }
          });
          return;
        }
      }

      // Check if accessing exam without proper authentication
      if (location.pathname.includes('/exam/')) {
        if (!studentLoggedIn && !hasValidSession) {
          // Store the intended exam code for after login
          const pathParts = location.pathname.split('/');
          const examCode = pathParts[2];
          if (examCode) {
            sessionStorage.setItem('pending_exam_code', examCode);
          }
          
          navigate('/student', {
            state: { 
              message: "Please log in to access the exam",
              examCode: examCode
            }
          });
          return;
        }
      }

      // Prevent direct access to exam pages from landing page
      if (location.pathname.includes('/exam/') && !cameFromValidRoute && !studentLoggedIn) {
        navigate('/student', {
          state: { 
            message: "Exam access must be through student portal",
            blocked: true
          }
        });
        return;
      }

      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuthorization();
  }, [location.pathname, navigate, requireSecureEntry]);

  // Prevent back navigation to landing page during exams
  useEffect(() => {
    if (isAuthorized && location.pathname.includes('/exam/')) {
      const preventBackToLanding = (event: PopStateEvent) => {
        const currentPath = location.pathname;
        
        // If trying to go back to landing page, prevent it
        if (window.location.pathname === '/' || window.location.pathname === '/old') {
          event.preventDefault();
          window.history.pushState(null, '', currentPath);
          
          // Show warning
          alert("You cannot return to the home page during an exam. Please complete or exit the exam properly.");
        }
      };

      // Push current state to prevent back navigation
      window.history.pushState(null, '', location.pathname);
      window.addEventListener('popstate', preventBackToLanding);

      return () => {
        window.removeEventListener('popstate', preventBackToLanding);
      };
    }
  }, [isAuthorized, location.pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-red-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-700 text-sm leading-relaxed">
                Exam access is restricted to authenticated students only. 
                Please log in through the student portal to continue.
              </p>
            </div>
            
            <div className="space-y-3 text-left text-sm mb-6">
              <div className="flex items-center gap-2 text-red-600">
                <Shield className="h-4 w-4" />
                <span>Secure authentication required</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <Lock className="h-4 w-4" />
                <span>Direct exam access blocked</span>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/student')}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Go to Student Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default SecureExamRoute;