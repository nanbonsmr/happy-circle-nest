import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  ShieldCheck,
  ArrowRight,
  Zap,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: BookOpen,
    title: "Create Exams Easily",
    description:
      "Build exams with multiple choice questions, set time limits, and publish with one click.",
  },
  {
    icon: Users,
    title: "Seamless Student Access",
    description:
      "Students join via unique access codes. No registration required — just enter and go.",
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description:
      "All students start simultaneously when the teacher begins the exam. Live progress tracking.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description:
      "Auto-save answers, countdown timers, and anti-cheat measures built in.",
  },
  {
    icon: BarChart3,
    title: "Instant Analytics",
    description:
      "View detailed results, performance charts, and export reports instantly.",
  },
  {
    icon: CheckCircle2,
    title: "Auto Grading",
    description:
      "Results are calculated and delivered the moment the exam ends. No manual marking.",
  },
];

const stats = [
  { value: "100%", label: "Paperless" },
  { value: "< 1min", label: "Setup Time" },
  { value: "Real-time", label: "Results" },
  { value: "Secure", label: "& Reliable" },
];

const Index = () => {
  const navigate = useNavigate();
  const [examKey, setExamKey] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleExamKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (examKey.trim()) {
      navigate(`/exam/${examKey.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#1e3a5f] shadow-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="NejoExamPrep Logo"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
            />
            <span className="text-base font-bold text-white tracking-tight">
              NejoExamPrep
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <form
              onSubmit={handleExamKeySubmit}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Enter exam key"
                value={examKey}
                onChange={(e) => setExamKey(e.target.value)}
                className="h-9 w-44 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm focus-visible:ring-white/30"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 font-semibold"
              >
                Go <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </form>
            <div className="w-px h-6 bg-white/20" />
            <Button
              asChild
              className="h-9 bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold text-sm"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#162d4a] border-t border-white/10 px-4 py-4 space-y-3">
            <form
              onSubmit={handleExamKeySubmit}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Enter exam key"
                value={examKey}
                onChange={(e) => setExamKey(e.target.value)}
                className="flex-1 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button
                type="submit"
                className="h-10 bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 font-semibold"
              >
                Go
              </Button>
            </form>
            <Button
              asChild
              className="w-full h-10 bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#1e4976] to-[#1a3a6b]">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#f59e0b]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="container relative py-16 sm:py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block mb-4 px-3 py-1 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] text-xs font-semibold tracking-wide uppercase">
                Nejo Ifa Boru Special Boarding Secondary School
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Modern Online
                <span className="block text-[#f59e0b]">Exam Platform</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-blue-100/80 max-w-lg leading-relaxed">
                Create, manage, and deliver secure exams with real-time
                monitoring. Built for teachers, designed for students.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  asChild
                  className="h-12 px-8 bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 font-semibold text-base rounded-xl shadow-lg shadow-amber-500/25"
                >
                  <Link to="/login">Get Started</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 px-8 border-white/30 text-white hover:bg-white/10 text-base rounded-xl"
                >
                  <a href="#features">Learn More</a>
                </Button>
              </div>
            </motion.div>

            {/* Right — Student card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center md:justify-end"
            >
              <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8">
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-[#1e3a5f] flex items-center justify-center shadow-lg">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0f172a]">
                    Student Portal
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Enter your exam key to begin
                  </p>
                </div>
                <form onSubmit={handleExamKeySubmit} className="space-y-3">
                  <Input
                    placeholder="e.g. EXAM-2024-XYZ"
                    value={examKey}
                    onChange={(e) => setExamKey(e.target.value)}
                    className="h-12 text-base border-slate-200 focus-visible:ring-[#1e3a5f]"
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold text-base rounded-xl"
                  >
                    Start Exam <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
                <p className="mt-4 text-center text-xs text-slate-400">
                  No account needed — just your exam key
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-slate-100">
        <div className="container py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center"
              >
                <div className="text-xl sm:text-2xl font-extrabold text-[#1e3a5f]">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-16 sm:py-20 md:py-24">
        <div className="text-center mb-12">
          <span className="inline-block mb-3 px-3 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold tracking-wide uppercase">
            Features
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0f172a]">
            Everything you need
          </h2>
          <p className="text-slate-500 mt-2 text-base max-w-md mx-auto">
            Powerful tools for modern exam management, from creation to results.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-[#1e3a5f]/20 transition-all"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1e3a5f]/10 text-[#1e3a5f] group-hover:bg-[#1e3a5f] group-hover:text-white transition-colors">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-[#0f172a] text-base">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[#1e3a5f] mx-4 sm:mx-8 md:mx-auto md:container rounded-2xl mb-16 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f] to-[#1a4a7a] pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f59e0b]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 sm:px-10 py-10 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Ready to run your first exam?
            </h3>
            <p className="text-blue-200/70 mt-1 text-sm sm:text-base">
              Sign in and create an exam in under a minute.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 h-12 px-8 bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 font-semibold rounded-xl shadow-lg"
          >
            <Link to="/login">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Logo"
              className="h-6 w-6 rounded-full object-cover"
            />
            <span className="font-medium text-slate-600">NejoExamPrep</span>
          </div>
          <p>
            © {new Date().getFullYear()} Nejo Ifa Boru Special Boarding
            Secondary School
          </p>
          <Link
            to="/login"
            className="text-[#1e3a5f] hover:underline font-medium"
          >
            Teacher Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
