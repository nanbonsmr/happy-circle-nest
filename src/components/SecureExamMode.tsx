import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, Shield, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SecureExamModeProps {
  children: React.ReactNode;
  examMode?: boolean;
  onSecurityViolation?: (violation: string) => void;
}

const SecureExamMode = ({ 
  children, 
  examMode = false, 
  onSecurityViolation 
}: SecureExamModeProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [violations, setViolations] = useState<string[]>([]);
  const historyBlockerRef = useRef<(() => void) | null>(null);

  // Detect Safe Exam Browser
  const isSafeExamBrowser = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('safeexambrowser') || 
           userAgent.includes('seb') ||
           // Check for SEB-specific properties
           (window as any).SafeExamBrowser !== undefined ||
           // Check for restricted environment indicators
           window.location.protocol === 'seb:' ||
           document.domain === 'safeexambrowser';
  };

  // Check if running in a secure environment
  const isSecureEnvironment = () => {
    return isSafeExamBrowser() || 
           // Check for kiosk mode indicators
           window.navigator.standalone === true ||
           // Check if fullscreen
           document.fullscreenElement !== null ||
           // Check for restricted window features
           window.toolbar === undefined ||
           window.menubar === undefined;
  };

  // Prevent back navigation
  const preventBackNavigation = () => {
    // Push current state multiple times to prevent back navigation
    const currentPath = location.pathname + location.search;
    
    // Add multiple history entries
    for (let i = 0; i < 10; i++) {
      window.history.pushState(null, '', currentPath);
    }

    // Listen for popstate events (back button)
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      
      // Push the current state again
      window.history.pushState(null, '', currentPath);
      
      // Log violation
      const violation = "Attempted to navigate away from exam";
      setViolations(prev => [...prev, violation]);
      onSecurityViolation?.(violation);
      
      // Show warning
      if (window.confirm("You cannot navigate away during the exam. This action has been logged.")) {
        // Stay on current page
        return false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  };

  // Prevent page refresh and close
  const preventPageActions = () => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const message = "Leaving this page will end your exam session. Are you sure?";
      event.preventDefault();
      event.returnValue = message;
      
      // Log violation
      const violation = "Attempted to refresh or close exam page";
      setViolations(prev => [...prev, violation]);
      onSecurityViolation?.(violation);
      
      return message;
    };

    // Prevent F5, Ctrl+R, etc.
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent refresh keys
      if (event.key === 'F5' || 
          (event.ctrlKey && event.key === 'r') ||
          (event.ctrlKey && event.key === 'R') ||
          (event.metaKey && event.key === 'r') ||
          (event.metaKey && event.key === 'R')) {
        event.preventDefault();
        
        const violation = "Attempted to refresh page using keyboard shortcut";
        setViolations(prev => [...prev, violation]);
        onSecurityViolation?.(violation);
        
        alert("Page refresh is not allowed during the exam.");
        return false;
      }

      // Prevent developer tools
      if (event.key === 'F12' ||
          (event.ctrlKey && event.shiftKey && event.key === 'I') ||
          (event.ctrlKey && event.shiftKey && event.key === 'J') ||
          (event.ctrlKey && event.key === 'U')) {
        event.preventDefault();
        
        const violation = "Attempted to open developer tools";
        setViolations(prev => [...prev, violation]);
        onSecurityViolation?.(violation);
        
        alert("Developer tools are not allowed during the exam.");
        return false;
      }

      // Prevent Alt+Tab (Windows) and Cmd+Tab (Mac)
      if ((event.altKey && event.key === 'Tab') ||
          (event.metaKey && event.key === 'Tab')) {
        event.preventDefault();
        
        const violation = "Attempted to switch applications";
        setViolations(prev => [...prev, violation]);
        onSecurityViolation?.(violation);
        
        return false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
    };
  };

  // Disable right-click context menu
  const disableContextMenu = () => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      
      const violation = "Attempted to open context menu";
      setViolations(prev => [...prev, violation]);
      onSecurityViolation?.(violation);
      
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  };

  // Monitor focus changes
  const monitorFocus = () => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const violation = "Page lost focus - possible tab switching";
        setViolations(prev => [...prev, violation]);
        onSecurityViolation?.(violation);
      }
    };

    const handleBlur = () => {
      const violation = "Window lost focus";
      setViolations(prev => [...prev, violation]);
      onSecurityViolation?.(violation);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  };

  // Initialize secure mode
  useEffect(() => {
    if (!examMode) return;

    setIsSecureMode(true);
    
    // Set up security measures
    const cleanupFunctions: (() => void)[] = [];
    
    cleanupFunctions.push(preventBackNavigation());
    cleanupFunctions.push(preventPageActions());
    cleanupFunctions.push(disableContextMenu());
    cleanupFunctions.push(monitorFocus());

    // Store cleanup function
    historyBlockerRef.current = () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };

    // Cleanup on unmount
    return () => {
      historyBlockerRef.current?.();
    };
  }, [examMode, location.pathname]);

  // Security warning for non-SEB environments
  const showSecurityWarning = examMode && !isSafeExamBrowser() && !isSecureEnvironment();

  if (showSecurityWarning) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-red-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-red-800 mb-2">Security Warning</h2>
              <p className="text-red-700 text-sm leading-relaxed">
                This exam requires a secure browser environment. Please use Safe Exam Browser (SEB) 
                or contact your administrator for proper exam access.
              </p>
            </div>
            
            <div className="space-y-3 text-left text-sm">
              <div className="flex items-center gap-2 text-red-600">
                <Shield className="h-4 w-4" />
                <span>Secure browser required</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <Lock className="h-4 w-4" />
                <span>Navigation restrictions active</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <Eye className="h-4 w-4" />
                <span>Activity monitoring enabled</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-red-200">
              <Button 
                onClick={() => navigate('/student')}
                variant="outline"
                className="w-full border-red-300 text-red-700 hover:bg-red-50"
              >
                Return to Student Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${examMode ? 'exam-secure-mode' : ''}`}>
      {children}
      
      {/* Security status indicator */}
      {examMode && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Secure Mode Active
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureExamMode;