import { useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, VideoIcon, Quote } from "lucide-react";
import { Memes } from "./Memes";
import { Clips } from "./Clips";
import { Quotes } from "./Quotes";

type Tab = "memes" | "clips" | "quotes";

export function Community() {
  const [activeTab, setActiveTab] = useState<Tab>("memes");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-display mb-2">Community</h1>
        <p className="text-white/60">Meme, clip e contenuti della community ITSME</p>
      </div>

      <div className="flex justify-center gap-2 flex-wrap">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab("memes")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "memes"
              ? "bg-primary text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
          data-testid="tab-memes"
        >
          <ImageIcon className="h-5 w-5" />
          Memes
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab("clips")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "clips"
              ? "bg-primary text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
          data-testid="tab-clips"
        >
          <VideoIcon className="h-5 w-5" />
          Clips
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab("quotes")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === "quotes"
              ? "bg-primary text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
          data-testid="tab-quotes"
        >
          <Quote className="h-5 w-5" />
          Quotes
        </motion.button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "memes" && <Memes />}
        {activeTab === "clips" && <Clips />}
        {activeTab === "quotes" && <Quotes />}
      </motion.div>
    </div>
  );
}
