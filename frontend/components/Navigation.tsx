'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const dropdowns = {
    trading: {
      title: 'Trading',
      items: [
        { label: 'Account Types', href: '#account-types' },
        { label: 'Trading Platforms', href: '#platforms' },
        { label: 'Trading Tools', href: '#tools' },
        { label: 'Trading Conditions', href: '#conditions' },
        { label: 'Leverage', href: '#leverage' },
        { label: 'Spreads', href: '#spreads' },
      ],
    },
    markets: {
      title: 'Markets',
      items: [
        { label: 'Forex', href: '#forex' },
        { label: 'Metals', href: '#metals' },
        { label: 'Cryptocurrencies', href: '#crypto' },
        { label: 'Energies', href: '#energies' },
        { label: 'Stocks', href: '#stocks' },
        { label: 'Indices', href: '#indices' },
      ],
    },
    tools: {
      title: 'Tools',
      items: [
        { label: 'Economic Calendar', href: '/news' },
        { label: 'Trading Calculator', href: '#calculator' },
        { label: 'Profit Calculator', href: '#profit-calculator' },
        { label: 'VPS Hosting', href: '#vps' },
        { label: 'Trading Signals', href: '#signals' },
        { label: 'Market Analysis', href: '/news' },
      ],
    },
    education: {
      title: 'Education',
      items: [
        { label: 'Trading Guides', href: '#guides' },
        { label: 'Webinars', href: '#webinars' },
        { label: 'Video Tutorials', href: '#tutorials' },
        { label: 'Trading Strategies', href: '#strategies' },
        { label: 'Market News', href: '/news' },
      ],
    },
    about: {
      title: 'About',
      items: [
        { label: 'Company', href: '#about' },
        { label: 'Regulations', href: '#regulations' },
        { label: 'Careers', href: '#careers' },
        { label: 'Partners', href: '#partners' },
        { label: 'Contact Us', href: '#contact' },
      ],
    },
    support: {
      title: 'Support',
      items: [
        { label: 'Help Center', href: '#help' },
        { label: 'Live Chat', href: '#chat' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Account Verification', href: '#verification' },
      ],
    },
  };

  const handleMouseEnter = (key: string) => {
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  const handleDropdownClick = (key: string) => {
    setActiveDropdown(activeDropdown === key ? null : key);
  };

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu when clicking outside or on backdrop
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  return (
    <nav ref={navRef} className="relative h-16 sm:h-20 border-b border-white/10 sticky top-0 bg-brand-obsidian/98 backdrop-blur-xl z-50 shadow-lg">
      <div className="content-container h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4 sm:space-x-8 lg:space-x-12 flex-1">
          <Link href="/" className="text-xl sm:text-2xl font-black italic tracking-tighter text-brand-gold flex-shrink-0">
            bit<span className="text-white">X</span><span className="font-black text-brand-gold">trade</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-0.5 xl:space-x-1">
            {Object.entries(dropdowns).map(([key, dropdown]) => (
              <div
                key={key}
                className="relative group"
                onMouseEnter={() => handleMouseEnter(key)}
                onMouseLeave={handleMouseLeave}
              >
                <button 
                  className={`px-3 xl:px-4 py-2.5 text-sm xl:text-base font-semibold transition-all duration-200 flex items-center space-x-1.5 min-h-[44px] rounded-md relative ${
                    activeDropdown === key 
                      ? 'text-white bg-white/10' 
                      : 'text-brand-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                  onMouseEnter={() => handleMouseEnter(key)}
                >
                  <span className="relative z-10">{dropdown.title}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === key ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {activeDropdown === key && (
                  <div 
                    className="absolute top-full left-0 pt-2 z-[60] animate-fade-in-down"
                    onMouseEnter={() => setActiveDropdown(key)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div 
                      className="bg-brand-surface/98 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl py-2 min-w-[240px] xl:min-w-[280px] overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dropdown.items.map((item, idx) => (
                        <Link
                          key={idx}
                          href={item.href}
                          className="block px-4 py-2.5 text-sm text-brand-text-secondary hover:text-white hover:bg-gradient-to-r hover:from-brand-gold/10 hover:to-transparent transition-all duration-150 border-l-[3px] border-transparent hover:border-brand-gold min-h-[44px] flex items-center group/item relative hover:translate-x-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Close dropdown after navigation
                            if (!item.href.startsWith('#')) {
                              setActiveDropdown(null);
                            }
                          }}
                        >
                          <span className="relative z-10">{item.label}</span>
                          <svg 
                            className="w-4 h-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3 lg:space-x-4 flex-shrink-0">
          {user ? (
            <button
              onClick={() => {
                router.push(user.role === 'admin' ? '/admin' : '/dashboard');
                setMobileMenuOpen(false);
              }}
              className="px-4 lg:px-6 py-2 lg:py-2.5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center touch-manipulation"
            >
              Dashboard
            </button>
          ) : (
            <>
              <Link href="/login" className="text-sm font-bold text-white hover:text-brand-gold transition-colors whitespace-nowrap min-h-[44px] flex items-center touch-manipulation">
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 lg:px-6 py-2 lg:py-2.5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-xs rounded-lg hover:shadow-gold transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center touch-manipulation"
              >
                Open Account
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2.5 text-white hover:text-brand-gold active:text-brand-gold transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu - Rendered via Portal */}
      {mounted && mobileMenuOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed top-16 sm:top-20 left-0 right-0 bottom-0 bg-black/50 z-[100]"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div 
            className="lg:hidden fixed top-16 sm:top-20 left-0 right-0 bottom-0 bg-brand-obsidian/98 backdrop-blur-md z-[110] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="content-container py-6 px-4">
            {Object.entries(dropdowns).map(([key, dropdown]) => (
              <div key={key} className="mb-4" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropdownClick(key);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-base font-bold text-white hover:text-brand-gold active:text-brand-gold transition-colors bg-white/5 rounded-lg mb-2 min-h-[44px] touch-manipulation"
                >
                  <span>{dropdown.title}</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${activeDropdown === key ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {activeDropdown === key && (
                  <div className="ml-4 space-y-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    {dropdown.items.map((item, idx) => (
                      <Link
                        key={idx}
                        href={item.href}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Only close menu for non-hash links (page navigation)
                          // For hash links, keep menu open to allow smooth scroll
                          if (!item.href.startsWith('#')) {
                            setMobileMenuOpen(false);
                            setActiveDropdown(null);
                          } else {
                            // For hash links, close menu after a short delay to allow scroll
                            setTimeout(() => {
                              setMobileMenuOpen(false);
                              setActiveDropdown(null);
                            }, 300);
                          }
                        }}
                        className="block px-4 py-3 text-sm text-brand-text-secondary hover:text-white active:text-white hover:bg-brand-gold/10 transition-all rounded-lg border-l-2 border-transparent hover:border-brand-gold min-h-[44px] flex items-center touch-manipulation"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile Auth Buttons */}
            <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
              {user ? (
                <button
                  onClick={() => {
                    router.push(user.role === 'admin' ? '/admin' : '/dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-6 py-3.5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-sm rounded-lg hover:shadow-gold transition-all min-h-[44px] flex items-center justify-center touch-manipulation"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-6 py-3.5 text-center text-base font-bold text-white hover:text-brand-gold active:text-brand-gold transition-colors border border-white/20 rounded-lg min-h-[44px] flex items-center justify-center touch-manipulation"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-6 py-3.5 text-center bg-brand-gold text-brand-obsidian font-black uppercase tracking-widest text-sm rounded-lg hover:shadow-gold transition-all min-h-[44px] flex items-center justify-center touch-manipulation"
                  >
                    Open Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        </>,
        document.body
      )}
    </nav>
  );
}
