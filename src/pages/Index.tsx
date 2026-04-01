import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, ShieldCheck, ArrowRight, Zap, BarChart3,
  BookOpen, CheckCircle2, Menu, X, Clock, Award, TrendingUp,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

const features = [
  { icon: BookOpen, title: "Create Exams Easily", description: "Build exams with multiple choice questions, set time limits, and publish with one click.", color: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" },
  { icon: Users, title: "Seamless Student Access", description: "Students join via unique access codes. No registration required — just enter and go.", color: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" },
  { icon: Zap, title: "Real-time Sync", description: "All students start simultaneously when the teacher begins the exam. Live progress tracking.", color: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white" },
  { icon: ShieldCheck, title: "Secure & Reliable", description: "Auto-save answers, countdown timers, and anti-cheat measures built in.", color: "bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white" },
  { icon: BarChart3, title: "Instant Analytics", description: "View detailed results, performance charts, and export reports instantly.", color: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white" },
  { icon: CheckCircle2, title: "Auto Grading", description: "Results are calculated and delivered the moment the exam ends. No manual marking.", color: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" },
];

const stats = [
  { value: "100%", label: "Paperless", icon: Award },
  { value: "< 1min", label: "Setup Time", icon: Clock },
  { value: "Real-time", label: "Results", icon: TrendingUp },
  { value: "Secure", label: "& Reliable", icon: ShieldCheck },
];

const howItWorks = [
  { step: "01", title: "Teacher Creates Exam", desc: "Set up questions, time limits, and security level in minutes." },
  { step: "02", title: "Students Join Instantly", desc: "Share the exam key — students enter with their Student ID, no signup needed." },
  { step: "03", title: "Results Delivered", desc: "Scores are calculated automatically and sent to students via email." },
];

const Index = () => {
  const navigate = useNavigate();
  const [examKey, setExamKey] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fsEntered, setFsEntered] = useState(false);

  const handleExamKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = examKey.trim();
    if (key) navigate(`/exam/${key}`);
  };

  const enterFullscreen = () => {
    document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .catch(() => {})
      .finally(() => setFsEntered(true));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">

      {/* ── Fullscreen entry overlay — shown until user clicks ─────────────── */}
      {!fsEntered && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#1a4a7a] cursor-pointer"
          onClick={enterFullscreen}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center px-6"
          >
            <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center">
              <img src={logo} alt="NejoExamPrep" className="h-12 w-12 rounded-full object-cover" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-3">NejoExamPrep</h1>
            <p className="text-blue-200 text-base mb-8 max-w-sm mx-auto">
              Nejo Ifa Boru Special Boarding Secondary School
            </p>
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#22C55E] text-white font-bold text-lg shadow-xl shadow-green-500/30"
            >
              <ArrowRight className="h-5 w-5" />
              Click to Enter
            </motion.div>
            <p className="text-blue-300/60 text-xs mt-4">Click anywhere to continue in fullscreen</p>
          </motion.div>
        </div>
      )}

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="NejoExamPrep" className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-100" />
            <span className="text-base font-bold text-[#0F172A] tracking-tight">NejoExamPrep</span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <a href="#features" className="text-sm text-slate-600 hover:text-[#2563EB] font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-[#2563EB] font-medium transition-colors">How it works</a>
            <div className="w-px h-5 bg-slate-200" />
            <Button asChild className="h-9 bg-[#22C55E] hover:bg-[#16a34a] text-white border-0 font-semibold text-sm">
              <Link to="/student">Student Login</Link>
            </Button>
            <Button asChild className="h-9 bg-[#2563EB] hover:bg-[#1d4ed8] text-white border-0 font-semibold text-sm">
              <Link to="/login">Teacher Sign In</Link>
            </Button>
          </div>

          <button type="button" className="md:hidden text-slate-600 p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3">
            <Button asChild className="w-full h-10 bg-[#22C55E] hover:bg-[#16a34a] text-white border-0 font-semibold">
              <Link to="/student">Student Login</Link>
            </Button>
            <Button asChild className="w-full h-10 bg-[#2563EB] hover:bg-[#1d4ed8] text-white border-0 font-semibold">
              <Link to="/login">Teacher Sign In</Link>
            </Button>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#F0FDF4]">
        {/* Floating shapes */}
        <div className="absolute top-10 right-10 w-80 h-80 bg-[#2563EB]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#22C55E]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="container relative py-16 sm:py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">

            {/* Left */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <motion.span
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold tracking-wide uppercase border border-[#2563EB]/20"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Nejo Ifa Boru Special Boarding Secondary School
              </motion.span>

              <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-tight">
                Prepare Smarter.{" "}
                <span className="text-[#2563EB]">Score Higher.</span>
                <span className="block mt-1 text-[#22C55E]">Succeed Faster.</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed">
                Create, manage, and deliver secure exams with real-time monitoring and instant results. Built for teachers, designed for students.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild
                  className="h-13 px-8 bg-[#2563EB] hover:bg-[#1d4ed8] text-white border-0 font-bold text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30">
                  <Link to="/login">
                    Start Practicing <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild
                  className="h-13 px-8 border-2 border-slate-200 text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB] text-base rounded-xl font-semibold transition-all">
                  <a href="#how-it-works">Learn More</a>
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex items-center gap-4 flex-wrap">
                {["Anti-cheat system", "Real-time results", "Free to use"].map((badge) => (
                  <div key={badge} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
                    {badge}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — Student portal card */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
              className="flex justify-center md:justify-end">
              <div className="w-full max-w-sm">
                {/* Floating card effect */}
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <Link to="/student" className="block rounded-2xl bg-white shadow-2xl shadow-blue-100/50 p-8 border border-slate-100 hover:shadow-3xl hover:border-[#2563EB]/20 transition-all group">
                    <div className="text-center mb-6">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                        <GraduationCap className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-[#0F172A]">Student Portal</h3>
                      <p className="text-sm text-slate-500 mt-1">Sign in with your Student ID</p>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 h-11 px-4 rounded-xl border-2 border-slate-200 text-sm text-slate-400 flex items-center bg-slate-50">
                        Student ID & Password
                      </div>
                      <div className="h-11 px-5 rounded-xl bg-[#22C55E] text-white font-bold text-sm flex items-center shadow-md shadow-green-500/25">
                        Login
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
                      <span>Protected by our cheat-prevention system</span>
                    </div>
                  </Link>
                </motion.div>

                {/* Decorative mini cards */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                  className="absolute -right-4 top-1/3 hidden lg:block bg-white rounded-xl shadow-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">Exam Submitted</p>
                      <p className="text-xs text-slate-400">Score: 92%</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section className="bg-[#2563EB]">
        <div className="container py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</div>
                <div className="text-xs sm:text-sm text-blue-200 mt-0.5">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="container py-16 sm:py-20">
        <div className="text-center mb-12">
          <span className="inline-block mb-3 px-3 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold tracking-wide uppercase">How it works</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Simple. Fast. Effective.</h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Get your exam running in under a minute.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {howItWorks.map((step, i) => (
            <motion.div key={step.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.12 }}
              className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="text-5xl font-extrabold text-[#2563EB]/10 mb-3">{step.step}</div>
              <h3 className="font-bold text-[#0F172A] text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              {i < howItWorks.length - 1 && (
                <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="bg-slate-50 py-16 sm:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-[#22C55E]/10 text-[#16a34a] text-xs font-semibold tracking-wide uppercase">Features</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Everything you need</h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">Powerful tools for modern exam management, from creation to results.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-lg hover:border-transparent hover:-translate-y-1 transition-all duration-300">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${feature.color}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-bold text-[#0F172A] text-base">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────────── */}
      <section className="container py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] p-10 sm:p-14 text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#22C55E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3">
              Ready to run your first exam?
            </h2>
            <p className="text-blue-200 mb-8 text-base max-w-md mx-auto">
              Sign in and create a secure exam in under a minute. Free for schools.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild
                className="h-12 px-8 bg-[#22C55E] hover:bg-[#16a34a] text-white border-0 font-bold text-base rounded-xl shadow-lg shadow-green-500/30 hover:scale-105 transition-all">
                <Link to="/login">Start Practicing <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" asChild variant="outline"
                className="h-12 px-8 border-2 border-white/30 text-white hover:bg-white/10 text-base rounded-xl font-semibold">
                <Link to="/student">Student Portal</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-6 w-6 rounded-full object-cover" />
            <span className="font-semibold text-slate-600">NejoExamPrep</span>
          </div>
          <p>© {new Date().getFullYear()} Nejo Ifa Boru Special Boarding Secondary School</p>
          <Link to="/login" className="text-[#2563EB] hover:underline font-medium">Teacher Sign In</Link>
        </div>
      </footer>

    </div>
  );
};

export default Index;
