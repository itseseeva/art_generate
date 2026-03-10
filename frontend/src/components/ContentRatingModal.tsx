import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContentRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rating: 'safe' | 'nsfw') => void;
}

export const ContentRatingModal: React.FC<ContentRatingModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [selectedRating, setSelectedRating] = useState<'safe' | 'nsfw' | null>(null);

  const handleRatingSelect = (rating: 'safe' | 'nsfw') => {
    setSelectedRating(rating);
    setTimeout(() => {
      onSelect(rating);
      setTimeout(() => setSelectedRating(null), 300);
    }, 500);
  };

  const handleClose = () => {
    setSelectedRating(null);
    onClose();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md"
          onClick={handleClose}
        >
          <style>{`
            @keyframes shimmerGlow {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-shimmer-glow {
              animation: shimmerGlow 2s linear infinite;
            }
          `}</style>

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl p-8 md:p-10 rounded-3xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.8)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="text-center mb-10 mt-2">
              <motion.h2
                className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                {isEn ? 'Select Content Rating' : 'Выберите рейтинг контента'}
              </motion.h2>
              <motion.p
                className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {isEn
                  ? 'Choose a category for your character. This determines which page they will be displayed on.'
                  : 'Выберите категорию для вашего персонажа. Это определит, на какой странице он будет отображаться.'}
              </motion.p>
            </div>

            <motion.div
              className="flex flex-col md:flex-row gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* SAFE Card */}
              <motion.button
                variants={itemVariants}
                onClick={() => handleRatingSelect('safe')}
                disabled={selectedRating !== null}
                whileHover={selectedRating === null ? { scale: 1.03 } : {}}
                whileTap={selectedRating === null ? { scale: 0.98 } : {}}
                className={`group relative flex-1 text-left p-6 md:p-8 rounded-2xl border transition-all duration-300 overflow-hidden ${selectedRating === 'safe'
                    ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-emerald-500/10'
                    : selectedRating === 'nsfw'
                      ? 'border-white/5 opacity-40 bg-white/5'
                      : 'border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  }`}
              >
                {selectedRating === 'safe' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent w-[200%] animate-shimmer-glow"></div>
                )}

                <div className="relative z-10 flex flex-col gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner ${selectedRating === 'safe'
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/30'
                      : 'bg-white/5 text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 group-hover:shadow-emerald-500/30'
                    }`}>
                    <Shield size={28} className={selectedRating === 'safe' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-300'} />
                  </div>

                  <div>
                    <h3 className={`text-xl font-bold tracking-wide flex items-center gap-2 mb-2 transition-colors duration-300 ${selectedRating === 'safe' ? 'text-emerald-400' : 'text-gray-100 group-hover:text-emerald-400'
                      }`}>
                      SAFE 16+
                      {selectedRating === 'safe' && <span className="text-emerald-400 text-sm bg-emerald-500/20 w-6 h-6 rounded-full flex items-center justify-center -ml-1">✓</span>}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {isEn
                        ? 'Safe content for all ages. Character will appear on the SAFE page.'
                        : 'Безопасный контент для всех возрастов. Персонаж будет отображаться на странице SAFE.'}
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* NSFW Card */}
              <motion.button
                variants={itemVariants}
                onClick={() => handleRatingSelect('nsfw')}
                disabled={selectedRating !== null}
                whileHover={selectedRating === null ? { scale: 1.03 } : {}}
                whileTap={selectedRating === null ? { scale: 0.98 } : {}}
                className={`group relative flex-1 text-left p-6 md:p-8 rounded-2xl border transition-all duration-300 overflow-hidden ${selectedRating === 'nsfw'
                    ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)] bg-rose-500/10'
                    : selectedRating === 'safe'
                      ? 'border-white/5 opacity-40 bg-white/5'
                      : 'border-white/10 bg-white/5 hover:border-rose-500/50 hover:bg-rose-500/10 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                  }`}
              >
                {selectedRating === 'nsfw' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent w-[200%] animate-shimmer-glow"></div>
                )}

                <div className="relative z-10 flex flex-col gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner ${selectedRating === 'nsfw'
                      ? 'bg-rose-500/20 text-rose-400 shadow-rose-500/30'
                      : 'bg-white/5 text-slate-400 group-hover:bg-rose-500/20 group-hover:text-rose-400 group-hover:shadow-rose-500/30'
                    }`}>
                    <Flame size={28} className={selectedRating === 'nsfw' ? 'drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all duration-300'} />
                  </div>

                  <div>
                    <h3 className={`text-xl font-bold tracking-wide flex items-center gap-2 mb-2 transition-colors duration-300 ${selectedRating === 'nsfw' ? 'text-rose-400' : 'text-gray-100 group-hover:text-rose-400'
                      }`}>
                      NSFW 18+
                      {selectedRating === 'nsfw' && <span className="text-rose-400 text-sm font-bold bg-rose-500/20 w-6 h-6 rounded-full flex items-center justify-center -ml-1">!</span>}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {isEn
                        ? 'Adult content. Character will appear on the NSFW page.'
                        : 'Контент для взрослых. Персонаж будет отображаться на странице NSFW.'}
                    </p>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
