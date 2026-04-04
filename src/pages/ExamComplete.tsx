import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Home, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ExamComplete = () => {
  const isStudentLoggedIn = sessionStorage.getItem("student_logged_in") === "true";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring" }} className="w-full max-w-md text-center">
        <Card className="border-border/50 shadow-xl">
          <CardContent className="pt-10 pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 h-20 w-20 rounded-full bg-success/10 flex items-center justify-center"
            >
              <CheckCircle2 className="h-10 w-10 text-success" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Exam Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Your answers have been recorded successfully. You can view your results once the teacher publishes them.
            </p>

            <div className="flex flex-col gap-2">
              {isStudentLoggedIn ? (
                <>
                  <Button asChild className="gap-2 bg-[#2563EB] hover:bg-[#1d4ed8]">
                    <Link to="/student/dashboard"><BarChart3 className="h-4 w-4" /> Go to Dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" className="gap-2">
                    <Link to="/"><Home className="h-4 w-4" /> Back to Home</Link>
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/"><Home className="h-4 w-4" /> Back to Home</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ExamComplete;
