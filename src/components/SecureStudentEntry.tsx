import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, CheckCircle2, Lock, Eye, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SecureStudentEntryProps {
  onSecureEntry: () => void;
  examCode?: string;
}

const SecureStudentEntry = ({ onSecureEntry, examCode }: SecureStudentEntryProps) => {
  const navigate = useNavigate();
  const [securityChecks, setSecurityChecks] = useState({
    safeExamBrowser: false,
    fullscreen: false,
    secureEnvironment: false,
    networkRestricted: false
  });
  const [isReady, setIsReady] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);

  // Check security environment
  useEffect(() => {
    const checkSecurityEnvironment = () => {
      const checks = {
        safeExamBrowser: checkSafeExamBrowser(),
        fullscreen: checkFullscreen(),
        secureEnvironment: checkSecureEnvironment(),
        networkRestricted: checkNetworkRestrictions()
      };
      
      setSecurityChecks(checks);
      
      // Determine if ready for secure exam
      const criticalChecks = checks.safeExamBrowser || checks.secureEnvironment;
      setIsReady(criticalChecks);
      
      // Show warnings if not all checks pass
      setShowWarnings(!Object.values(checks).every(Boolean));
    };

    checkSecurityEnvironment();
    
    // Re-check periodically
    const interval = setInterval(checkSecurityEnvironment, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const checkSafeExamBrowser = (): boolean => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('safeexambrowser') || 
           userAgent.includes('seb') ||
           (window as any).SafeExamBrowser !== undefined ||
           window.location.protocol === 'seb:';
  };

  const checkFullscreen = (): boolean => {
    return document.fullscreenElement !== null ||
           (document as any).webkitFullscreenElement !== null ||
           (document as any).mozFullScreenElement !== null ||
           (document as any).msFullscreenElement !== null;
  };

  const checkSecureEnvironment = (): boolean => {
    return window.navigator.standalone === true ||
           window.toolbar === undefined ||
           window.menubar === undefined ||
           checkSafeExamBrowser();
  };

  const checkNetworkRestrictions = (): boolean => {
    // This is a placeholder - in a real implementation, you might check
    // for specific network configurations or proxy settings
    return navigator.onLine && (
      checkSafeExamBrowser() || 
      window.location.hostname === 'localhost' ||
      window.location.protocol === 'https:'
    );
  };

  const requestFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.warn('Could not enter fullscreen:', error);
    }
  };

  const handleSecureEntry = async () => {
    // Request fullscreen if not already
    if (!securityChecks.fullscreen) {
      await requestFullscreen();
    }
    
    // Set secure session flag
    sessionStorage.setItem('secure_exam_mode', 'true');
    sessionStorage.setItem('exam_entry_time', new Date().toISOString());
    
    // Prevent navigation back to landing page
    window.history.pushState(null, '', window.location.href);
    
    onSecureEntry();
  };

  const handleExitToLanding = () => {
    // Clear any exam-related session data
    sessionStorage.removeItem('secure_exam_mode');
    sessionStorage.removeItem('exam_entry_time');
    sessionStorage.removeItem('session_id');
    sessionStorage.removeItem('access_code');
    
    // Navigate to landing page
    navigate('/');
  };

  const securityItems = [
    {
      key: 'safeExamBrowser',
      icon: Shield,
      title: 'Safe Exam Browser',
      description: 'Secure browser environment detected',
      status: securityChecks.safeExamBrowser,
      critical: true
    },
    {
      key: 'fullscreen',
      icon: Monitor,
      title: 'Fullscreen Mode',
      description: 'Application running in fullscreen',
      status: securityChecks.fullscreen,
      critical: false
    },
    {
      key: 'secureEnvironment',
      icon: Lock,
      title: 'Secure Environment',
      description: 'Restricted environment active',
      status: securityChecks.secureEnvironment,
      critical: true
    },
    {
      key: 'networkRestricted',
      icon: Eye,
      title: 'Network Security',
      description: 'Network access properly configured',
      status: securityChecks.networkRestricted,
      critical: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Secure Exam Entry
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Security verification required before accessing exam
            {examCode && (
              <span className="block mt-1 font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                Exam Code: {examCode}
              </span>
            )}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Security Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 mb-4">Security Requirements</h3>
            {securityItems.map((item) => (
              <div
                key={item.key}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                  item.status
                    ? 'border-green-200 bg-green-50'
                    : item.critical
                    ? 'border-red-200 bg-red-50'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  item.status
                    ? 'bg-green-100 text-green-600'
                    : item.critical
                    ? 'bg-red-100 text-red-600'
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-900">{item.title}</h4>
                    {item.status ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className={`h-4 w-4 ${item.critical ? 'text-red-500' : 'text-yellow-500'}`} />
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {showWarnings && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Security Notice:</strong> Some security features are not active. 
                For the most secure exam experience, please use Safe Exam Browser (SEB) 
                or ensure your environment meets all security requirements.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSecureEntry}
              disabled={!isReady}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
            >
              {isReady ? 'Enter Secure Exam Mode' : 'Security Requirements Not Met'}
            </Button>
            <Button
              onClick={handleExitToLanding}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Exit to Home
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Need help? Contact your administrator or IT support for Safe Exam Browser setup.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecureStudentEntry;