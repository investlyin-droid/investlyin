'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import TradingCalculator from '@/components/TradingCalculator';
import ProfitCalculator from '@/components/ProfitCalculator';

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Handle smooth scrolling for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]') as HTMLAnchorElement;
      if (link && link.href) {
        try {
          const url = new URL(link.href);
          if (url.hash) {
            e.preventDefault();
            const id = url.hash.substring(1);
            const element = document.getElementById(id);
            if (element) {
              const headerOffset = 80; // Height of sticky header
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
            }
          }
        } catch (err) {
          // If URL parsing fails, try direct hash
          const href = link.getAttribute('href');
          if (href && href.startsWith('#')) {
            e.preventDefault();
            const id = href.substring(1);
            const element = document.getElementById(id);
            if (element) {
              const headerOffset = 80;
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
            }
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => document.removeEventListener('click', handleAnchorClick, true);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
        <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-obsidian text-white overflow-x-hidden">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-20 md:pt-32 md:pb-32 lg:pt-32 lg:pb-64 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-gold/10 rounded-full blur-[160px] animate-hero-glow"></div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-brand-blue/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

        <div className="content-container relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-brand-gold/20 via-brand-gold/10 to-brand-gold/20 border border-brand-gold/30 mb-6 sm:mb-8 animate-fade-in backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse shadow-lg shadow-brand-gold/50"></span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-brand-gold">New: Ultra-low latency • 30ms</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-none mb-6 sm:mb-8 animate-fade-in px-4 sm:px-0" style={{ animationDelay: '0.1s' }}>
            <span className="block mb-1 sm:mb-2">TRADE THE GLOBAL</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-white via-brand-gold to-brand-gold bg-[length:200%_auto] animate-gradient">
              MARKETS BY PROS.
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-3xl mx-auto text-brand-text-secondary text-base sm:text-lg md:text-xl lg:text-2xl font-medium mb-4 sm:mb-6 leading-relaxed animate-fade-in px-4 sm:px-0" style={{ animationDelay: '0.2s' }}>
            Experience institutional-grade execution, razor-sharp spreads starting from 0.0 pips, and elite-level liquidity. Built for traders who demand precision, speed, and reliability.
          </p>

          {/* Additional Details */}
          <p className="max-w-2xl mx-auto text-brand-text-secondary/80 text-xs sm:text-sm md:text-base mb-8 sm:mb-10 animate-fade-in px-4 sm:px-0" style={{ animationDelay: '0.25s' }}>
            Join over 1,000,000+ active traders worldwide. Trade 100+ instruments across Forex, Crypto, Stocks, Indices, and Commodities with leverage up to 1:1000.
          </p>

          {/* Premium Trustpilot Rating */}
          <div className="flex flex-col items-center justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.28s' }}>
            <div className="flex items-center space-x-1.5 mb-4 group cursor-default">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[#00b67a] p-1.5 rounded-sm shadow-[0_0_15px_rgba(0,182,122,0.3)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                </div>
              ))}
            </div>
            <a
              href="https://www.trustpilot.com/review/www.investlyin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center space-x-3 px-8 py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 rounded-full transition-all duration-300 backdrop-blur-xl hover:border-brand-gold/30 hover:shadow-[0_0_30px_rgba(255,184,0,0.1)]"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-[#00b67a] animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
                </svg>
                <span className="text-sm font-black uppercase tracking-widest text-white/90">Trustpilot</span>
              </div>
              <div className="h-4 w-[1px] bg-white/20"></div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black text-brand-gold leading-none mb-0.5">EXCELLENT</span>
                <span className="text-[9px] font-bold text-brand-text-secondary/70 group-hover:text-white transition-colors">4.8/5 Verified Rating</span>
              </div>

              {/* Subtle light streak animation */}
              <div className="absolute inset-0 overflow-hidden rounded-full font-black">
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
              </div>
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-6 mb-10 sm:mb-12 md:mb-16 animate-fade-in px-4 sm:px-0" style={{ animationDelay: '0.3s' }}>
            <Link href="/register" className="group relative w-full sm:w-auto sm:min-w-[200px] md:w-64 py-4 sm:py-5 bg-gradient-to-r from-brand-gold to-yellow-500 text-brand-obsidian font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm rounded-xl hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transition-all overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-brand-gold opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span className="relative flex items-center justify-center">
                Start Trading
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <Link href="/login" className="w-full sm:w-auto sm:min-w-[200px] md:w-64 py-4 sm:py-5 bg-transparent border-2 border-white/20 text-white font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm rounded-xl hover:bg-white/10 hover:border-brand-gold/50 transition-all backdrop-blur-sm">
              View Demo Account
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-12 md:mb-16 animate-fade-in px-4 sm:px-0" style={{ animationDelay: '0.35s' }}>
            <div className="flex items-center space-x-2 text-brand-text-secondary/60 text-xs font-semibold">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Regulated & Secure</span>
            </div>
            <div className="flex items-center space-x-2 text-brand-text-secondary/60 text-xs font-semibold">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center space-x-2 text-brand-text-secondary/60 text-xs font-semibold">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Segregated Accounts</span>
            </div>
            <div className="flex items-center space-x-2 text-brand-text-secondary/60 text-xs font-semibold">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Lightning Fast Execution</span>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto animate-fade-in px-4 sm:px-0" style={{ animationDelay: '0.4s' }}>
            <div className="glass-card p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-white/5 hover:border-brand-gold/30 transition-all group">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-brand-gold mb-1 sm:mb-2 group-hover:scale-110 transition-transform">0.0</div>
              <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Pips Spread</div>
              <div className="text-[9px] sm:text-[10px] text-brand-text-secondary/70 leading-tight">Starting from 0.0 pips on major pairs</div>
            </div>
            <div className="glass-card p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-white/5 hover:border-brand-gold/30 transition-all group">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-brand-gold mb-1 sm:mb-2 group-hover:scale-110 transition-transform">1:1000</div>
              <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Max Leverage</div>
              <div className="text-[9px] sm:text-[10px] text-brand-text-secondary/70 leading-tight">Maximum leverage for qualified traders</div>
            </div>
            <div className="glass-card p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-white/5 hover:border-brand-gold/30 transition-all group">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-brand-gold mb-1 sm:mb-2 group-hover:scale-110 transition-transform">30ms</div>
              <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Avg Execution</div>
              <div className="text-[9px] sm:text-[10px] text-brand-text-secondary/70 leading-tight">Ultra-low latency order execution</div>
            </div>
            <div className="glass-card p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-white/5 hover:border-brand-gold/30 transition-all group">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-brand-gold mb-1 sm:mb-2 group-hover:scale-110 transition-transform">100+</div>
              <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Instruments</div>
              <div className="text-[9px] sm:text-[10px] text-brand-text-secondary/70 leading-tight">Forex, Crypto, Stocks, Indices & more</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-16 sm:py-20 md:py-24 lg:py-32 bg-[#0C0E12] scroll-mt-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px]"></div>

        <div className="content-container relative z-10">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">The Platform</span>
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Institutional Technology, For Everyone.</h3>
            <p className="max-w-2xl mx-auto text-brand-text-secondary text-base sm:text-lg font-medium px-4 sm:px-0">
              Built with cutting-edge technology and designed for both professional traders and beginners. Experience the power of institutional-grade trading tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              title="Elite Terminal"
              desc="A multi-asset platform designed for professional technical analysis and rapid execution. Access advanced charting tools, 100+ technical indicators, and real-time market data across all asset classes."
              icon={<svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V5l12 7-12 7z" /></svg>}
              features={["Advanced Charting", "100+ Indicators", "Multi-Asset Trading"]}
            />
            <FeatureCard
              title="Secure Wallets"
              desc="Full control over your capital with encrypted withdrawals and multi-factor authorization. Your funds are stored in segregated accounts with bank-level security and instant access when you need it."
              icon={<svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
              features={["Segregated Accounts", "2FA Protection", "Instant Withdrawals"]}
            />
            <FeatureCard
              title="Real-time Engine"
              desc="Proprietary order matching engine ensuring your trades hit the best market prices instantly. Our advanced technology processes millions of orders per second with 99.99% uptime."
              icon={<svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              features={["30ms Execution", "99.99% Uptime", "Best Price Guarantee"]}
            />
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section id="markets" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Trading Markets</span>
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Access Global Markets, 24/7</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg md:text-xl mt-4 sm:mt-6 max-w-3xl mx-auto font-medium leading-relaxed px-4 sm:px-0">
              Trade across multiple asset classes with institutional-grade liquidity and competitive spreads. From major currency pairs to cryptocurrencies, stocks, and commodities - access 100+ instruments with tight spreads from 0.0 pips and fast execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <MarketCard id="forex" title="Forex" icon="currency" description="Major, minor, and exotic currency pairs with tight spreads from 0.0 pips" />
            <MarketCard id="metals" title="Metals" icon="gold" description="Trade gold, silver, and other precious metals with competitive pricing" />
            <MarketCard id="crypto" title="Cryptocurrencies" icon="crypto" description="Major crypto pairs including BTC, ETH, and more with 24/7 trading" />
            <MarketCard id="energies" title="Energies" icon="energy" description="Crude oil, natural gas, and other energy commodities" />
            <MarketCard id="stocks" title="Stocks" icon="stocks" description="Trade shares of major global companies with leverage" />
            <MarketCard id="indices" title="Indices" icon="indices" description="Global stock indices including S&P 500, NASDAQ, FTSE 100" />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative py-16 sm:py-20 md:py-24 lg:py-32 bg-[#0C0E12] scroll-mt-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[120px]"></div>

        <div className="content-container relative z-10">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Security First</span>
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Your Funds, Protected</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg md:text-xl mt-4 sm:mt-6 max-w-3xl mx-auto font-medium leading-relaxed px-4 sm:px-0">
              Enterprise-grade security measures to ensure your capital and data remain safe at all times. We employ bank-level encryption, multi-layer authentication, and regulatory compliance to protect your assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="glass-card p-10 rounded-3xl border border-white/5">
              <div className="w-16 h-16 bg-brand-gold/5 rounded-2xl flex items-center justify-center mb-8 border border-brand-gold/10">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-xl font-black mb-4 uppercase tracking-tight">Encrypted Storage</h4>
              <p className="text-brand-text-secondary text-sm leading-relaxed font-medium">
                All sensitive data is encrypted using AES-256 encryption. Your personal information and trading data are protected with bank-level security.
              </p>
            </div>

            <div className="glass-card p-10 rounded-3xl border border-white/5">
              <div className="w-16 h-16 bg-brand-gold/5 rounded-2xl flex items-center justify-center mb-8 border border-brand-gold/10">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-xl font-black mb-4 uppercase tracking-tight">Two-Factor Authentication</h4>
              <p className="text-brand-text-secondary text-sm leading-relaxed font-medium">
                Mandatory 2FA for all account activities. Add an extra layer of security with TOTP-based authentication for withdrawals and sensitive operations.
              </p>
            </div>

            <div className="glass-card p-10 rounded-3xl border border-white/5">
              <div className="w-16 h-16 bg-brand-gold/5 rounded-2xl flex items-center justify-center mb-8 border border-brand-gold/10">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-black mb-4 uppercase tracking-tight">Segregated Accounts</h4>
              <p className="text-brand-text-secondary text-sm leading-relaxed font-medium">
                Client funds are held in segregated accounts, completely separate from company operations. Your capital is protected and always accessible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">About Investlyin</h2>
            <h3 className="text-4xl font-black tracking-tight">Built by Traders, For Traders</h3>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-12 rounded-3xl border border-white/5 mb-8">
              <p className="text-brand-text-secondary text-lg leading-relaxed font-medium mb-6">
                Investlyin is a leading global trading platform designed to bridge the gap between retail traders and institutional-grade execution.
                We combine cutting-edge technology with deep market liquidity to deliver an unparalleled trading experience.
              </p>
              <p className="text-brand-text-secondary text-lg leading-relaxed font-medium mb-6">
                Our mission is to democratize access to professional trading tools and market access. Whether you're a seasoned professional
                or just starting your trading journey, Investlyin provides the infrastructure, security, and support you need to succeed.
              </p>
              <p className="text-brand-text-secondary text-lg leading-relaxed font-medium">
                With over 1,000,000 active traders worldwide, we've built a platform that scales from individual retail accounts to
                institutional partnerships, all while maintaining the highest standards of security and regulatory compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
                <div className="text-4xl font-black text-brand-gold mb-2">1M+</div>
                <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Active Traders</div>
              </div>
              <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
                <div className="text-4xl font-black text-brand-gold mb-2">100+</div>
                <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Countries</div>
              </div>
              <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
                <div className="text-4xl font-black text-brand-gold mb-2">24/7</div>
                <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Account Types Section */}
      <section id="account-types" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Account Types</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Choose Your Trading Account</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg mt-4 sm:mt-6 max-w-2xl mx-auto font-medium px-4 sm:px-0">
              Select the account type that best suits your trading style and experience level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="glass-card p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-brand-gold/20 hover:transform hover:scale-105 transition-all duration-300">
              <div className="mb-4 sm:mb-6">
                <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-widest">Standard</span>
                <h4 className="text-xl sm:text-2xl font-black mt-2">Standard Account</h4>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Minimum deposit: $100</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Leverage up to 1:1000</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Tight spreads from 0.0 pips</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">All trading instruments</span>
                </li>
              </ul>
              <Link href="/register" className="block w-full py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 text-white text-center font-bold text-sm rounded-lg transition-colors border border-white/10 hover:border-brand-gold/30">
                Open Account
              </Link>
            </div>

            <div className="glass-card p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border-2 border-brand-gold/30 relative hover:border-brand-gold/50 hover:transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2 py-0.5 sm:px-3 sm:py-1 bg-brand-gold text-brand-obsidian text-[10px] sm:text-xs font-black rounded-full animate-pulse">POPULAR</div>
              <div className="mb-4 sm:mb-6">
                <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-widest">Pro</span>
                <h4 className="text-xl sm:text-2xl font-black mt-2">Pro Account</h4>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Minimum deposit: $1,000</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Leverage up to 1:1000</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Raw spreads from 0.0 pips</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Commission: $3.5 per lot</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Priority support</span>
                </li>
              </ul>
              <Link href="/register" className="block w-full py-2.5 sm:py-3 bg-brand-gold text-brand-obsidian text-center font-black text-sm rounded-lg hover:shadow-gold transition-all">
                Open Account
              </Link>
            </div>

            <div className="glass-card p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-brand-gold/20 hover:transform hover:scale-105 transition-all duration-300">
              <div className="mb-4 sm:mb-6">
                <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-widest">Zero</span>
                <h4 className="text-xl sm:text-2xl font-black mt-2">Zero Account</h4>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Minimum deposit: $5,000</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Leverage up to 1:1000</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Zero spreads on major pairs</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Commission: $0 per lot</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">$1,000 welcome bonus</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">Low fees</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary">VIP support</span>
                </li>
              </ul>
              <Link href="/register" className="block w-full py-3 bg-white/5 hover:bg-white/10 text-white text-center font-bold rounded-lg transition-colors border border-white/10 hover:border-brand-gold/30">
                Open Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trading Platforms Section */}
      <section id="platforms" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Trading Platforms</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Trade on Any Device, Anywhere</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg mt-4 sm:mt-6 max-w-2xl mx-auto font-medium px-4 sm:px-0">
              Access professional trading tools across desktop, web, and mobile platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-xl flex items-center justify-center mb-6 mx-auto border border-brand-gold/20">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-black mb-3">Web Platform</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Trade directly from your browser</p>
              <Link href="/dashboard" className="text-brand-gold text-sm font-bold hover:underline">Start Trading →</Link>
            </div>

            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-xl flex items-center justify-center mb-6 mx-auto border border-brand-gold/20">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-black mb-3">Mobile App</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Trade on iOS and Android</p>
              <Link href="/dashboard" className="text-brand-gold text-sm font-bold hover:underline">Download →</Link>
            </div>

            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-xl flex items-center justify-center mb-6 mx-auto border border-brand-gold/20">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h4 className="text-lg font-black mb-3">API Trading</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Connect via REST and WebSocket APIs</p>
              <Link href="/profile" className="text-brand-gold text-sm font-bold hover:underline">Get API Key →</Link>
            </div>

            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-xl flex items-center justify-center mb-6 mx-auto border border-brand-gold/20">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-black mb-3">MetaTrader</h4>
              <p className="text-brand-text-secondary text-sm mb-4">MT4 and MT5 support</p>
              <Link href="/register" className="text-brand-gold text-sm font-bold hover:underline">Learn More →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trading Conditions Section */}
      <section id="conditions" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Trading Conditions</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight px-4 sm:px-0">Competitive Trading Conditions</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="text-4xl font-black text-brand-gold mb-2">0.0</div>
              <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest mb-2">Pips Spread</div>
              <p className="text-xs text-brand-text-secondary">Starting from 0.0 pips on major pairs</p>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="text-4xl font-black text-brand-gold mb-2">1:1000</div>
              <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest mb-2">Max Leverage</div>
              <p className="text-xs text-brand-text-secondary">Maximum leverage available</p>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="text-4xl font-black text-brand-gold mb-2">30ms</div>
              <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest mb-2">Execution Speed</div>
              <p className="text-xs text-brand-text-secondary">Average order execution time</p>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <div className="text-4xl font-black text-brand-gold mb-2">24/7</div>
              <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest mb-2">Trading Hours</div>
              <p className="text-xs text-brand-text-secondary">Trade around the clock</p>
            </div>
          </div>
        </div>
      </section>

      {/* Leverage Section */}
      <section id="leverage" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Leverage</h2>
            <h3 className="text-4xl font-black tracking-tight">Flexible Leverage Up to 1:1000</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Trade with leverage that adapts to your experience and trading style. Maximum leverage available for qualified traders.
            </p>
          </div>

          <div className="max-w-4xl mx-auto glass-card p-12 rounded-3xl border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-5xl font-black text-brand-gold mb-3">1:1000</div>
                <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest mb-2">Maximum Leverage</div>
                <p className="text-xs text-brand-text-secondary">For experienced traders</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-brand-gold mb-3">1:500</div>
                <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest mb-2">Standard Leverage</div>
                <p className="text-xs text-brand-text-secondary">For most traders</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-brand-gold mb-3">1:100</div>
                <div className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest mb-2">Conservative</div>
                <p className="text-xs text-brand-text-secondary">For beginners</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spreads Section */}
      <section id="spreads" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Spreads</h2>
            <h3 className="text-4xl font-black tracking-tight">Tight Spreads Starting from 0.0 Pips</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Benefit from some of the tightest spreads in the industry, with spreads starting from 0.0 pips on major currency pairs.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="glass-card p-8 rounded-2xl border border-white/5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-brand-text-secondary font-bold uppercase tracking-widest text-xs">Instrument</th>
                    <th className="text-right py-4 px-4 text-brand-text-secondary font-bold uppercase tracking-widest text-xs">Min Spread</th>
                    <th className="text-right py-4 px-4 text-brand-text-secondary font-bold uppercase tracking-widest text-xs">Avg Spread</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4 font-bold">EUR/USD</td>
                    <td className="py-4 px-4 text-right text-brand-gold font-black">0.0 pips</td>
                    <td className="py-4 px-4 text-right text-brand-text-secondary">0.1 pips</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4 font-bold">GBP/USD</td>
                    <td className="py-4 px-4 text-right text-brand-gold font-black">0.0 pips</td>
                    <td className="py-4 px-4 text-right text-brand-text-secondary">0.2 pips</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4 font-bold">USD/JPY</td>
                    <td className="py-4 px-4 text-right text-brand-gold font-black">0.0 pips</td>
                    <td className="py-4 px-4 text-right text-brand-text-secondary">0.1 pips</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4 font-bold">XAU/USD (Gold)</td>
                    <td className="py-4 px-4 text-right text-brand-gold font-black">0.0 pips</td>
                    <td className="py-4 px-4 text-right text-brand-text-secondary">0.5 pips</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-bold">BTC/USD</td>
                    <td className="py-4 px-4 text-right text-brand-gold font-black">0.0 pips</td>
                    <td className="py-4 px-4 text-right text-brand-text-secondary">1.0 pips</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Trading Tools Section */}
      <section id="tools" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Trading Tools</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Professional Trading Tools</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg mt-4 sm:mt-6 max-w-2xl mx-auto font-medium px-4 sm:px-0">
              Access powerful tools to enhance your trading experience and maximize your potential.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
            <Link href="/news" className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto border border-white/10">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-black mb-2 sm:mb-3">Economic Calendar</h4>
              <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Track important economic events and announcements</p>
              <span className="text-brand-gold text-xs sm:text-sm font-bold inline-flex items-center">
                View Calendar <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </span>
            </Link>
            <Link href="#calculator" className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto border border-white/10">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-5m-6 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zm-7-9h-2v5h2v-5z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-black mb-2 sm:mb-3">Trading Calculator</h4>
              <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Calculate position size, margin, and risk</p>
              <span className="text-brand-gold text-xs sm:text-sm font-bold inline-flex items-center">
                Use Calculator <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </span>
            </Link>
            <Link href="#profit-calculator" className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto border border-white/10">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-black mb-2 sm:mb-3">Profit Calculator</h4>
              <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Calculate profit and loss for your trades</p>
              <span className="text-brand-gold text-xs sm:text-sm font-bold inline-flex items-center">
                Use Calculator <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </span>
            </Link>
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto border border-white/10">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-black mb-2 sm:mb-3">VPS Hosting</h4>
              <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Low-latency VPS for automated trading</p>
              <span className="text-xs sm:text-sm text-brand-text-secondary">Coming Soon</span>
            </div>
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto border border-white/10">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-black mb-2 sm:mb-3">Trading Signals</h4>
              <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Real-time trading signals and alerts</p>
              <span className="text-xs sm:text-sm text-brand-text-secondary">Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trading Calculator Section */}
      <section id="calculator" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-5m-6 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zm-7-9h-2v5h2v-5z" />
              </svg>
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Trading Calculator</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Calculate Your Position Size</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg mt-4 sm:mt-6 max-w-2xl mx-auto font-medium px-4 sm:px-0">
              Use our trading calculator to determine optimal position sizes and manage risk effectively. Enter your account balance, risk percentage, entry price, and stop loss to get instant calculations.
            </p>
          </div>
          <div className="px-4 sm:px-0">
            <TradingCalculator />
          </div>
        </div>
      </section>

      {/* Profit Calculator Section */}
      <section id="profit-calculator" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Profit Calculator</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Calculate Your Profit & Loss</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg mt-4 sm:mt-6 max-w-2xl mx-auto font-medium px-4 sm:px-0">
              Use our profit calculator to estimate potential profit or loss on your trades. Enter your trade details including entry price, exit price, lot size, and leverage to get instant calculations.
            </p>
          </div>
          <div className="px-4 sm:px-0">
            <ProfitCalculator />
          </div>
        </div>
      </section>

      {/* VPS Hosting Section */}
      <section id="vps" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">VPS Hosting</h2>
            <h3 className="text-4xl font-black tracking-tight">Low-Latency VPS for Trading</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Host your Expert Advisors and trading bots on our ultra-low latency VPS infrastructure.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">VPS hosting service coming soon. Get dedicated virtual private servers optimized for automated trading with minimal latency.</p>
            <Link href="/register" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Get Notified</Link>
          </div>
        </div>
      </section>

      {/* Trading Signals Section */}
      <section id="signals" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Trading Signals</h2>
            <h3 className="text-4xl font-black tracking-tight">Professional Trading Signals</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Receive real-time trading signals from our professional analysts and automated systems.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">Trading signals service coming soon. Get access to professional trading signals and market analysis to enhance your trading decisions.</p>
            <Link href="/register" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Get Notified</Link>
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section id="guides" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-12 sm:mb-16 md:mb-20 text-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-4 sm:mb-6">
              <span className="text-[10px] sm:text-xs font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Education</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 sm:mb-6 px-4 sm:px-0">Learn to Trade Like a Pro</h3>
            <p className="text-brand-text-secondary text-base sm:text-lg mt-4 sm:mt-6 max-w-2xl mx-auto font-medium px-4 sm:px-0">
              Comprehensive educational resources to help you master trading and achieve your financial goals.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <h4 className="text-lg font-black mb-3">Trading Guides</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Step-by-step guides for beginners and advanced traders</p>
              <span className="text-brand-text-secondary text-sm">Coming Soon</span>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <h4 className="text-lg font-black mb-3">Webinars</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Live and recorded webinars with trading experts</p>
              <span className="text-brand-text-secondary text-sm">Coming Soon</span>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <h4 className="text-lg font-black mb-3">Video Tutorials</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Comprehensive video library covering all aspects of trading</p>
              <span className="text-brand-text-secondary text-sm">Coming Soon</span>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <h4 className="text-lg font-black mb-3">Trading Strategies</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Proven trading strategies and techniques</p>
              <span className="text-brand-text-secondary text-sm">Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Webinars Section */}
      <section id="webinars" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Webinars</h2>
            <h3 className="text-4xl font-black tracking-tight">Live Trading Webinars</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Join our live webinars and learn from professional traders and market analysts.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">Webinar schedule coming soon. Register to receive notifications about upcoming live trading webinars and educational sessions.</p>
            <Link href="/register" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Get Notified</Link>
          </div>
        </div>
      </section>

      {/* Video Tutorials Section */}
      <section id="tutorials" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Video Tutorials</h2>
            <h3 className="text-4xl font-black tracking-tight">Learn at Your Own Pace</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Access our comprehensive library of video tutorials covering all aspects of trading.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">Video tutorial library coming soon. Learn trading fundamentals, advanced strategies, and platform features through our comprehensive video courses.</p>
            <Link href="/register" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Get Notified</Link>
          </div>
        </div>
      </section>

      {/* Trading Strategies Section */}
      <section id="strategies" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Trading Strategies</h2>
            <h3 className="text-4xl font-black tracking-tight">Proven Trading Strategies</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Discover and implement proven trading strategies used by professional traders.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">Trading strategies library coming soon. Access detailed guides on various trading strategies including scalping, swing trading, trend following, and more.</p>
            <Link href="/register" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Get Notified</Link>
          </div>
        </div>
      </section>

      {/* Regulations Section */}
      <section id="regulations" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Regulations</h2>
            <h3 className="text-4xl font-black tracking-tight">Regulatory Compliance</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Investlyin operates in full compliance with international financial regulations and standards.
            </p>
          </div>
          <div className="max-w-4xl mx-auto glass-card p-12 rounded-3xl border border-white/5">
            <p className="text-brand-text-secondary text-lg leading-relaxed font-medium mb-6">
              Investlyin is committed to maintaining the highest standards of regulatory compliance. We operate under strict regulatory frameworks to ensure the safety and security of our clients' funds and personal information.
            </p>
            <p className="text-brand-text-secondary text-lg leading-relaxed font-medium">
              Our platform adheres to international financial regulations including anti-money laundering (AML) policies, know your customer (KYC) requirements, and data protection standards. Client funds are held in segregated accounts, completely separate from company operations.
            </p>
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section id="careers" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Careers</h2>
            <h3 className="text-4xl font-black tracking-tight">Join Our Team</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Be part of a dynamic team shaping the future of online trading.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">We're always looking for talented individuals to join our team. Check back soon for open positions in technology, finance, customer support, and more.</p>
            <Link href="#contact" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Partners</h2>
            <h3 className="text-4xl font-black tracking-tight">Our Partners</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              We work with leading financial institutions and technology providers to deliver the best trading experience.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">Partner with Investlyin to offer your clients access to institutional-grade trading services. We offer competitive partnership programs for brokers, affiliates, and technology providers.</p>
            <Link href="#contact" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Become a Partner</Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Contact Us</h2>
            <h3 className="text-4xl font-black tracking-tight">Get in Touch</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Have questions? Our support team is here to help you 24/7.
            </p>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <h4 className="text-lg font-black mb-3">Email Support</h4>
              <p className="text-brand-text-secondary text-sm mb-4">support@investlyin.com</p>
              <p className="text-brand-text-secondary text-xs">24/7 email support</p>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <h4 className="text-lg font-black mb-3">Live Chat</h4>
              <p className="text-brand-text-secondary text-sm mb-4">Available 24/7</p>
              <p className="text-brand-text-secondary text-xs">Instant support</p>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
              <h4 className="text-lg font-black mb-3">Phone Support</h4>
              <p className="text-brand-text-secondary text-sm mb-4">+1 (555) 123-4567</p>
              <p className="text-brand-text-secondary text-xs">Mon-Fri 9AM-6PM EST</p>
            </div>
          </div>
        </div>
      </section>

      {/* Help Center Section */}
      <section id="help" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Help Center</h2>
            <h3 className="text-4xl font-black tracking-tight">How Can We Help?</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Find answers to common questions and get the support you need.
            </p>
          </div>
          <div className="max-w-4xl mx-auto glass-card p-12 rounded-3xl border border-white/5">
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-black mb-2">Account Management</h4>
                <p className="text-brand-text-secondary text-sm">Learn how to manage your account, update personal information, and configure security settings.</p>
              </div>
              <div>
                <h4 className="text-lg font-black mb-2">Trading Basics</h4>
                <p className="text-brand-text-secondary text-sm">Get started with trading, understand order types, and learn about our trading platform.</p>
              </div>
              <div>
                <h4 className="text-lg font-black mb-2">Deposits & Withdrawals</h4>
                <p className="text-brand-text-secondary text-sm">Information about funding your account and withdrawing your profits.</p>
              </div>
              <div>
                <h4 className="text-lg font-black mb-2">Platform Guides</h4>
                <p className="text-brand-text-secondary text-sm">Step-by-step guides for using our web platform, mobile app, and trading tools.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Chat Section */}
      <section id="chat" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Live Chat</h2>
            <h3 className="text-4xl font-black tracking-tight">Chat with Our Support Team</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Get instant answers to your questions through our 24/7 live chat support.
            </p>
          </div>
          <div className="max-w-2xl mx-auto glass-card p-12 rounded-3xl border border-white/5 text-center">
            <p className="text-brand-text-secondary text-lg mb-6">Live chat support is available 24/7. Click the chat icon in the bottom right corner of your screen to start a conversation with our support team.</p>
            <Link href="/dashboard" className="inline-block px-6 py-3 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all">Go to Dashboard</Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-brand-obsidian scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">FAQ</h2>
            <h3 className="text-4xl font-black tracking-tight">Frequently Asked Questions</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Find answers to the most common questions about our platform and services.
            </p>
          </div>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="glass-card p-6 rounded-xl border border-white/5">
              <h4 className="text-lg font-black mb-2">How do I open an account?</h4>
              <p className="text-brand-text-secondary text-sm">Click the "Open Account" button in the navigation, fill out the registration form, verify your email, and complete the KYC process.</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-white/5">
              <h4 className="text-lg font-black mb-2">What is the minimum deposit?</h4>
              <p className="text-brand-text-secondary text-sm">The minimum deposit varies by account type. Standard accounts start at $100, Pro accounts at $1,000, and Zero accounts at $5,000.</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-white/5">
              <h4 className="text-lg font-black mb-2">How do I withdraw funds?</h4>
              <p className="text-brand-text-secondary text-sm">Navigate to the Wallet page, click "Withdraw", select your withdrawal method, enter the amount, and follow the verification steps. Profit withdrawals are processed within 24-48 hours.</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-white/5">
              <h4 className="text-lg font-black mb-2">What leverage is available?</h4>
              <p className="text-brand-text-secondary text-sm">Maximum leverage up to 1:1000 is available for qualified traders. Leverage varies based on your account type and trading experience.</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-white/5">
              <h4 className="text-lg font-black mb-2">Are my funds safe?</h4>
              <p className="text-brand-text-secondary text-sm">Yes, all client funds are held in segregated accounts, completely separate from company operations. We use bank-level encryption and security measures.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Account Verification Section */}
      <section id="verification" className="py-32 bg-[#0C0E12] scroll-mt-20">
        <div className="content-container">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.4em] mb-4">Account Verification</h2>
            <h3 className="text-4xl font-black tracking-tight">Verify Your Account</h3>
            <p className="text-brand-text-secondary text-lg mt-6 max-w-2xl mx-auto font-medium">
              Complete your account verification to unlock all platform features and increase withdrawal limits.
            </p>
          </div>
          <div className="max-w-4xl mx-auto glass-card p-12 rounded-3xl border border-white/5">
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-black mb-2">KYC Verification</h4>
                <p className="text-brand-text-secondary text-sm mb-4">Submit your KYC documents (passport, driver's license, or national ID) through your Account Settings page. Our team will review your documents within 24-48 hours.</p>
                <Link href="/profile" className="text-brand-gold text-sm font-bold hover:underline">Go to Account Settings →</Link>
              </div>
              <div>
                <h4 className="text-lg font-black mb-2">Email Verification</h4>
                <p className="text-brand-text-secondary text-sm">Verify your email address by clicking the link sent to your registered email. Check your spam folder if you don't see the email.</p>
              </div>
              <div>
                <h4 className="text-lg font-black mb-2">Two-Factor Authentication</h4>
                <p className="text-brand-text-secondary text-sm">Enable 2FA for enhanced security. This is required for withdrawals and sensitive account operations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32 border-t border-white/5 bg-brand-obsidian relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-gold/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="content-container relative z-10">
          <div className="glass-panel p-10 md:p-20 rounded-[40px] border border-brand-gold/10 text-center relative overflow-hidden group">
            {/* Subtle animated border gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>

            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">Ready to Elevate <br />Your Trading?</h2>
            <p className="text-brand-text-secondary text-lg mb-12 max-w-xl mx-auto font-medium leading-relaxed">
              Join 1,000,000+ traders who trust Investlyin for their clinical execution and institutional depth.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
              <Link href="/register" className="group relative w-full md:w-72 py-5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-[0.3em] text-sm rounded-xl overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(255,184,0,0.4)]">
                <span className="relative z-10">Create Account</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </Link>
            </div>
          </div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-16 border-b border-white/5">
            <div className="space-y-6">
              <div className="text-xl font-black italic tracking-tighter"><span className="text-white">Invest</span><span className="font-black text-brand-gold">lyin</span></div>
              <p className="text-brand-text-secondary text-sm leading-relaxed font-medium">
                The world's leading multi-asset platform for professional traders. Built for performance, speed, and precision.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6">Trading</h4>
              <ul className="space-y-4 text-sm text-brand-text-secondary font-medium">
                <li><Link href="#forex" className="hover:text-brand-gold transition-colors">Forex</Link></li>
                <li><Link href="#crypto" className="hover:text-brand-gold transition-colors">Cryptocurrencies</Link></li>
                <li><Link href="#markets" className="hover:text-brand-gold transition-colors">Commodities</Link></li>
                <li><Link href="#indices" className="hover:text-brand-gold transition-colors">Indices</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6">Platform</h4>
              <ul className="space-y-4 text-sm text-brand-text-secondary font-medium">
                <li><Link href="#features" className="hover:text-brand-gold transition-colors">Terminals</Link></li>
                <li><Link href="#verification" className="hover:text-brand-gold transition-colors">Security</Link></li>
                <li><Link href="/login" className="hover:text-brand-gold transition-colors">Institutional</Link></li>
                <li><Link href="/register" className="hover:text-brand-gold transition-colors">Partnerships</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-brand-text-secondary font-medium">
                <li><Link href="#faq" className="hover:text-brand-gold transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-brand-gold transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-brand-gold transition-colors">API Documentation</Link></li>
                <li><Link href="#" className="hover:text-brand-gold transition-colors">System Status</Link></li>
              </ul>
            </div>
          </div>

          <div className="py-20 animate-fade-in" style={{ animationDelay: '1.4s' }}>
            {/* Premium Regulatory Disclosure Box */}
            <div className="relative group overflow-hidden rounded-[32px]">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-brand-gold/10 via-transparent to-brand-gold/10 rounded-[32px] blur-2xl opacity-40 group-hover:opacity-75 transition-all duration-700"></div>
              <div className="relative glass-panel rounded-[32px] p-10 border border-white/5 shadow-2xl backdrop-blur-3xl overflow-hidden hover:border-brand-gold/20 transition-all duration-500">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700">
                  <svg className="w-24 h-24 text-brand-gold scale-125" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                  </svg>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="flex-shrink-0 relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,184,0,0.1)] group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-grow text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start space-x-3 mb-3">
                      <div className="w-8 h-[1px] bg-brand-gold/40"></div>
                      <h5 className="text-[10px] font-black tracking-[0.3em] text-brand-gold uppercase">Institutional Protection Protocol</h5>
                    </div>
                    <h4 className="text-white text-xl font-black mb-3 tracking-tight">Regulatory Compliance & Transparency</h4>
                    <p className="text-sm text-brand-text-secondary leading-relaxed max-w-2xl font-medium">
                      Investlyin Ltd is professionally regulated by the <span className="text-white font-black hover:text-brand-gold transition-colors cursor-help underline decoration-brand-gold/30 underline-offset-4">Cyprus Securities and Exchange Commission (CySEC)</span> under License No. <span className="text-white font-black">9564562</span>.
                    </p>
                    <p className="text-xs text-brand-text-secondary/70 mt-4 leading-relaxed max-w-xl">
                      As a Tier-1 financial provider, we strictly adhere to a <span className="text-white/90 font-semibold">"Segregated Client Funds Policy"</span>, ensuring your assets are managed by major European banking institutions and remain independent from company liquidity.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition-all cursor-default">CySEC Verified</div>
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition-all cursor-default">Compliant</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-[10px] text-brand-text-secondary uppercase tracking-[0.2em] font-medium">
                © 2026 Investlyin. All Rights Reserved. Institutional Grade Trading.
              </p>
              <div className="flex items-center space-x-8 text-[10px] text-brand-text-secondary uppercase tracking-widest font-black">
                <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link href="#" className="hover:text-white transition-colors">Risk Warning</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, desc, icon, features }: { title: string, desc: string, icon: React.ReactNode, features?: string[] }) {
  return (
    <div className="glass-card p-10 rounded-3xl border border-white/5 flex flex-col items-center text-center hover:border-brand-gold/30 hover:transform hover:scale-105 hover:shadow-[0_0_30px_rgba(255,184,0,0.1)] transition-all duration-300 group">
      <div className="w-16 h-16 bg-gradient-to-br from-brand-gold/10 to-brand-gold/5 rounded-2xl flex items-center justify-center mb-8 border border-brand-gold/20 group-hover:bg-gradient-to-br group-hover:from-brand-gold/20 group-hover:to-brand-gold/10 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <h4 className="text-xl font-black mb-4 uppercase tracking-tight group-hover:text-brand-gold transition-colors">{title}</h4>
      <p className="text-brand-text-secondary text-sm leading-relaxed font-medium mb-6">{desc}</p>
      {features && (
        <div className="w-full space-y-2 mt-auto">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center justify-center space-x-2 text-xs text-brand-text-secondary/70">
              <svg className="w-3 h-3 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketCard({ id, title, icon, description }: { id: string, title: string, icon: string, description: string }) {
  const icons: Record<string, React.ReactNode> = {
    currency: (
      <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gold: (
      <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    crypto: (
      <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    energy: (
      <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    stocks: (
      <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    indices: (
      <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  };

  return (
    <div id={id} className="glass-card p-8 rounded-2xl border border-white/5 text-center scroll-mt-20 hover:border-brand-gold/20 hover:transform hover:scale-105 transition-all duration-300 cursor-pointer">
      <div className="w-14 h-14 bg-brand-gold/10 rounded-xl flex items-center justify-center mb-6 mx-auto border border-brand-gold/20 hover:bg-brand-gold/20 hover:scale-110 transition-all">
        {icons[icon] || icons.currency}
      </div>
      <h4 className="text-lg font-black mb-3 uppercase tracking-tight">{title}</h4>
      <p className="text-brand-text-secondary text-sm font-medium">{description}</p>
    </div>
  );
}
