import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Users, ShieldCheck, ArrowRight, Zap, BarChart3,
  BookOpen, CheckCircle2, Menu, X, Clock, TrendingUp,
  GraduationCap, Star, Globe, Smartphone, Monitor, Tablet,
  Eye, Lock, Timer, Trophy, UserCheck, FileText, Brain,
  Target, Sparkles, ChevronRight, Play, Pause, MapPin,
  School, Building2, Home, Calculator, Atom, FlaskConical,
  Microscope, MapIcon, DollarSign, Languages, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.png";

// Language content
const content = {
  en: {
    nav: {
      home: "Home",
      about: "About Us", 
      features: "Features",
      subjects: "Subjects",
      contact: "Contact",
      login: "Login"
    },
    hero: {
      title: "Grade 12 National Exam",
      subtitle: "Preparation Platform",
      description: "Master your Grade 12 national exams with confidence. Practice with exam-style questions, take timed mock tests, and track your progress across all subjects.",
      cta: "Start Preparing",
      studentAccess: "Student Access",
      launching: "Empowering Grade 12 students across Ethiopia"
    },
    intro: {
      badge: "Grade 12 Focus",
      title: "Designed for Ethiopian Grade 12 Students",
      description: "Our platform is specifically built for Grade 12 national exam preparation, covering all major subjects with authentic exam-style questions and comprehensive practice materials."
    },
    subjects: {
      title: "Master All Grade 12 Subjects",
      description: "Comprehensive preparation materials for every subject in the Grade 12 curriculum",
      list: [
        { name: "Mathematics", icon: Calculator, color: "from-blue-500 to-blue-600" },
        { name: "English", icon: BookOpen, color: "from-green-500 to-green-600" },
        { name: "Physics", icon: Atom, color: "from-purple-500 to-purple-600" },
        { name: "Chemistry", icon: FlaskConical, color: "from-red-500 to-red-600" },
        { name: "Biology", icon: Microscope, color: "from-emerald-500 to-emerald-600" },
        { name: "History", icon: BookOpen, color: "from-amber-500 to-amber-600" },
        { name: "Geography", icon: MapIcon, color: "from-cyan-500 to-cyan-600" },
        { name: "Economics", icon: DollarSign, color: "from-indigo-500 to-indigo-600" }
      ]
    },
    features: {
      badge: "Powerful Features",
      title: "Everything you need for exam success",
      description: "Comprehensive tools designed specifically for Grade 12 national exam preparation",
      list: [
        {
          title: "Exam-Style Questions",
          description: "Practice with questions designed exactly like national exam format, ensuring you're fully prepared for the real test.",
          icon: FileText
        },
        {
          title: "Timed Mock Exams", 
          description: "Simulate real exam conditions with precise timing, helping you manage time effectively during actual exams.",
          icon: Timer
        },
        {
          title: "Performance Tracking",
          description: "Identify your strengths and weaknesses across subjects with detailed analytics and progress reports.",
          icon: BarChart3
        },
        {
          title: "Instant Results",
          description: "Get immediate feedback on your performance with detailed explanations for every question.",
          icon: Trophy
        },
        {
          title: "Secure Environment",
          description: "Practice in a secure, distraction-free environment that maintains exam integrity and fairness.",
          icon: ShieldCheck
        },
        {
          title: "Multi-Device Access",
          description: "Study anywhere, anytime on your phone, tablet, or computer with seamless synchronization.",
          icon: Smartphone
        }
      ]
    },
    cta: {
      title: "Ready to ace your Grade 12 exams?",
      description: "Join thousands of students who are already preparing with confidence using NejoExamPrep.",
      button: "Start Preparing Today"
    },
    footer: {
      description: "Empowering Grade 12 students with comprehensive national exam preparation tools. Built for Ethiopian students, by educators who understand the challenges.",
      quickLinks: "Quick Links",
      support: "Support",
      copyright: "Nejo Ifa Boru Special Boarding Secondary School. All rights reserved.",
      builtWith: "Built with ❤️ for Grade 12 success"
    }
  },
  or: {
    nav: {
      home: "Mana",
      about: "Waa'ee Keenya",
      features: "Amaloota",
      subjects: "Barnoota",
      contact: "Qunnamtii",
      login: "Seeni"
    },
    hero: {
      title: "Kutaa 12ffaa Qormaata",
      subtitle: "Biyyaalessaa Qophii",
      description: "Qormaata kutaa 12ffaa biyyaalessaa abdii guutuun qopheeffadhu. Gaaffilee akkaataa qormaataatiin shaakaluu, qormaata yeroo murtaa'e fudhachuu fi guddina kee hordofuu.",
      cta: "Qophii Jalqabi",
      studentAccess: "Barataa Seeni",
      launching: "Barattoota kutaa 12ffaa Itoophiyaa keessaa humneessuu"
    },
    intro: {
      badge: "Kutaa 12ffaa Xiyyeeffannoo",
      title: "Barattoota Kutaa 12ffaa Itoophiyaatiif Qophaa'e",
      description: "Waltajjiin keenya addatti qormaata kutaa 12ffaa biyyaalessaa qopheessuuf ijaarame, barnoota guddaa hunda gaaffilee akkaataa qormaataa dhugaatii fi meeshaalee shaakalaa bal'aa waliin."
    },
    subjects: {
      title: "Barnoota Kutaa 12ffaa Hunda Dandeetti",
      description: "Meeshaalee qophii bal'aa barnoota kutaa 12ffaa karikiyulaamu keessatti jiran hundaaf",
      list: [
        { name: "Herrega", icon: Calculator, color: "from-blue-500 to-blue-600" },
        { name: "Afaan Ingilizii", icon: BookOpen, color: "from-green-500 to-green-600" },
        { name: "Fiizikii", icon: Atom, color: "from-purple-500 to-purple-600" },
        { name: "Keemistrii", icon: FlaskConical, color: "from-red-500 to-red-600" },
        { name: "Baayoloojii", icon: Microscope, color: "from-emerald-500 to-emerald-600" },
        { name: "Seenaa", icon: BookOpen, color: "from-amber-500 to-amber-600" },
        { name: "Joogiraafii", icon: MapIcon, color: "from-cyan-500 to-cyan-600" },
        { name: "Dinagdee", icon: DollarSign, color: "from-indigo-500 to-indigo-600" }
      ]
    },
    features: {
      badge: "Amaloota Cimaa",
      title: "Milkaa'ina qormaataaf waan barbaachisu hunda",
      description: "Meeshaalee bal'aa addatti qormaata kutaa 12ffaa biyyaalessaa qopheessuuf qophaa'an",
      list: [
        {
          title: "Gaaffilee Akkaataa Qormaataa",
          description: "Gaaffilee sirriitti akka bifa qormaata biyyaalessaatti qophaa'an waliin shaakaluu, qormaata dhugaatiif guutummaatti akka qophaa'tu taasisa.",
          icon: FileText
        },
        {
          title: "Qormaata Fakkeenyaa Yeroo Murtaa'e",
          description: "Haala qormaata dhugaa yeroo sirrii waliin fakkeessuu, yeroo qormaata dhugaa keessatti gahumsaan akka bulchitu si gargaara.",
          icon: Timer
        },
        {
          title: "Raawwii Hordofuu",
          description: "Cimina fi hanqina kee barnoota keessatti xiinxala bal'aa fi gabaasa guddina waliin adda baasuu.",
          icon: BarChart3
        },
        {
          title: "Bu'aa Battalumatti",
          description: "Raawwii kee irratti yaada battalumatti gaaffii hundaaf ibsa bal'aa waliin argachuu.",
          icon: Trophy
        },
        {
          title: "Naannoo Nageenya",
          description: "Naannoo nageenya, yaada namatti hin dhufne keessatti shaakaluu kan amanamummaa fi haqummaa qormaataa eegu.",
          icon: ShieldCheck
        },
        {
          title: "Meeshaa Hedduu Seenuu",
          description: "Bilbila, taabletii ykn kompiitara kee irratti bakka kamiyyuu, yeroo kamiyyuu walsimsiisuun baruu.",
          icon: Smartphone
        }
      ]
    },
    cta: {
      title: "Qormaata kutaa 12ffaa kee milkaa'uuf qophii?",
      description: "Barattoota kumaatama NejoExamPrep fayyadamuun abdii guutuun qophaa'aa jiran waliin makamuu.",
      button: "Har'a Qophii Jalqabi"
    },
    footer: {
      description: "Barattoota kutaa 12ffaa meeshaalee qophii qormaata biyyaalessaa bal'aa waliin humneessuu. Barattoota Itoophiyaatiif, barsiisota rakkoolee hubatan irraan ijaarame.",
      quickLinks: "Hidhannoo Saffisaa",
      support: "Deeggarsa",
      copyright: "Mana Barumsaa Ol'aanaa Addaa Nejo Ifa Boru. Mirgi hundi eegame.",
      builtWith: "Milkaa'ina kutaa 12ffaaf ❤️ waliin ijaarame"
    }
  }
};

