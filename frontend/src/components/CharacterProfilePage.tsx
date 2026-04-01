import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, Share2, Flag, Calendar,
  MessageSquare, Users, Heart, ArrowLeft, Loader2, Lock, Unlock, Zap,
  Brain, Sparkles, Activity, Shield, Info, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import { Helmet } from 'react-helmet-async';
import { authManager } from '../utils/auth';
import { API_CONFIG, getMediaUrl } from '../config/api';
import DarkVeil from '../../@/components/DarkVeil';

interface CharacterProfilePageProps {
  onStartChat: (character: any) => void;
  onBackToMain: () => void;
  onPaidAlbum?: (character: any) => void;
}

const getTagEmoji = (tagName: string) => {
  const lower = tagName.toLowerCase();
  if (lower.includes('nsfw') || lower.includes('adult') || lower.includes('18+')) return '🔥';
  if (lower.includes('female') || lower.includes('женск') || lower.includes('девушка')) return '🔥';
  if (lower.includes('anime') || lower.includes('аниме')) return '🎌';
  if (lower.includes('russian') || lower.includes('русск')) return '🇷🇺';
  if (lower.includes('english') || lower.includes('англ')) return '🇺🇸';
  if (lower.includes('original') || lower.includes('оригинал')) return '⭐';
  return '';
};

const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

