import React, { useEffect } from "react";
import { X, User, Github, Linkedin } from "lucide-react";

interface AboutDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutDeveloperModal({
  isOpen,
  onClose,
}: AboutDeveloperModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      id="about-developer-modal-overlay"
    >
      <div
        className="bg-white dark:bg-[#15181E] border border-[#121212] dark:border-[#2C323E] rounded-none max-w-md w-full pt-6 px-6 pb-5 md:pt-8 md:px-8 md:pb-6 shadow-2xl relative space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
        id="about-developer-modal-card"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#121212] dark:hover:text-white transition-colors cursor-pointer p-1"
          aria-label="Close modal"
          id="btn-close-about-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* AVATAR PLACEHOLDER: Replace this div with <img src="/path/to/photo.jpg" alt="Mohammed Aatef" className="w-20 h-20 rounded-full object-cover border border-[#E5E1DA] dark:border-[#2C323E] mx-auto" /> when a photo is available */}
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-[#1E222A] border border-[#E5E1DA] dark:border-[#2C323E] flex items-center justify-center mx-auto text-gray-400 dark:text-[#6B7280]">
          <User className="w-10 h-10" />
        </div>

        {/* Name Header */}
        <div className="space-y-1">
          <span className="block text-[10px] uppercase tracking-widest font-bold font-mono text-gray-400 dark:text-[#F59E0B]">
            About the Developer
          </span>
          <h2 className="text-2xl font-serif italic font-bold tracking-tight text-[#121212] dark:text-white">
            Mohammed Aatef
          </h2>
        </div>

        {/* PLACEHOLDER BIO TEXT: Edit bio content as needed for your background */}
        <p className="text-xs text-gray-600 dark:text-[#9CA3AF] leading-relaxed font-sans max-w-sm mx-auto">
          A developer passionate about building practical tools that make decisions clearer. Converge combines classic decision science (AHP + TOPSIS) with modern AI to help people reason through complex choices.
        </p>

        {/* Social Links / Contact Badges */}
        <div className="pt-5 md:pt-6 border-t border-[#E5E1DA] dark:border-[#262A33] flex items-center justify-center gap-3">
          <a
            href="https://github.com/TR-Mohd"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Profile"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors duration-200 shadow-2xs"
          >
            <Github size={20} />
          </a>
          <a
            href="https://www.linkedin.com/in/mohammed-aatef-saleh/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Profile"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-[#0A66C2]/10 text-[#0A66C2] dark:bg-[#0A66C2]/20 dark:text-[#38BDF8] hover:bg-[#0A66C2]/20 dark:hover:bg-[#0A66C2]/35 transition-colors duration-200 shadow-2xs"
          >
            <Linkedin size={20} />
          </a>
        </div>
      </div>
    </div>
  );
}
