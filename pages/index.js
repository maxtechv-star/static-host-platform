import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiUpload,
  FiGitPullRequest,
  FiGlobe,
  FiBarChart2,
  FiShield,
  FiZap,
  FiCheck,
  FiUsers,
  FiCode,
  FiFolder,
  FiMail,
  FiArrowRight,
  FiStar,
  FiGithub,
  FiExternalLink,
  FiCloud,
  FiLock,
  FiActivity,
  FiServer,
  FiEye,
  FiHeart
} from 'react-icons/fi';

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState({
    sitesHosted: 1247,
    activeUsers: 856,
    totalBandwidth: '2.1TB',
    uptime: 99.9
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    // Fetch platform stats
    fetchPlatformStats();

    // Feature carousel
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchPlatformStats = async () => {
    try {
      const response = await fetch('/api/stats/platform');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      // Use default stats on error
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <FiUpload className="w-8 h-8" />,
      title: 'Zero Build Steps',
      description: 'Upload static files directly. No npm install, no webpack, no waiting.',
      details: ['HTML/CSS/JS only', 'No server-side execution', 'Instant deployment'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <FiGitPullRequest className="w-8 h-8" />,
      title: 'Git Integration',
      description: 'Connect GitHub, GitLab, or Bitbucket. Auto-deploy on push.',
      details: ['Public/private repos', 'Branch selection', 'Auto-sync'],
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <FiGlobe className="w-8 h-8" />,
      title: 'Global CDN',
      description: 'Files served worldwide with automatic SSL/TLS encryption.',
      details: ['Edge caching', 'Auto HTTPS', 'DDoS protection'],
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <FiBarChart2 className="w-8 h-8" />,
      title: 'Built-in Analytics',
      description: 'Privacy-focused analytics with no cookies required.',
      details: ['Visitor tracking', 'Bandwidth monitoring', 'Real-time stats'],
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: <FiShield className="w-8 h-8" />,
      title: 'Security First',
      description: 'Automatic malware scanning and secure file validation.',
      details: ['File scanning', 'No executable uploads', 'Rate limiting'],
      color: 'from-indigo-500 to-blue-500'
    },
    {
      icon: <FiZap className="w-8 h-8" />,
      title: 'Blazing Fast',
      description: 'Optimized for performance with minimal overhead.',
      details: ['Edge delivery', 'Asset optimization', 'Fast DNS'],
      color: 'from-yellow-500 to-amber-500'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Sign Up Free',
      description: 'Create account with Google or email. No credit card required.',
      icon: <FiUsers className="w-6 h-6" />
    },
    {
      number: '02',
      title: 'Upload Site',
      description: 'ZIP upload, Git clone, or drag-and-drop files.',
      icon: <FiUpload className="w-6 h-6" />
    },
    {
      number: '03',
      title: 'Go Live Instantly',
      description: 'Get your unique URL. Site goes live in seconds.',
      icon: <FiZap className="w-6 h-6" />
    }
  ];

  // REMOVED PRICING PLANS - IT'S ALL FREE
  const freePlanFeatures = [
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: '10 active sites per user'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: '100 MB storage per site'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Unlimited bandwidth'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Built-in analytics'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Custom subdomains'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Git integration'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Automatic SSL/TLS'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Global CDN'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'File validation & security'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Email notifications'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'Admin dashboard (VeronDev)'
    },
    {
      icon: <FiCheck className="w-5 h-5" />,
      text: 'No hidden fees - truly free'
    }
  ];

  const testimonials = [
    {
      name: 'Alex Chen',
      role: 'Frontend Developer',
      content: 'Perfect for hosting my portfolio. Uploaded my files and had a live site in 30 seconds.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    },
    {
      name: 'Sarah Johnson',
      role: 'Technical Writer',
      content: 'I use StaticHost for all my documentation sites. The Git integration saves me hours.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    },
    {
      name: 'Marcus Lee',
      role: 'Open Source Maintainer',
      content: 'Hosting project demos has never been easier. Completely free and reliable.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus'
    }
  ];

  const supportedTech = [
    { name: 'HTML5', icon: '🔶' },
    { name: 'CSS3', icon: '🎨' },
    { name: 'JavaScript', icon: '⚡' },
    { name: 'React', icon: '⚛️' },
    { name: 'Vue.js', icon: '🟢' },
    { name: 'Static Site Generators', icon: '🏗️' },
    { name: 'Markdown', icon: '📝' },
    { name: 'API Docs', icon: '📚' }
  ];

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/auth/register');
    }
  };

  return (
    <>
      <Head>
        <title>StaticHost - 100% Free Static Site Hosting by VeronDev</title>
        <meta name="description" content="Completely free static site hosting with no build steps required. Upload ZIP files, connect Git repositories, or drag-and-drop files. Get your site live in seconds. No credit card required." />
        <meta name="keywords" content="free static hosting, free hosting, static site, vercel alternative, github pages free, netlify free, html hosting free" />
        
        {/* Open Graph */}
        <meta property="og:title" content="StaticHost - 100% Free Static Site Hosting" />
        <meta property="og:description" content="Completely free static site hosting with no build steps. Upload and go live in seconds." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://statichost.dev" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="StaticHost - Free Static Site Hosting" />
        <meta name="twitter:description" content="Completely free static hosting by VeronDev. No credit card required." />
      </Head>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium mb-6">
              <FiHeart className="w-4 h-4 mr-2" />
              100% Free Forever • No Credit Card Required
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              Static Hosting,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-cyan-600">
                Zero Complexity
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
              Upload your static files. Get a live site in seconds. <span className="font-semibold text-primary-600 dark:text-primary-400">Completely free</span> with no build steps or hidden fees.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-primary-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-cyan-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
                <FiArrowRight className="inline-block ml-2 w-5 h-5" />
              </button>
              
              <a
                href="https://github.com/VeronDev/static-host-platform"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 text-lg flex items-center justify-center gap-2"
              >
                <FiGithub className="w-5 h-5" />
                Star on GitHub
              </a>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {loading ? '...' : stats.sitesHosted.toLocaleString()}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Sites Hosted</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {loading ? '...' : stats.activeUsers.toLocaleString()}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {loading ? '...' : stats.totalBandwidth}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Bandwidth Served</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {stats.uptime}%
                </div>
                <div className="text-gray-600 dark:text-gray-400">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How StaticHost Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Three simple steps from upload to live site
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/30 dark:to-cyan-900/30 text-primary-600 dark:text-primary-400 text-2xl font-bold mb-6">
                    {step.number}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 -right-4 w-8 h-0.5 bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose StaticHost?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Built specifically for static sites with no compromises
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
                  index === currentFeature ? 'ring-2 ring-primary-500' : ''
                }`}
                onMouseEnter={() => setCurrentFeature(index)}
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.details.map((detail, i) => (
                    <li key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                      <FiCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Free Plan - All Features Included */}
      <div className="py-24 bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-primary-500 to-cyan-500 text-white text-lg font-semibold mb-6">
              <FiStar className="w-5 h-5 mr-2" />
              Everything Free, No Limits
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              One Plan: 100% Free
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              No tiers, no upsells, no hidden costs. All features included for everyone.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="p-12">
              <div className="text-center mb-10">
                <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  $0<span className="text-2xl text-gray-600 dark:text-gray-400">/month</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Free forever, no credit card required</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {freePlanFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-4">
                      {feature.icon}
                    </div>
                    <span className="text-gray-900 dark:text-white">{feature.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-12">
                <button
                  onClick={handleGetStarted}
                  className="px-12 py-4 bg-gradient-to-r from-primary-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-cyan-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
                >
                  Start Hosting Free Today
                  <FiArrowRight className="inline-block ml-2 w-5 h-5" />
                </button>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                  No credit card • No trial period • No hidden fees
                </p>
              </div>
            </div>
            
            {/* Platform by VeronDev */}
            <div className="bg-gradient-to-r from-primary-600 to-cyan-600 p-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <FiHeart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Platform by VeronDev</p>
                  <p className="text-primary-100 text-sm">Open source project maintained by the community</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Loved by Developers
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              See what developers are saying about StaticHost
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="ml-4">
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supported Technologies */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Perfect For
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Any static content that doesn't require server-side processing
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {supportedTech.map((tech, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="text-3xl mb-3">{tech.icon}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {tech.name}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 px-8 py-6 bg-gradient-to-r from-primary-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl">
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Ready to launch your site?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Join thousands of developers hosting their sites for free
                </p>
              </div>
              <button
                onClick={handleGetStarted}
                className="px-8 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-cyan-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                Get Started Free
                <FiArrowRight className="inline-block ml-2 w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-primary-600 to-cyan-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Start hosting your static site today
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-3xl mx-auto">
            Completely free, no credit card required. Upload your files and go live in seconds.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-12 py-4 bg-white text-primary-600 font-bold rounded-xl hover:bg-gray-100 transform hover:-translate-y-1 transition-all duration-200 shadow-2xl text-lg"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
            <FiArrowRight className="inline-block ml-2 w-5 h-5" />
          </button>
          
          <div className="mt-12 pt-8 border-t border-primary-400/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <FiHeart className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">Open Source & Free</p>
                  <p className="text-primary-200 text-sm">Maintained by VeronDev and the community</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <a
                  href="https://github.com/VeronDev/static-host-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <FiGithub className="w-6 h-6" />
                </a>
                <Link href="/dashboard" className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <FiServer className="w-6 h-6" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}