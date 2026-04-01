import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentAccess from "./pages/StudentAccess";
import ExamReady from "./pages/ExamReady";
import ExamPage from "./pages/ExamPage";
import ExamComplete from "./pages/ExamComplete";
import AdminLogin from "./pages/AdminLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import CreateExam from "./pages/CreateExam";
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import StudentResultDetail from "./pages/StudentResultDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/student" element={<StudentLogin />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/results/:sessionId" element={<StudentResultDetail />} />
          <Route path="/exam/:accessCode" element={<StudentAccess />} />
          <Route path="/exam/:accessCode/ready" element={<ExamReady />} />
          <Route path="/exam/:accessCode/take" element={<ExamPage />} />
          <Route path="/exam/:accessCode/complete" element={<ExamComplete />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/create" element={<CreateExam />} />
          <Route path="/teacher/edit/:examId" element={<CreateExam />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