export const CharacterProfilePage: React.FC<CharacterProfilePageProps> = ({ onStartChat, onBackToMain, onPaidAlbum }) => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('common');

  const pathParts = location.pathname.split('/');
  const langInUrl = pathParts[1];
  const currentLang = ['ru', 'en'].includes(langInUrl) ? langInUrl : (i18n.language?.split('-')[0] || 'ru');

  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);


  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = authManager.getToken();
        if (!token) return;
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.is_admin === true);
        }
      } catch (e) { }
    }
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!characterId) return;
    setLoading(true);
    setError(null);

    const fetchCharacter = async () => {
      try {
        const token = authManager.getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(characterId)}/with-creator`,
          { headers }
        );

        if (!res.ok) {
          const res2 = await fetch(
            `${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(characterId)}`,
            { headers }
          );
          if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
          const data2 = await res2.json();
          setCharacter(data2);
        } else {
          const data = await res.json();
          setCharacter(data);
        }
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [characterId]);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/available-tags`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const map = new Map<string, any>();
        data.forEach(tag => {
          const name = typeof tag === 'string' ? tag : tag.name;
          if (name && !map.has(name)) map.set(name, typeof tag === 'string' ? { name, slug: name } : tag);
        });
        setAvailableTags(Array.from(map.values()));
      })
      .catch(() => { });
  }, []);

  const displayName = useMemo(() => {
    if (!character) return '';
    return character.translations?.[currentLang]?.name
      || character[`name_${currentLang}`]
      || character.display_name
      || character.name
      || (currentLang === 'en' ? 'Elena' : 'Елена');
  }, [character, currentLang]);

  const createdAt = useMemo(() => {
    const raw = character?.created_at || '2026-03-30T00:00:00.000Z';
    try {
      const formatted = new Intl.DateTimeFormat(currentLang === 'en' ? 'en-US' : 'ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date(raw));
      return currentLang === 'ru' ? formatted + ' г.' : formatted;
    } catch { return String(raw); }
  }, [character?.created_at, currentLang]);

  const parsedPhotos = useMemo(() => {
    if (!character) return [];
    const allUrls = new Set<string>();

    const processAny = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(v => {
          const url = typeof v === 'object' && v !== null ? (v.url || v.path || v) : v;
          if (typeof url === 'string') allUrls.add(url);
        });
      } else if (typeof val === 'string') {
        if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(val);
            processAny(parsed);
            return;
          } catch { }
        }
        val.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) allUrls.add(trimmed);
        });
      }
    };

    processAny(character.main_photos);
    processAny(character.photos);

    const result = Array.from(allUrls);
    console.log('[DEBUG] parsedPhotos result:', result);
    return result;
  }, [character]);

  const parsedPaidPhotos = useMemo(() => {
    if (!character?.paid_album_preview_urls) return [];
    const urls: string[] = [];
    const val = character.paid_album_preview_urls;

    if (Array.isArray(val)) {
      val.forEach(v => {
        const u = typeof v === 'object' && v !== null ? (v.url || v.path || v) : v;
        if (typeof u === 'string') urls.push(u);
      });
    } else if (typeof val === 'string') {
      if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach(v => {
              const u = typeof v === 'object' && v !== null ? (v.url || v.path || v) : v;
              if (typeof u === 'string') urls.push(u);
            });
          }
        } catch { }
      } else {
        val.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) urls.push(trimmed);
        });
      }
    }
    console.log('[DEBUG] parsedPaidPhotos result:', urls);
    return urls;
  }, [character?.paid_album_preview_urls]);

  const getCleanMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return getMediaUrl(url);
  };

  const avatarUrl = useMemo(() => {
    if (!character) return '';
    const raw = parsedPhotos[0] || character.avatar || '';
    return raw ? getCleanMediaUrl(raw) : '';
  }, [character, parsedPhotos]);

  const metaDescription = useMemo(() => {
    if (!character) return '';
    const lore = currentLang === 'en' ? (character.seo_lore_en || character.seo_lore_ru) : (character.seo_lore_ru || character.seo_lore_en);
    if (lore) {
      const plain = lore.replace(/[#*`\[\]]/g, '');
      return plain.substring(0, 160).trim() + '...';
    }
    return (character.description || '').substring(0, 160);
  }, [character, currentLang]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: displayName, url: window.location.href }).catch(() => { });
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => { });
    }
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-transparent">
        <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin" />
        <p className="text-gray-400 animate-pulse text-sm">
          {currentLang === 'en' ? 'Loading character...' : 'Загрузка персонажа...'}
        </p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-transparent">
        <p className="text-red-400 text-lg">
          {currentLang === 'en' ? 'Character not found' : 'Персонаж не найден'}
        </p>
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : onBackToMain()}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentLang === 'en' ? 'Back' : 'Назад'}
        </button>
      </div>
    );
  }

  const messagesCount = character.total_messages_count ?? 16;

  return (
    <div className="min-h-screen text-[#f4f4f5] pb-24 font-['Inter',sans-serif] selection:bg-purple-500/30 overflow-x-hidden relative">
      <Helmet>
        <title>{`${displayName} - AI Roleplay Story & Lore`}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={`${displayName} - AI Roleplay Story & Lore`} />
        <meta property="og:description" content={metaDescription} />
        {avatarUrl && <meta property="og:image" content={avatarUrl} />}
        <link rel="alternate" hrefLang="ru" href={`https://candygirlschat.com/ru/character/${encodeURIComponent(character.slug || character.name)}`} />
        <link rel="alternate" hrefLang="en" href={`https://candygirlschat.com/en/character/${encodeURIComponent(character.slug || character.name)}`} />
        <link rel="alternate" hrefLang="x-default" href={`https://candygirlschat.com/ru/character/${encodeURIComponent(character.slug || character.name)}`} />
      </Helmet>

      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>

      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-12 pt-8 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          <aside className="lg:col-span-4 lg:sticky lg:top-8 flex flex-col gap-4 self-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-5 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent pointer-events-none" />

              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-xl cursor-zoom-in flex-shrink-0"
                  onClick={() => setExpandedImage(avatarUrl)}
                >
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-black text-white font-serif tracking-tight leading-none truncate mb-1">{displayName}</h1>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 opacity-70">
                    {character.creator_username || 'AI Persona'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onStartChat(character)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  {currentLang === 'en' ? 'Start Chat' : 'Начать чат'}
                </motion.button>

                <div className="flex gap-2">
                  <button onClick={handleShare} className="flex-1 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex justify-center transition-all">
                    <Share2 className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{currentLang === 'en' ? 'Created' : 'Создано'}</span>
                  <span className="text-[10px] font-bold text-white/70">{createdAt}</span>
                </div>
                <div className="flex flex-col items-center border-l border-white/5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{currentLang === 'en' ? 'Msgs' : 'Сообщ.'}</span>
                  <span className="text-xs font-black text-white">{formatCount(messagesCount)}</span>
                </div>
              </div>
            </motion.div>

            {/* Side Gallery */}
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center gap-3 px-1">
                <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">
                  <Lock className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <h2 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">
                  {currentLang === 'en' ? 'Private Album' : 'Приватный альбом'}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                {(() => {
                  const displayPhotos = [...parsedPaidPhotos];
                  parsedPhotos.forEach(p => {
                    if (displayPhotos.length < 12 && !displayPhotos.includes(p)) {
                      displayPhotos.push(p);
                    }
                  });

                  return displayPhotos.map((img: any, idx: number) => {
                    const url = getCleanMediaUrl(typeof img === 'object' ? img.url || img.path : img);
                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="aspect-[3/4] rounded-2xl overflow-hidden relative group cursor-pointer border border-white/10 bg-zinc-900/40"
                        onClick={() => onPaidAlbum ? onPaidAlbum(character) : navigate(`/${currentLang}/chat/${encodeURIComponent(character?.name || character?.id || '')}`)}
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover blur-[8px] opacity-40 group-hover:opacity-60 transition-all duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-8 flex flex-col gap-12">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-5 md:p-8 shadow-2xl w-full"
            >
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentLang === 'en' ? (character?.seo_lore_en || character?.seo_lore_ru || '') : (character?.seo_lore_ru || character?.seo_lore_en || '')}
                </ReactMarkdown>
              </div>
            </motion.section>
          </main>

        </div>
      </div>

      {/* Expanded Image Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 cursor-zoom-out"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center max-w-6xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={expandedImage}
                className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10"
              />
              <button
                className="absolute top-8 right-8 p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                onClick={() => setExpandedImage(null)}
              >
                <ArrowLeft className="w-6 h-6 rotate-90 md:rotate-0" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CharacterProfilePage;
