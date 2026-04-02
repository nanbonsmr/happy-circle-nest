import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Users, ShieldCheck, ArrowRight, Zap, BarChart3,
  BookOpen, CheckCircle2, Menu, X, Clock, Award, TrendingUp,
  GraduationCap, Star, Globe, Smartphone, Monitor, Tablet,
  Eye, Lock, Timer, Trophy, UserCheck, FileText, Brain,
  Target, Sparkles, ChevronRight, Play, Pause, MapPin,
  School, Building2, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: "Smart Exam Creation",
      description: "Build comprehensive exams with multiple question types, time limits, and advanced settings in minutes.",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      icon: ShieldCheck,
      title: "Advanced Security",
      description: "Anti-cheat detection, fullscreen mode, tab monitoring, and violation tracking for exam integrity.",
      color: "from-green-500 to-green-600", 
      bgColor: "bg-green-50",
      textColor: "text-green-600"
    },
    {
      icon: Users,
      title: "Student Management",
      description: "Easy student registration, access code system, and seamless exam joining experience.",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50", 
      textColor: "text-purple-600"
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Live progress tracking, detailed performance reports, and instant result generation.",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600"
    },
    {
      icon: Timer,
      title: "Time Management",
      description: "Precise countdown timers, auto-submission, and flexible duration settings for every exam.",
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      icon: Trophy,
      title: "Instant Results",
      description: "Automated grading, performance analytics, and immediate feedback delivery to students.",
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600"
    }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: CheckCircle2 },
    { value: "< 30s", label: "Setup Time", icon: Clock },
    { value: "Real-time", label: "Results", icon: TrendingUp },
    { value: "Secure", label: "& Reliable", icon: ShieldCheck },
  ];

  // Sample schools data
  const schools = [
    {
      name: "Nejo Ifa Boru Secondary",
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&h=150&fit=crop&crop=center",
      location: "Main Campus"
    },
    {
      name: "St. Mary's Academy",
      image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&h=150&fit=crop&crop=center",
      location: "Branch Campus"
    },
    {
      name: "Green Valley School",
      image: "https://images.unsplash.com/photo-1562774053-701939374585?w=150&h=150&fit=crop&crop=center",
      location: "Partner School"
    },
    {
      name: "Future Leaders High",
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&h=150&fit=crop&crop=center",
      location: "Affiliate"
    },
    {
      name: "Excellence Academy",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop&crop=center",
      location: "Partner School"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Abstract Shapes */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-pink-400/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            x: [0, 10, 0]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-40 left-10 w-24 h-24 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-lg rotate-45 blur-lg"
        />
        <motion.div
          animate={{ 
            rotate: [0, -360],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute bottom-40 right-40 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-lg"
        />
        
        {/* Stars */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 3 + i * 0.5, 
              repeat: Infinity, 
              delay: i * 0.3 
            }}
            className="absolute"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
            }}
          >
            <Star className="w-4 h-4 text-yellow-300/60 fill-current" />
          </motion.div>
        ))}

        {/* Educational Icons */}
        <motion.div
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-32 right-1/4"
        >
          <GraduationCap className="w-8 h-8 text-yellow-300/40" />
        </motion.div>
        <motion.div
          animate={{ 
            y: [0, 10, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-1/3 left-1/4"
        >
          <BookOpen className="w-6 h-6 text-green-300/40" />
        </motion.div>
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-1/2 right-20"
        >
          <Trophy className="w-7 h-7 text-orange-300/40" />
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="relative">
                <img src={logo} alt="NejoExamPrep" className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/20 shadow-lg" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">
                  NejoExamPrep
                </span>
                <div className="text-xs text-white/70 -mt-1">Smart Exam Platform</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Home
              </a>
              <a href="#about" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                About Us
              </a>
              <a href="#features" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Features
              </a>
              <a href="#testimonials" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Testimonials
              </a>
              <a href="#contact" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Contact
              </a>
              <Button asChild className="bg-white text-purple-700 hover:bg-white/90 rounded-full px-6 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <Link to="/login">Login</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden py-4 space-y-3 border-t border-white/20"
            >
              <a href="#home" className="block text-white/80 hover:text-white transition-colors py-2">Home</a>
              <a href="#about" className="block text-white/80 hover:text-white transition-colors py-2">About Us</a>
              <a href="#features" className="block text-white/80 hover:text-white transition-colors py-2">Features</a>
              <a href="#testimonials" className="block text-white/80 hover:text-white transition-colors py-2">Testimonials</a>
              <a href="#contact" className="block text-white/80 hover:text-white transition-colors py-2">Contact</a>
              <Button asChild className="w-full bg-white text-purple-700 hover:bg-white/90 rounded-full font-semibold mt-4">
                <Link to="/login">Login</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-5xl mx-auto">
            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
                <span className="text-white block mb-2">
                  Transform Your
                </span>
                <span className="relative inline-block">
                  <span className="text-white">Exam</span>
                  <span className="relative mx-4">
                    <span className="bg-gradient-to-r from-yellow-400 to-green-400 text-purple-900 px-4 py-2 rounded-2xl font-black">
                      Experience
                    </span>
                  </span>
                </span>
                <span className="text-white block mt-2">
                  With Smart Technology
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg sm:text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed"
              >
                Create, manage, and deliver secure online exams with advanced anti-cheat protection, 
                real-time monitoring, and instant results. Built for modern education.
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mb-12"
              >
                <Button
                  size="lg"
                  asChild
                  className="bg-gradient-to-r from-green-400 to-yellow-400 text-purple-900 hover:from-green-500 hover:to-yellow-500 rounded-full px-8 py-4 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-0"
                >
                  <Link to="/login" className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6" />
                    Enroll Now
                    <ArrowRight className="h-6 w-6" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Schools Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-center gap-2 text-white/70">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Launching in schools across Ethiopia and beyond
                </span>
              </div>

              {/* School Cards */}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                {schools.map((school, index) => (
                  <motion.div
                    key={school.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.8 + index * 0.1,
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      y: -5
                    }}
                    className="group cursor-pointer"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-xl group-hover:border-white/40 transition-all duration-300">
                        <img
                          src={school.image}
                          alt={school.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                        <span className="text-xs font-semibold text-purple-900 whitespace-nowrap">
                          {school.location}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60 pt-8"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Free to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  <span>Secure & reliable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-yellow-400" />
                  <span>Real-time results</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>Unlimited students</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl mb-3">
                  <stat.icon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-900">{stat.value}</div>
                <div className="text-slate-600 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-slate-50 to-purple-50/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 mb-4"
            >
              <Star className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">Powerful Features</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need for
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> modern exams</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Comprehensive tools designed for educators and students, with security and ease-of-use at the forefront.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <Card className="h-full bg-white hover:bg-gradient-to-br hover:from-white hover:to-purple-50/50 border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <CardContent className="p-8">
                    <div className={`inline-flex items-center justify-center w-14 h-14 ${feature.bgColor} rounded-2xl mb-6 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`h-7 w-7 ${feature.textColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                    <div className="mt-6 flex items-center text-purple-600 font-medium group-hover:text-blue-600 transition-colors">
                      <span className="text-sm">Learn more</span>
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-100 mb-4"
            >
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">Simple Process</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Get started in
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"> 3 easy steps</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From exam creation to result delivery, our streamlined process makes online testing effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-1/2 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 -translate-y-1/2" />
            
            {[
              {
                step: "01",
                title: "Create Your Exam",
                description: "Build comprehensive exams with our intuitive editor. Add questions, set time limits, and configure security settings.",
                icon: FileText,
                color: "from-blue-500 to-blue-600"
              },
              {
                step: "02", 
                title: "Students Join",
                description: "Share the access code with students. They can join instantly using their student ID - no complex registration required.",
                icon: UserCheck,
                color: "from-purple-500 to-purple-600"
              },
              {
                step: "03",
                title: "Get Results",
                description: "Automatic grading and instant results. View detailed analytics and export reports with just one click.",
                icon: BarChart3,
                color: "from-green-500 to-green-600"
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative text-center"
              >
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-6">
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-2xl opacity-10`} />
                  <step.icon className={`h-8 w-8 bg-gradient-to-br ${step.color} bg-clip-text text-transparent`} />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white text-sm font-bold rounded-full flex items-center justify-center">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsive Design Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 mb-6">
                <Globe className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">Cross-Platform</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Works on
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> every device</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Whether your students use phones, tablets, or computers, NejoExamPrep delivers a consistent, 
                optimized experience across all devices and screen sizes.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Smartphone, label: "Mobile" },
                  { icon: Tablet, label: "Tablet" },
                  { icon: Monitor, label: "Desktop" }
                ].map((device) => (
                  <div key={device.label} className="text-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <device.icon className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <div className="text-sm font-medium text-slate-700">{device.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative">
                {/* Desktop mockup */}
                <div className="bg-slate-800 rounded-t-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  </div>
                  <div className="bg-white rounded-lg p-6 h-64">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-8 bg-gradient-to-r from-blue-200 to-purple-200 rounded w-32" />
                      <div className="h-8 bg-green-200 rounded w-24" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
                
                {/* Mobile mockup */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-8 -right-8 w-32 h-56 bg-slate-900 rounded-3xl p-2 shadow-xl"
                >
                  <div className="bg-white rounded-2xl h-full p-3">
                    <div className="h-6 bg-gradient-to-r from-blue-200 to-purple-200 rounded mb-3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded" />
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-100 mb-4"
            >
              <Award className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">Simple Pricing</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Free for
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"> educational use</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              NejoExamPrep is completely free for schools and educational institutions. 
              No hidden costs, no subscription fees.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-lg mx-auto"
          >
            <Card className="bg-white border-0 shadow-2xl shadow-blue-500/10 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-center text-white">
                <h3 className="text-2xl font-bold mb-2">Educational License</h3>
                <div className="text-4xl font-bold mb-2">Free</div>
                <p className="text-green-100">Forever for schools</p>
              </div>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {[
                    "Unlimited exams and students",
                    "Advanced security features",
                    "Real-time monitoring",
                    "Instant result generation",
                    "Analytics and reporting",
                    "Mobile-responsive design",
                    "24/7 technical support"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full mt-8 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg">
                  <Link to="/login">Get Started Now</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-white"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ready to transform your
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-green-300 bg-clip-text text-transparent">
                exam experience?
              </span>
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of educators who trust NejoExamPrep for secure, 
              efficient, and modern online examinations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-green-400 to-yellow-400 text-purple-900 hover:from-green-500 hover:to-yellow-500 rounded-full px-8 py-4 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-0"
              >
                <Link to="/login" className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6" />
                  Start Your First Exam
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm rounded-full px-8 py-4 text-lg font-semibold"
              >
                <Link to="/student" className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Access
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="NejoExamPrep" className="h-10 w-10 rounded-xl object-cover" />
                <div>
                  <div className="text-xl font-bold">NejoExamPrep</div>
                  <div className="text-sm text-slate-400">Smart Exam Platform</div>
                </div>
              </div>
              <p className="text-slate-400 mb-4 max-w-md">
                Empowering educators with modern, secure, and efficient online examination tools. 
                Built for the future of education.
              </p>
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} Nejo Ifa Boru Special Boarding Secondary School. All rights reserved.
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link to="/login" className="block text-slate-400 hover:text-white transition-colors">
                  Teacher Login
                </Link>
                <Link to="/student" className="block text-slate-400 hover:text-white transition-colors">
                  Student Portal
                </Link>
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">
                  Features
                </a>
                <a href="#how-it-works" className="block text-slate-400 hover:text-white transition-colors">
                  How it Works
                </a>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-sm">
                <div className="text-slate-400">Help Center</div>
                <div className="text-slate-400">Documentation</div>
                <div className="text-slate-400">Contact Support</div>
                <div className="text-slate-400">System Status</div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>Built with ❤️ for modern education</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;