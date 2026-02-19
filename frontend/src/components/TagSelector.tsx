import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Check, Plus, Hash, Sparkles } from 'lucide-react';
import { API_CONFIG } from '../config/api';
import { useTranslation } from 'react-i18next';

// ==========================================
// TYPES & CONSTANTS
// ==========================================

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Custom Tag Categories Mapping
const TAG_CATEGORIES: Record<string, string[]> = {
  "ROLE": ["Босс", "Горничная", "Незнакомка", "Подруга", "Слуга", "Студентка", "Учитель"],
  "MOOD": ["Грубая", "Доминирование", "Милая", "Цундере"],
  "GENRE": ["Киберпанк", "Фэнтези"],
  "TYPE": ["NSFW", "New", "Original", "SFW", "Пользовательские"]
};

// ==========================================
// COMPONENT
// ==========================================

export const TagSelector: React.FC<TagSelectorProps> = ({ selectedTags, onChange, className = '', style }) => {
  const { t } = useTranslation('common');
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  // 1. Fetch Tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/available-tags`);
        if (response.ok) {
          const data = await response.json();
          const uniqueTagsMap = new Map();
          if (Array.isArray(data)) {
            data.forEach((tag: any) => {
              const tagName = typeof tag === 'string' ? tag : tag.name;
              const tagObj = typeof tag === 'string' ? { name: tag, slug: tag } : tag;
              if (!uniqueTagsMap.has(tagName)) uniqueTagsMap.set(tagName, tagObj);
            });
            setAvailableTags(Array.from(uniqueTagsMap.values()));
          }
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  // 2. Filter & Categorize Tags
  const categorizedTags = useMemo(() => {
    const result: Record<string, any[]> = {};
    const usedTagNames = new Set<string>();

    // Normalize categories logic to handle case sensitivity if needed, currently matching strict strings
    Object.entries(TAG_CATEGORIES).forEach(([category, names]) => {
      const tagsInCat = availableTags.filter(t => names.includes(t.name));
      if (tagsInCat.length > 0) {
        result[category] = tagsInCat;
        tagsInCat.forEach(t => usedTagNames.add(t.name));
      }
    });

    const otherTags = availableTags.filter(t => !usedTagNames.has(t.name));
    if (otherTags.length > 0) {
      result["OTHER"] = otherTags;
    }

    return result;
  }, [availableTags]);

  // 3. Handlers
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  if (availableTags.length === 0) return null;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.3,
        duration: 3
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.5,
      filter: 'blur(10px)',
      rotateX: 90
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      rotateX: 0,
      transition: {
        type: "spring" as const,
        stiffness: 70,
        damping: 12,
        mass: 1.2
      }
    }
  };

  return (
    <div className={`w-full ${className}`} style={style}>
      {/* Categories - Scrollable Area */}
      <div className="h-full overflow-y-auto pr-2 -mr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-900/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-cyan-500/60 transition-colors">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6 pb-4"
        >
          <AnimatePresence>
            {Object.entries(categorizedTags).map(([category, tags]) => (
              <motion.div key={category} variants={itemVariants} className="flex flex-col gap-3">
                <h4 className="flex items-center gap-3 py-2 px-1">
                  <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-[0.2em]">
                    {t(`tags.categories.${category}`)}
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-900/50 via-cyan-500/20 to-transparent" />
                </h4>
                <div className="flex flex-wrap gap-2 p-1">
                  {tags.map((tag) => {
                    const isActive = selectedTags.includes(tag.name);
                    return (
                      <motion.button
                        key={tag.name}
                        type="button"
                        layout
                        onClick={(e) => {
                          e.preventDefault();
                          toggleTag(tag.name);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                                                    relative group flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-300 border outline-none focus:outline-none ring-0 focus:ring-0
                                                    ${isActive
                            ? 'bg-gradient-to-r from-violet-600 to-blue-600 border-transparent text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                            : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5'
                          }
                                                  `}
                      >
                        <AnimatePresence mode='wait'>
                          {isActive ? (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                            >
                              <Check className="w-3 h-3 text-white drop-shadow-md" strokeWidth={3} />
                            </motion.span>
                          ) : (
                            <span className="w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-3 h-3 text-cyan-400" />
                            </span>
                          )}
                        </AnimatePresence>

                        <span className={isActive ? 'text-white' : ''}>{t(`tags.values.${tag.name}`, tag.name) as string}</span>

                        {/* Hover Glow Effect for non-active */}
                        {!isActive && (
                          <div className="absolute inset-0 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
