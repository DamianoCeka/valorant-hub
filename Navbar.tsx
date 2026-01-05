import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Menu, X, Trophy, Lock, Users, User, LogIn, Loader2, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import logoImage from "@assets/generated_images/itsme_circular_logo_with_crown_and_red_seal_stamp.png";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const DiscordIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { href: "/tournaments", label: "Tornei", icon: Trophy },
    { href: "/community", label: "Community", icon: Users },
    { href: "/profile", label: "Profilo", icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background border-b border-white/10">
      <div className="container flex h-16 items-center px-4">
        <Link href="/">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mr-8 flex items-center space-x-3 cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/30 hover:ring-primary/50 transition-all duration-300 flex-shrink-0">
              <img src={logoImage} alt="ITSME" className="h-full w-full object-cover" />
            </div>
            <span className="hidden font-display text-xl font-bold sm:inline-block tracking-wider text-primary">
              ITSME
            </span>
          </motion.div>
        </Link>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex flex-1 items-center justify-end space-x-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer",
                  location === item.href 
                    ? "text-primary bg-primary/10" 
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <span className="uppercase tracking-wide">{item.label}</span>
                {location === item.href && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.div>
            </Link>
          ))}
          
          {/* Discord Link */}
          <motion.a
            href="https://discord.gg/itsme"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-2 rounded-xl text-[#5865F2] hover:bg-[#5865F2]/10 transition-all duration-300 cursor-pointer flex items-center gap-2"
            data-testid="link-discord"
          >
            <DiscordIcon />
            <span className="text-sm font-medium uppercase tracking-wide hidden lg:inline">Discord</span>
          </motion.a>
          
          {/* Separator */}
          <div className="w-px h-6 bg-white/10 mx-2" />
          
          {/* User section: Login button or Admin link */}
          {isLoading ? (
            <div className="p-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : isAuthenticated && user ? (
            <>
              {/* Admin Link - only show when authenticated */}
              <Link href="/admin">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 cursor-pointer",
                    location === "/admin" 
                      ? "text-primary bg-primary/10" 
                      : "text-white/40 hover:text-white hover:bg-white/[0.05]"
                  )}
                >
                  <Lock className="h-4 w-4" />
                </motion.div>
              </Link>
              
              {/* User Avatar with Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  data-testid="button-user-menu"
                >
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.username}
                      className="h-9 w-9 rounded-full ring-2 ring-primary/30 hover:ring-primary/50 transition-all"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                      <span className="text-sm font-bold text-primary">{user.username?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <ChevronDown className={cn("h-4 w-4 text-white/50 transition-transform", userMenuOpen && "rotate-180")} />
                </motion.button>
                
                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-xl overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-white/10">
                        <p className="font-medium truncate">{user.username}</p>
                        <p className="text-sm text-white/50 truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link href="/profile">
                          <button
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                            onClick={() => setUserMenuOpen(false)}
                            data-testid="link-user-profile"
                          >
                            <User className="h-4 w-4 text-white/60" />
                            <span>Il mio profilo</span>
                          </button>
                        </Link>
                        <button
                          onClick={() => { setUserMenuOpen(false); logout(); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                          data-testid="button-logout"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Esci</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* Login Button */
            <motion.a
              href="/api/auth/discord"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium transition-all duration-300"
              data-testid="button-login-discord"
            >
              <DiscordIcon />
              <span className="text-sm uppercase tracking-wide">Accedi</span>
            </motion.a>
          )}
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="ml-auto md:hidden p-2.5 rounded-xl text-white/70 hover:text-white glass-hover"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </motion.button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden overflow-hidden"
          >
            <div className="p-4 space-y-2 glass-subtle mx-4 mb-4 rounded-2xl">
              {navItems.map((item, idx) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center space-x-3 text-sm font-medium transition-all duration-300 cursor-pointer p-3 rounded-xl",
                        location === item.href 
                          ? "text-primary bg-primary/10" 
                          : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="uppercase tracking-wide">{item.label}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
              
              {/* Mobile Discord link */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navItems.length * 0.05 }}
              >
                <a
                  href="https://discord.gg/itsme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 rounded-xl text-[#5865F2] hover:bg-[#5865F2]/10 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  <DiscordIcon />
                  <span className="uppercase tracking-wide font-medium">Discord Server</span>
                </a>
              </motion.div>
              
              {/* Mobile Login/User section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (navItems.length + 1) * 0.05 }}
                className="pt-2 mt-2 border-t border-white/10"
              >
                {isAuthenticated && user ? (
                  <div className="space-y-2">
                    <Link href="/profile">
                      <div 
                        className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 transition-all"
                        onClick={() => setIsOpen(false)}
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="h-8 w-8 rounded-full ring-2 ring-primary/30" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{user.username?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => { setIsOpen(false); logout(); }}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="uppercase tracking-wide font-medium">Esci</span>
                    </button>
                  </div>
                ) : (
                  <a
                    href="/api/auth/discord"
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium transition-all"
                    onClick={() => setIsOpen(false)}
                  >
                    <DiscordIcon />
                    <span className="uppercase tracking-wide">Accedi con Discord</span>
                  </a>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
