import { MessageCircle, Twitch, Instagram, Music, Heart } from "lucide-react";
import { motion } from "framer-motion";

export function Footer() {
  const socialLinks = [
    { icon: MessageCircle, label: "Discord", url: "https://discord.gg/itsme", color: "hover:text-blue-400 hover:border-blue-400/30" },
    { icon: Twitch, label: "Twitch", url: "https://www.twitch.tv/itsme_officialttv", color: "hover:text-purple-400 hover:border-purple-400/30" },
    { icon: Instagram, label: "Instagram", url: "https://www.instagram.com/itsme_officialttv", color: "hover:text-pink-400 hover:border-pink-400/30" },
    { icon: Music, label: "TikTok", url: "https://www.tiktok.com/@itsme_officialttv", color: "hover:text-white hover:border-white/30" },
  ];

  return (
    <footer className="mt-20 relative overflow-hidden">
      {/* Glass background */}
      <div className="absolute inset-0 glass-subtle" />
      
      {/* Subtle glow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="relative container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-display text-primary mb-3">ITSME</h3>
            <p className="text-white/50 max-w-sm leading-relaxed text-sm">
              La community #1 di esports. Partecipa ai tornei, competi e connettiti con migliaia di giocatori VALORANT.
            </p>
            
            <motion.div 
              className="flex gap-2 mt-5"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {socialLinks.map((link, idx) => (
                <motion.a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2.5 rounded-lg glass-hover text-white/40 transition-all duration-300 ${link.color}`}
                >
                  <link.icon className="h-4 w-4" />
                </motion.a>
              ))}
            </motion.div>
          </motion.div>

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-display text-xs uppercase tracking-[0.15em] text-primary/80 mb-4">Community</h4>
            <a 
              href="https://discord.gg/itsme" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/40 hover:text-primary transition-all duration-300 group text-sm"
            >
              <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="group-hover:translate-x-1 transition-transform">Discord Server</span>
            </a>
          </motion.div>

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <h4 className="font-display text-xs uppercase tracking-[0.15em] text-primary/80 mb-4">Seguici</h4>
            <div className="space-y-2">
              {socialLinks.slice(1).map((link, idx) => (
                <a 
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/40 hover:text-primary transition-all duration-300 group text-sm"
                >
                  <link.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                </a>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="border-t border-white/[0.06] pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-white/30 gap-3"
        >
          <p>&copy; 2025 ITSME Community. Tutti i diritti riservati.</p>
          <p className="flex items-center gap-1.5 text-primary/60">
            Made with <Heart className="h-3.5 w-3.5 fill-primary/60" /> for the community
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
