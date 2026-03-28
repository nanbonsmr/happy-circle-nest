import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, ShieldCheck, ArrowRight, Zap, BarChart3, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: BookOpen,
    title: "Create Exams Easily",
    description: "Build exams with multiple choice questions, set time limits, and publish with one click.",
  },
  {
    icon: Users,
    title: "Seamless Student Access",
    description: "Students join via unique access codes. No registration required — just enter and go.",
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description: "All students start simultaneously when the teacher begins the exam. Live progress tracking.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Auto-save answers, countdown timers, and anti-cheat measures built in.",
  },
  {
    icon: BarChart3,
    title: "Instant Analytics",
    description: "View detailed results, performance charts, and export reports instantly.",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [examKey, setExamKey] = useState("");

  const handleExamKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (examKey.trim()) {
      navigate(`/exam/${examKey.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-[hsl(210,29%,24%)]">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="NejoExamPrep Logo" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-lg font-bold text-white">NejoExamPrep</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Student Exam Key inline */}
            <form onSubmit={handleExamKeySubmit} className="hidden sm:flex items-center gap-2">
              <Input
                placeholder="Student Exam Key"
                value={examKey}
                onChange={(e) => setExamKey(e.target.value)}
                className="h-9 w-40 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
              />
              <Button type="submit" size="sm" variant="outline" className="h-9 border-white/30 text-white hover:bg-white/10">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            <Button asChild className="bg-white text-[hsl(210,29%,24%)] hover:bg-white/90 font-semibold">
              <Link to="/login">Sign Up</Link>
            </Button>
            <Button variant="ghost" asChild className="text-white hover:bg-white/10">
              <Link to="/login">Teacher Sign In</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Orange accent shape */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-amber-400/30 via-amber-300/10 to-transparent -z-10" />
        <div className="container py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                Simply Powerful{" "}
                <span className="block text-5xl sm:text-6xl md:text-7xl gradient-text">Online Exams</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-lg">
                Easy to get started and intuitive to use. NejoExamPrep equips you with all the power and functionality you need to create secure exams for your students, your way.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="gradient-primary border-0 text-primary-foreground hover:opacity-90 h-12 px-8 text-base font-semibold rounded-full">
                  <Link to="/login">
                    Sign Up For Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base rounded-full">
                  <Link to="/login">Book a Demo</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Nejo Ifa Boru Special Boarding Secondary School
              </p>
            </motion.div>

            {/* Right side: Student exam key card (mobile + visual) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card shadow-2xl p-8">
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[hsl(210,29%,24%)] flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">Student</h3>
                </div>
                <form onSubmit={handleExamKeySubmit} className="space-y-4">
                  <Input
                    placeholder="Enter exam key"
                    value={examKey}
                    onChange={(e) => setExamKey(e.target.value)}
                    className="h-12 text-base"
                  />
                  <Button type="submit" className="w-full h-12 bg-[hsl(210,29%,24%)] text-white hover:bg-[hsl(210,29%,20%)] font-semibold text-base">
                    Next
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Everything you need</h2>
          <p className="text-muted-foreground mt-2">Powerful features for modern exam management</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} NejoExamPrep — Nejo Ifa Boru Special Boarding Secondary School.
        </div>
      </footer>
    </div>
  );
};

export default Index;