const LandingPage = () => {
const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'or'>('en');
  const [activeSubject, setActiveSubject] = useState(0);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const t = content[language];

  // Auto-rotate subjects
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSubject((prev) => (prev + 1) % t.subjects.list.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [t.subjects.list.length]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'or' : 'en');
  };

  const stats = [
    { value: "8+", label: language === 'en' ? "Subjects" : "Barnoota", icon: BookOpen },
    { value: "1000+", label: language === 'en' ? "Questions" : "Gaaffilee", icon: FileText },
    { value: "Real-time", label: language === 'en' ? "Results" : "Bu'aa", icon: TrendingUp },
    { value: "100%", label: language === 'en' ? "Free" : "Bilisaa", icon: CheckCircle2 },
  ];

  // Sample schools data
  const schools = [
    {
      name: "Nejo Ifa Boru Secondary",
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&h=150&fit=crop&crop=center",
      location: language === 'en' ? "Main Campus" : "Kampasii Guddaa"
    },
    {
      name: "St. Mary's Academy", 
      image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&h=150&fit=crop&crop=center",
      location: language === 'en' ? "Partner School" : "Mana Barumsaa Michuu"
    },
    {
      name: "Green Valley School",
      image: "https://images.unsplash.com/photo-1562774053-701939374585?w=150&h=150&fit=crop&crop=center", 
      location: language === 'en' ? "Affiliate" : "Hirmaataa"
    },
    {
      name: "Future Leaders High",
      image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&h=150&fit=crop&crop=center",
      location: language === 'en' ? "Partner" : "Michuu"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 relative overflow-hidden">
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
          className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-green-400/20 rounded-full blur-xl"
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
          className="absolute top-40 left-10 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg rotate-45 blur-lg"
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
          className="absolute bottom-40 right-40 w-20 h-20 bg-gradient-to-br from-green-400/20 to-yellow-400/20 rounded-full blur-lg"
        />
        
        {/* Floating Academic Icons */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.2, 0.8, 0.2],
              y: [0, -20, 0],
              rotate: [0, 10, 0]
            }}
            transition={{ 
              duration: 4 + i * 0.5, 
              repeat: Infinity, 
              delay: i * 0.5 
            }}
            className="absolute"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
            }}
          >
            {i % 4 === 0 && <GraduationCap className="w-6 h-6 text-yellow-300/40" />}
            {i % 4 === 1 && <BookOpen className="w-5 h-5 text-blue-300/40" />}
            {i % 4 === 2 && <Trophy className="w-5 h-5 text-green-300/40" />}
            {i % 4 === 3 && <Award className="w-5 h-5 text-purple-300/40" />}
          </motion.div>
        ))}

        {/* Stars */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.3, 1]
            }}
            transition={{ 
              duration: 3 + i * 0.3, 
              repeat: Infinity, 
              delay: i * 0.2 
            }}
            className="absolute"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
            }}
          >
            <Star className="w-3 h-3 text-yellow-300/50 fill-current" />
          </motion.div>
        ))}
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
                <div className="text-xs text-white/70 -mt-1">
                  {language === 'en' ? 'Grade 12 Exam Prep' : 'Qophii Qormaata Kutaa 12ffaa'}
                </div>
              </div>
            </Link>

            {/* Language Toggle */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium"
              >
                <Languages className="h-4 w-4" />
                <span>{language === 'en' ? 'EN' : 'OR'}</span>
                <span className="text-white/60">|</span>
                <span className="text-white/60">{language === 'en' ? 'OR' : 'EN'}</span>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                {t.nav.home}
              </a>
              <a href="#about" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                {t.nav.about}
              </a>
              <a href="#features" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                {t.nav.features}
              </a>
              <a href="#subjects" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                {t.nav.subjects}
              </a>
              <a href="#contact" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                {t.nav.contact}
              </a>
              <Button asChild className="bg-white text-indigo-700 hover:bg-white/90 rounded-full px-6 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <Link to="/login">{t.nav.login}</Link>
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
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium w-full"
              >
                <Languages className="h-4 w-4" />
                <span>{language === 'en' ? 'Switch to Afaan Oromo' : 'Switch to English'}</span>
              </button>
              <a href="#home" className="block text-white/80 hover:text-white transition-colors py-2">{t.nav.home}</a>
              <a href="#about" className="block text-white/80 hover:text-white transition-colors py-2">{t.nav.about}</a>
              <a href="#features" className="block text-white/80 hover:text-white transition-colors py-2">{t.nav.features}</a>
              <a href="#subjects" className="block text-white/80 hover:text-white transition-colors py-2">{t.nav.subjects}</a>
              <a href="#contact" className="block text-white/80 hover:text-white transition-colors py-2">{t.nav.contact}</a>
              <Button asChild className="w-full bg-white text-indigo-700 hover:bg-white/90 rounded-full font-semibold mt-4">
                <Link to="/login">{t.nav.login}</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-20 pb-16 overflow-hidden">
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
                  {t.hero.title}
                </span>
                <span className="relative inline-block">
                  <span className="relative mx-4">
                    <span className="bg-gradient-to-r from-yellow-400 to-green-400 text-indigo-900 px-6 py-3 rounded-2xl font-black text-3xl sm:text-4xl lg:text-6xl">
                      {t.hero.subtitle}
                    </span>
                  </span>
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg sm:text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed"
              >
                {t.hero.description}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
              >
                <Button
                  size="lg"
                  asChild
                  className="bg-gradient-to-r from-green-400 to-yellow-400 text-indigo-900 hover:from-green-500 hover:to-yellow-500 rounded-full px-8 py-4 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-0"
                >
                  <Link to="/login" className="flex items-center gap-3">
                    <GraduationCap className="h-6 w-6" />
                    {t.hero.cta}
                    <ArrowRight className="h-6 w-6" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm rounded-full px-8 py-4 text-lg font-semibold"
                >
                  <Link to="/student" className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    {t.hero.studentAccess}
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
                  {t.hero.launching}
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
                        <span className="text-xs font-semibold text-indigo-900 whitespace-nowrap">
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
                  <span>{language === 'en' ? 'Free to use' : 'Bilisaan itti fayyadamuu'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  <span>{language === 'en' ? 'Secure & reliable' : 'Nageenya fi amanamaa'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-yellow-400" />
                  <span>{language === 'en' ? 'Real-time results' : 'Bu\'aa yeroo qabatamaa'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>{language === 'en' ? 'All Grade 12 subjects' : 'Barnoota kutaa 12ffaa hunda'}</span>
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
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mb-3">
                  <stat.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-900">{stat.value}</div>
                <div className="text-slate-600 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-slate-50 to-indigo-50/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-4"
            >
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">{t.intro.badge}</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t.intro.title}
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              {t.intro.description}
            </p>
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="subjects" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-100 mb-4"
            >
              <BookOpen className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">{t.nav.subjects}</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t.subjects.title}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t.subjects.description}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {t.subjects.list.map((subject, index) => (
              <motion.div
                key={subject.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group relative p-6 rounded-2xl bg-gradient-to-br ${subject.color} text-white hover:scale-105 transition-all duration-300 cursor-pointer ${
                  index === activeSubject ? 'ring-4 ring-white shadow-2xl scale-105' : 'shadow-lg'
                }`}
              >
                <div className="text-center">
                  <subject.icon className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-lg">{subject.name}</h3>
                </div>
                <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
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
              <span className="text-sm font-semibold text-purple-700">{t.features.badge}</span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t.features.title}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t.features.description}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.features.list.map((feature, index) => (
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
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                      <feature.icon className="h-7 w-7 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                    <div className="mt-6 flex items-center text-purple-600 font-medium group-hover:text-blue-600 transition-colors">
                      <span className="text-sm">{language === 'en' ? 'Learn more' : 'Dabalata baruu'}</span>
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">
                  {language === 'en' ? 'Cross-Platform' : 'Waltajjii-Hedduu'}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                {language === 'en' ? 'Works on' : 'Meeshaa'}
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {language === 'en' ? ' every device' : ' hunda irratti hojjeta'}
                </span>
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                {language === 'en' 
                  ? 'Whether your students use phones, tablets, or computers, NejoExamPrep delivers a consistent, optimized experience across all devices and screen sizes.'
                  : 'Barattoonni kee bilbila, taabletii ykn kompiitara fayyadaman, NejoExamPrep muuxannoo walqixa, fooyya\'aa meeshaa fi hammamtaa iskiriinii hunda irratti kenna.'
                }
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Smartphone, label: language === 'en' ? "Mobile" : "Bilbila" },
                  { icon: Tablet, label: language === 'en' ? "Tablet" : "Taabletii" },
                  { icon: Monitor, label: language === 'en' ? "Desktop" : "Kompiitara" }
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

      {/* CTA Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 relative overflow-hidden">
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
              {t.cta.title}
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              {t.cta.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-green-400 to-yellow-400 text-indigo-900 hover:from-green-500 hover:to-yellow-500 rounded-full px-8 py-4 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-0"
              >
                <Link to="/login" className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6" />
                  {t.cta.button}
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
                  {t.hero.studentAccess}
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
                  <div className="text-sm text-slate-400">
                    {language === 'en' ? 'Grade 12 Exam Prep' : 'Qophii Qormaata Kutaa 12ffaa'}
                  </div>
                </div>
              </div>
              <p className="text-slate-400 mb-4 max-w-md">
                {t.footer.description}
              </p>
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} {t.footer.copyright}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">{t.footer.quickLinks}</h4>
              <div className="space-y-2 text-sm">
                <Link to="/login" className="block text-slate-400 hover:text-white transition-colors">
                  {language === 'en' ? 'Teacher Login' : 'Barsiisaa Seeni'}
                </Link>
                <Link to="/student" className="block text-slate-400 hover:text-white transition-colors">
                  {language === 'en' ? 'Student Portal' : 'Barataa Seeni'}
                </Link>
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">
                  {t.nav.features}
                </a>
                <a href="#subjects" className="block text-slate-400 hover:text-white transition-colors">
                  {t.nav.subjects}
                </a>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">{t.footer.support}</h4>
              <div className="space-y-2 text-sm">
                <div className="text-slate-400">{language === 'en' ? 'Help Center' : 'Gargaarsa'}</div>
                <div className="text-slate-400">{language === 'en' ? 'Documentation' : 'Galmee'}</div>
                <div className="text-slate-400">{language === 'en' ? 'Contact Support' : 'Gargaarsa Qunnamuu'}</div>
                <div className="text-slate-400">{language === 'en' ? 'System Status' : 'Haala Sirna'}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>{t.footer.builtWith}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;ame="py-20 bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 relative overflow-hidden">
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