import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'motion/react';
import { FiHeart } from 'react-icons/fi';
import { theme } from '../theme';
import { CharacterCard } from './CharacterCard';
import { ShopModal } from './ShopModal';
import { AuthModal } from './AuthModal';
import { PhotoGenerationPage } from './PhotoGenerationPage';
import { Footer } from './Footer';
import { GlobalHeader } from './GlobalHeader';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import '../styles/ContentArea.css';
import { useIsMobile } from '../hooks/useIsMobile';
import DarkVeil from '../../@/components/DarkVeil';
import { BoosterOfferModal } from './BoosterOfferModal';
import { SEOContent } from './SEOContent';

const PAGE_SIZE = 26;

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: white;
  
  @media (max-width: 768px) {
    overflow: visible;
  }
`;

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

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const FooterWrapper = styled.div`
  width: 100%;
  margin-top: auto;
  flex-shrink: 0;
`;

const HeaderWrapper = styled.div`
  position: relative;
  width: 100%;
  background: transparent;
  height: 0;
  min-height: 0;
  flex-shrink: 0;
  overflow: visible;
`;


const NavButton = styled.button`
  background: transparent;
  border: 2px solid;
  border-image: linear-gradient(45deg, #764ba2 50%, #4a0000 50%) 1;
  color: #a8a8a8;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: transform ${theme.transition.fast};
  position: relative;
  
  /* Градиентный текст */
  background: linear-gradient(135deg, #a8a8a8, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  /* Светящаяся линия снизу */
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.8), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(1px);
  }
  
  &:hover {
    transform: scale(1.05);
    border-image: linear-gradient(45deg, #8b5cf6 50%, #7f1d1d 50%) 1;
    
    /* Более яркий градиент при hover */
    background: linear-gradient(135deg, #ffffff, rgba(102, 126, 234, 0.9));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    /* Показываем светящуюся линию */
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.sm};
  border-bottom: 1px solid rgba(130, 130, 130, 0.3);
  background: rgba(15, 15, 15, 0.5);
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 2px solid ${props => props.$active ? 'rgba(102, 126, 234, 0.8)' : 'rgba(70, 70, 70, 0.8)'};
  border-radius: ${theme.borderRadius.md};
  background: ${props => props.$active
    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(76, 81, 191, 0.2) 100%)'
    : 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%)'};
  color: ${props => props.$active ? 'rgba(240, 240, 240, 1)' : 'rgba(160, 160, 160, 1)'};
  font-size: ${theme.fontSize.sm};
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(102, 126, 234, 0.9);
    background: ${props => props.$active
    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(76, 81, 191, 0.3) 100%)'
    : 'linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(22, 22, 22, 1) 100%)'};
    color: rgba(240, 240, 240, 1);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const CharactersGrid = styled.div`
  flex: 1;
  padding: 0 ${theme.spacing.sm} ${theme.spacing.xs};
  overflow-y: visible;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0;
  align-content: start;
  width: 100%;
  min-height: 0;

  @media (max-width: 768px) {
    flex: none;
    overflow-y: visible;
    grid-template-columns: repeat(2, 1fr);
    gap: ${theme.spacing.sm};
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5),
                0 0 40px rgba(139, 92, 246, 0.3),
                0 0 60px rgba(139, 92, 246, 0.2),
                inset 0 0 20px rgba(139, 92, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.7),
                0 0 60px rgba(139, 92, 246, 0.5),
                0 0 90px rgba(139, 92, 246, 0.3),
                inset 0 0 30px rgba(139, 92, 246, 0.2);
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
`;

const CreateCharacterCardWrapper = styled.div`
  position: relative;
  height: 300px;
  width: 100%;
  min-width: 0;
  /* Как у CharacterCard: одна ячейка в сетке, на мобильных компактнее */
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.colors.shadow.message};
  transition: ${theme.transition.fast};
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;

  @media (max-width: 768px) {
    /* Удаляем специфичные стили для мобильных, чтобы карточка была такой же высоты как остальные */
  }

  @media (min-width: 769px) {
    min-width: 200px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
    
    .heart-icon {
      color: #ef4444 !important;
    }
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.lg} ${theme.spacing.sm};
  min-width: 0;
  padding-top: 0;
`;

const HiddenTitle = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const VisibleTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: ${theme.spacing.md} ${theme.spacing.sm};
  text-align: left;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin: ${theme.spacing.sm};
  }
`;

const SubTitle = styled.h2`
  font-size: 0.9rem;
  color: #a8a8a8;
  margin: 0 ${theme.spacing.sm} ${theme.spacing.md};
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin: 0 ${theme.spacing.sm} ${theme.spacing.sm};
  }
`;

const TagFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  padding: 4px ${theme.spacing.sm} 6px;
  border-bottom: 1px solid rgba(130, 130, 130, 0.2);
  background: rgba(15, 15, 15, 0.5);
  margin: 0;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    margin-top: 5%;
  }
`;

const TagFilterButton = styled.button<{ $active?: boolean }>`
  padding: 4px 12px;
  border-radius: 20px;
  background: ${(p) => (p.$active
    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)'
    : 'rgba(20, 20, 25, 0.6)')};
  border: 1px solid ${(p) => (p.$active
    ? 'rgba(6, 182, 212, 0.5)'
    : 'rgba(255, 255, 255, 0.1)')};
  color: ${(p) => (p.$active ? '#22d3ee' : 'rgba(160, 160, 170, 0.9)')};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  outline: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: ${(p) => (p.$active
    ? '0 0 10px rgba(6, 182, 212, 0.2), inset 0 0 10px rgba(6, 182, 212, 0.1)'
    : 'none')};

  &:hover {
    background: ${(p) => (p.$active
    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)'
    : 'rgba(255, 255, 255, 0.1)')};
    border-color: ${(p) => (p.$active ? 'rgba(6, 182, 212, 0.7)' : 'rgba(255, 255, 255, 0.3)')};
    color: ${(p) => (p.$active ? '#67e8f9' : 'white')};
    transform: translateY(-1px);
    box-shadow: ${(p) => (p.$active
    ? '0 4px 15px rgba(6, 182, 212, 0.3), inset 0 0 10px rgba(6, 182, 212, 0.1)'
    : '0 2px 8px rgba(0, 0, 0, 0.2)')};
  }

  &:active {
    transform: translateY(0);
  }
`;

interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  photos?: string[];
  tags: string[];
  author: string;
  likes: number;
  dislikes?: number;
  views: number;
  comments: number;
  is_nsfw?: boolean;
  creator_username?: string;
}

// Mock character data - only originals
const mockCharacters: Character[] = [
  {
    id: 'anna',
    name: 'Anna',
    description: 'Friendly assistant with warm character',
    avatar: 'A',
    photos: [], // Will be filled dynamically
    tags: ['Friendly', 'Assistant'],
    author: 'AI',
    likes: 1200,
    views: 5000,
    comments: 150,
    creator_username: 'AnnaCreator',
  },
  {
    id: 'caitlin',
    name: 'Caitlin',
    description: 'Mysterious and wise mentor',
    avatar: 'C',
    photos: [], // Will be filled dynamically
    tags: ['Wise', 'Mentor'],
    author: 'AI',
    likes: 980,
    views: 4100,
    comments: 90,
    creator_username: 'CaitlinMaster',
  },
  {
    id: '3',
    name: 'Christina',
    description: 'Wise mentor and philosopher',
    avatar: 'C',
    photos: [], // Will be filled dynamically
    tags: ['Mentor', 'Wise'],
    author: 'System',
    likes: 2100,
    views: 28900,
    comments: 67,
    creator_username: 'Philosopher',
  },
  {
    id: '4',
    name: 'Nadya1',
    description: 'Technical expert and programmer',
    avatar: 'N',
    photos: [], // Will be filled dynamically
    tags: ['Programmer', 'Technical'],
    author: 'System',
    likes: 1750,
    views: 19800,
    comments: 54,
    creator_username: 'TechExpert',
  },
];

interface MainPageProps {
  onCharacterSelect?: (character: Character) => void;
  onMyCharacters?: () => void;
  onCreateCharacter?: () => void;
  onShop?: () => void;
  onProfile?: () => void;
  onMessages?: () => void;
  onPhotoGeneration?: (character: Character) => void;
  onPaidAlbum?: (character: Character) => void;
  onEditCharacters?: () => void;
  onFavorites?: () => void;
  onHistory?: () => void;
  onHome?: () => void;
  onPaymentMethod?: (subscriptionType: string) => void;
  contentMode?: 'safe' | 'nsfw';
  onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
  onRegister?: () => void;
  onLogout?: () => void;
  onLogin?: () => void;
}

export const MainPage: React.FC<MainPageProps> = ({
  onCharacterSelect,
  onMyCharacters,
  onCreateCharacter,
  onShop,
  onProfile,
  onMessages,
  onPhotoGeneration,
  onPaidAlbum,
  onEditCharacters,
  onFavorites,
  onHistory,
  onHome,
  onPaymentMethod,
  contentMode = 'safe',
  onContentModeChange,
  onRegister,
  onLogout,
  onLogin
}) => {
  const isMobile = useIsMobile();
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isPhotoGenerationOpen, setIsPhotoGenerationOpen] = useState(false);
  const [createdCharacter, setCreatedCharacter] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{ username: string, coins: number, is_admin?: boolean, id?: number, subscription?: { subscription_type?: string } } | null>(null);
  const [characterPhotos, setCharacterPhotos] = useState<{ [key: string]: string[] }>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cachedRawCharacters, setCachedRawCharacters] = useState<any[]>([]);
  const charactersGridRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());
  const [sortFilter, setSortFilter] = useState<'all' | 'popular'>('popular');
  const [characterRatings, setCharacterRatings] = useState<{ [key: number]: { likes: number, dislikes: number } }>({});

  // Booster Modal State
  const [isBoosterOfferOpen, setIsBoosterOfferOpen] = useState(false);
  const [boosterVariantOverride, setBoosterVariantOverride] = useState<'booster' | 'album_access'>('booster');
  const lastCharactersUpdateRef = useRef<number>(0); // Для отслеживания последнего обновления
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const loadedCharacterIdsRef = useRef<Set<string>>(new Set()); // Для отслеживания уже загруженных ID
  const allCharactersCacheRef = useRef<Character[]>([]); // Кэш всех загруженных персонажей для клиентской пагинации
  const isAllCharactersLoadedRef = useRef<boolean>(false); // Флаг, что все персонажи загружены
  const displayedFromCacheCountRef = useRef<number>(0); // Сколько элементов из отфильтрованного кэша уже показано (избегаем дубликатов при скролле)

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  // При смене safe/nsfw сбрасываем выбранные теги
  // Кэш не сбрасываем, но пересчитываем отображение на основе отфильтрованных данных
  React.useEffect(() => {
    setSelectedTags(new Set());
    // Если кэш уже загружен, просто пересчитываем отображение с новым фильтром
    if (isAllCharactersLoadedRef.current && allCharactersCacheRef.current.length > 0) {
      const filteredCache = allCharactersCacheRef.current.filter((char) => {
        if (contentMode === 'safe') return char.is_nsfw !== true;
        return char.is_nsfw === true;
      });
      const firstPage = filteredCache.slice(0, PAGE_SIZE);
      displayedFromCacheCountRef.current = firstPage.length;
      setCharacters(firstPage);
      setHasMore(filteredCache.length > PAGE_SIZE);
    } else {
      // Если кэш не загружен, загружаем заново
      allCharactersCacheRef.current = [];
      isAllCharactersLoadedRef.current = false;
      loadedCharacterIdsRef.current.clear();
      loadCharacters(true);
    }
  }, [contentMode]);

  const fetchCharactersFromApi = async (
    skip: number,
    limit: number,
    forceRefresh: boolean = false
  ): Promise<any[]> => {
    const endpoints = [
      API_CONFIG.CHARACTERS,
      '/api/v1/characters/',
      '/api/characters/'
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `${endpoint}?skip=${skip}&limit=${limit}&force_refresh=${forceRefresh ? 'true' : 'false'}&_t=${Date.now()}`;

        const response = await fetch(url, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          continue;
        }
        const payload = await response.json();

        if (Array.isArray(payload)) {
          return payload;
        }
        if (payload && Array.isArray(payload.characters)) {
          return payload.characters;
        }
      } catch {
        /* продолжить цикл */
      }
    }
    return [];
  };

  /** Парсит main_photos из сырых данных персонажей, возвращает карту normalizedKey -> url[]. */
  const buildPhotosMapFromBatch = (batch: any[]): { [key: string]: string[] } => {
    const photosMap: { [key: string]: string[] } = {};
    for (const char of batch) {
      if (!char) continue;
      const canonicalName = char.name || char.display_name;
      if (!canonicalName) continue;
      const normalizedKey = canonicalName.toLowerCase();
      let parsed: any[] = [];
      if (char.main_photos) {
        if (Array.isArray(char.main_photos)) {
          parsed = char.main_photos;
        } else if (typeof char.main_photos === 'string' && char.main_photos.trim()) {
          try {
            parsed = JSON.parse(char.main_photos);
          } catch {
            parsed = [];
          }
        }
      }
      const urls = parsed
        .map((photo: any) => {
          if (!photo) return null;
          let photoUrl: string | null = null;
          if (typeof photo === 'object' && photo.url) photoUrl = photo.url;
          else if (typeof photo === 'object' && photo.photo_url) photoUrl = photo.photo_url;
          else if (typeof photo === 'string') {
            photoUrl = photo.startsWith('http') ? photo : `/static/photos/${normalizedKey}/${photo}.png`;
          }
          if (!photoUrl) return null;
          if (photoUrl.includes('storage.yandexcloud.net/')) {
            if (photoUrl.includes('.storage.yandexcloud.net/')) {
              const objectKey = photoUrl.split('.storage.yandexcloud.net/')[1];
              if (objectKey) photoUrl = `${API_CONFIG.BASE_URL}/media/${objectKey}`;
            } else {
              const parts = photoUrl.split('storage.yandexcloud.net/')[1];
              if (parts) {
                const pathSegments = parts.split('/');
                if (pathSegments.length > 1) {
                  photoUrl = `${API_CONFIG.BASE_URL}/media/${pathSegments.slice(1).join('/')}`;
                }
              }
            }
          }
          if (photoUrl && photoUrl.includes('cherrylust.art') && import.meta.env.DEV) {
            photoUrl = `${API_CONFIG.BASE_URL}${photoUrl.replace(/https?:\/\/[^/]+/, '')}`;
          }
          return photoUrl;
        })
        .filter((u): u is string => Boolean(u));
      if (urls.length > 0) photosMap[normalizedKey] = urls;
    }
    return photosMap;
  };

  const rawBatchToCharacters = (
    batch: any[],
    photosMap: { [key: string]: string[] }
  ): Character[] => {
    return batch.map((char: any, index: number) => {
      const rawName = char.name || char.display_name || `character-${index + 1}`;
      const displayName = char.display_name || char.name || rawName;
      const normalizedId = (char.id ?? rawName ?? index).toString();
      const mapKey = rawName.toLowerCase();
      return {
        id: normalizedId,
        name: displayName,
        description: char.description || char.character_appearance || 'No description available',
        avatar: displayName.charAt(0).toUpperCase(),
        photos: photosMap[mapKey] || [],
        tags: Array.isArray(char.tags) && char.tags.length ? char.tags : [],
        author: char.user_id ? 'User' : 'System',
        likes: Number(char.likes) || 0,
        views: Number(char.views) || 0,
        comments: Number(char.comments) || 0,
        is_nsfw: char.is_nsfw === true,
        creator_username: char.creator_username,
        raw: char
      };
    });
  };

  // Загрузка рейтингов персонажей. merge: true — мержить в существующие, иначе заменить.
  const loadCharacterRatings = async (
    charactersList: Character[],
    merge: boolean = false
  ) => {
    const ratings: { [key: number]: { likes: number; dislikes: number } } = {};

    for (const char of charactersList) {
      const characterId = typeof char.id === 'number' ? char.id : parseInt(char.id, 10);
      if (isNaN(characterId)) continue;

      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.GET_CHARACTER_RATINGS(characterId)}`,
          { headers: { 'Cache-Control': 'no-cache' } }
        );

        if (response.ok) {
          const data = await response.json();
          ratings[characterId] = {
            likes: data.likes || 0,
            dislikes: data.dislikes || 0
          };
        }
      } catch {
        /* игнорируем */
      }
    }

    if (merge) {
      setCharacterRatings((prev) => ({ ...prev, ...ratings }));
    } else {
      setCharacterRatings(ratings);
    }
  };

  // Первая страница персонажей (lazy loading).
  // Загружаем ВСЕ персонажи один раз, затем делаем пагинацию на клиенте
  const loadCharacters = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh || characters.length === 0) {
        setIsLoadingCharacters(true);
      }

      // Если уже загружены все персонажи и не требуется обновление, используем кэш
      if (!forceRefresh && isAllCharactersLoadedRef.current && allCharactersCacheRef.current.length > 0) {
        // Фильтруем кэш по contentMode перед показом
        const filteredCache = allCharactersCacheRef.current.filter((char) => {
          if (contentMode === 'safe') return char.is_nsfw !== true;
          return char.is_nsfw === true;
        });

        // Показываем первую страницу отфильтрованных персонажей
        const firstPage = filteredCache.slice(0, PAGE_SIZE);
        displayedFromCacheCountRef.current = firstPage.length;
        setCharacters(firstPage);
        setHasMore(filteredCache.length > PAGE_SIZE);
        setIsLoadingCharacters(false);
        return;
      }

      // Загружаем всех персонажей (запрашиваем большой лимит, чтобы получить все)
      const allBatch = await fetchCharactersFromApi(0, 10000, forceRefresh);

      if (!allBatch.length) {
        setCharacters([]);
        setCachedRawCharacters([]);
        allCharactersCacheRef.current = [];
        isAllCharactersLoadedRef.current = false;
        loadedCharacterIdsRef.current.clear();
        displayedFromCacheCountRef.current = 0;
        setHasMore(false);
        return;
      }

      const photosMap = buildPhotosMapFromBatch(allBatch);
      setCharacterPhotos((prev) => ({ ...prev, ...photosMap }));
      setCachedRawCharacters(allBatch);

      // Удаляем дубликаты по ID и имени
      const uniqueMap = new Map<string, any>();
      for (const char of allBatch) {
        const charId = (char.id ?? char.name ?? '').toString();
        const charName = (char.name ?? char.display_name ?? '').toString().toLowerCase();
        const key = `${charId}:${charName}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, char);
        }
      }
      const uniqueBatch = Array.from(uniqueMap.values());

      const allFormatted = rawBatchToCharacters(uniqueBatch, photosMap);

      // Сохраняем всех персонажей в кэш
      allCharactersCacheRef.current = allFormatted;
      isAllCharactersLoadedRef.current = true;

      // Сбрасываем отслеживание ID при первой загрузке или принудительном обновлении
      if (forceRefresh || characters.length === 0) {
        loadedCharacterIdsRef.current.clear();
      }

      // Отслеживаем загруженные ID и имена
      allFormatted.forEach(char => {
        const charId = char.id.toString();
        const charName = char.name.toLowerCase();
        loadedCharacterIdsRef.current.add(charId);
        loadedCharacterIdsRef.current.add(`name:${charName}`);
      });

      // Фильтруем по contentMode перед показом
      const filteredAll = allFormatted.filter((char) => {
        if (contentMode === 'safe') return char.is_nsfw !== true;
        return char.is_nsfw === true;
      });

      // Показываем первую страницу отфильтрованных персонажей
      const firstPage = filteredAll.slice(0, PAGE_SIZE);
      displayedFromCacheCountRef.current = firstPage.length;
      setCharacters(firstPage);
      setHasMore(filteredAll.length > PAGE_SIZE);

      await loadCharacterRatings(firstPage, false);

      if (Object.keys(characterPhotos).length === 0) {
        await loadCharacterPhotos();
      }
    } catch {
      setCharacters([]);
      setCachedRawCharacters([]);
      allCharactersCacheRef.current = [];
      isAllCharactersLoadedRef.current = false;
      loadedCharacterIdsRef.current.clear();
      displayedFromCacheCountRef.current = 0;
      setHasMore(false);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  // Подгрузка следующей порции при скролле (по 26).
  // Берем следующую порцию из кэша всех загруженных персонажей
  const loadMoreCharacters = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      // Если все персонажи уже загружены в кэш, берем следующую порцию из кэша
      // Но нужно учитывать фильтрацию по contentMode - берем только тех, кто соответствует текущему режиму
      if (isAllCharactersLoadedRef.current && allCharactersCacheRef.current.length > 0) {
        // Фильтруем кэш по contentMode
        const filteredCache = allCharactersCacheRef.current.filter((char) => {
          if (contentMode === 'safe') return char.is_nsfw !== true;
          return char.is_nsfw === true;
        });

        const start = displayedFromCacheCountRef.current;
        const nextPage = filteredCache.slice(start, start + PAGE_SIZE);

        if (nextPage.length === 0) {
          setHasMore(false);
          return;
        }

        displayedFromCacheCountRef.current = start + nextPage.length;
        setCharacters((prev) => [...prev, ...nextPage]);
        setHasMore(displayedFromCacheCountRef.current < filteredCache.length);

        await loadCharacterRatings(nextPage, true);
        return;
      }

      // Если кэш еще не заполнен (старая логика для совместимости)
      const skip = characters.length;
      const batch = await fetchCharactersFromApi(skip, PAGE_SIZE, false);

      if (!batch.length) {
        setHasMore(false);
        return;
      }

      const photosMap = buildPhotosMapFromBatch(batch);
      setCharacterPhotos((prev) => ({ ...prev, ...photosMap }));

      // Фильтруем дубликаты перед добавлением
      const uniqueBatch = batch.filter((char: any) => {
        const charId = (char.id ?? char.name ?? '').toString();
        const charName = (char.name ?? char.display_name ?? '').toString().toLowerCase();
        const idKey = charId;
        const nameKey = `name:${charName}`;
        return !loadedCharacterIdsRef.current.has(idKey) && !loadedCharacterIdsRef.current.has(nameKey);
      });

      // Если все персонажи из batch уже загружены, значит больше нет новых
      if (uniqueBatch.length === 0) {
        setHasMore(false);
        return;
      }

      setCachedRawCharacters((prev) => [...prev, ...uniqueBatch]);

      const formatted = rawBatchToCharacters(uniqueBatch, photosMap);

      // Отслеживаем новые ID и имена
      formatted.forEach(char => {
        const charId = char.id.toString();
        const charName = char.name.toLowerCase();
        loadedCharacterIdsRef.current.add(charId);
        loadedCharacterIdsRef.current.add(`name:${charName}`);
      });

      setCharacters((prev) => [...prev, ...formatted]);
      setHasMore(uniqueBatch.length === PAGE_SIZE);

      await loadCharacterRatings(formatted, true);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, characters.length, contentMode]);

  // Загрузка фото только из /photos и character-photos.json (без fetch всех персонажей).
  // Мержим в characterPhotos только если ключа ещё нет — main_photos из пагинированных ответов не перезаписываем.
  const loadCharacterPhotos = async () => {
    try {
      const photosMap: { [key: string]: string[] } = {};

      try {
        const photosResponse = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/photos`);
        if (photosResponse.ok) {
          const apiPhotos = await photosResponse.json();
          for (const [key, photos] of Object.entries(apiPhotos)) {
            const normalizedKey = key.toLowerCase();
            if (Array.isArray(photos) && photos.length > 0) {
              photosMap[normalizedKey] = photos as string[];
            }
          }
        }
      } catch {
        /* игнорируем */
      }

      try {
        const response = await fetch('/character-photos.json');
        if (response.ok) {
          const jsonPhotos = await response.json();
          for (const [key, photos] of Object.entries(jsonPhotos)) {
            const normalizedKey = key.toLowerCase();
            if (Array.isArray(photos) && photos.length > 0) {
              if (!photosMap[normalizedKey] || photosMap[normalizedKey].length === 0) {
                photosMap[normalizedKey] = photos as string[];
              }
            }
          }
        }
      } catch {
        /* игнорируем */
      }

      setCharacterPhotos((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(photosMap)) {
          if (!next[k] || next[k].length === 0) next[k] = photosMap[k];
        }
        return next;
      });
    } catch {
      /* игнорируем */
    }
  };

  // Lazy load: подгрузка следующей порции при скролле к sentinel.
  React.useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && !isLoadingCharacters && hasMore) {
          loadMoreCharacters();
        }
      },
      { root: null, rootMargin: '500px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoadingCharacters, loadMoreCharacters]);

  // Загрузка доступных тегов для фильтра
  React.useEffect(() => {
    const loadTags = async () => {
      try {
        const url = `${API_CONFIG.BASE_URL}/api/v1/characters/available-tags`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // Приводим к формату {name, slug} если пришла просто строка (для обратной совместимости)
          const formattedTags = Array.isArray(data) ? data.map(tag => typeof tag === 'string' ? { name: tag, slug: tag } : tag) : [];

          // Удаляем дубликаты
          const uniqueTagsMap = new Map();
          formattedTags.forEach(tag => {
            if (!uniqueTagsMap.has(tag.name)) {
              uniqueTagsMap.set(tag.name, tag);
            }
          });

          setAvailableTags(Array.from(uniqueTagsMap.values()));
        }
      } catch {
        setAvailableTags([]);
      }
    };
    loadTags();
  }, []);

  // Автоматическое обновление фотографий каждые 30 секунд
  React.useEffect(() => {
    const loadData = async () => {
      // Всегда загружаем с принудительным обновлением при первой загрузке
      // Сначала загружаем персонажей, потом фото
      await loadCharacters(true); // forceRefresh = true
      // Небольшая задержка для гарантии обновления кэша
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadCharacterPhotos();
    };

    loadData();

    const interval = setInterval(() => {
      loadCharacterPhotos();
    }, 30000); // Обновляем каждые 30 секунд

    // Слушаем события обновления фото персонажа и создания персонажа
    const handlePhotoUpdate = async (event?: Event) => {
      const customEvent = event as CustomEvent;
      const characterName = customEvent?.detail?.character_name;

      // Даем время бэкенду сохранить изменения и очистить кэш
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Принудительно перезагружаем данные, игнорируя кэш
      // Сначала загружаем персонажей, потом фото
      await loadCharacters(true); // forceRefresh = true
      // Небольшая задержка перед загрузкой фото, чтобы данные точно обновились
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadCharacterPhotos();
    };

    const handleCharacterCreated = async (event: Event) => {
      const customEvent = event as CustomEvent;

      // Даем время бэкенду сохранить персонажа и очистить кэш (увеличена задержка)
      await new Promise(resolve => setTimeout(resolve, 2500));
      // Принудительно перезагружаем персонажей из API, игнорируя кэш
      await loadCharacters(true); // forceRefresh = true
      await loadCharacterPhotos();
    };

    const handleCharacterUpdated = async () => {
      const now = Date.now();
      if (now - lastCharactersUpdateRef.current < 2000) return;
      lastCharactersUpdateRef.current = now;
      await new Promise((r) => setTimeout(r, 500));
      await loadCharacters(true);
    };

    window.addEventListener('character-photos-updated', handlePhotoUpdate);
    window.addEventListener('character-created', handleCharacterCreated);
    window.addEventListener('character-updated', handleCharacterUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('character-photos-updated', handlePhotoUpdate);
      window.removeEventListener('character-created', handleCharacterCreated);
      window.removeEventListener('character-updated', handleCharacterUpdated);
    };
  }, [contentMode]); // Убираем зависимости от функций

  // Проверка авторизации при загрузке
  React.useEffect(() => {
    // Проверяем токены в URL параметрах (после OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Сохраняем токены через authManager
      authManager.setTokens(accessToken, refreshToken);

      // Очищаем URL от токенов
      window.history.replaceState({}, document.title, window.location.pathname);

      // Проверяем авторизацию
      checkAuth();
    } else {
      // Обычная проверка авторизации
      checkAuth();
    }

    // Загружаем фотографии персонажей
    loadCharacterPhotos();
  }, []);

  // Загружаем список избранных персонажей
  const loadFavorites = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setFavoriteCharacterIds(new Set());
        return;
      }

      const response = await fetch(API_CONFIG.FAVORITES, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const favorites = await response.json();
        // Извлекаем ID избранных персонажей
        const favoriteIds = new Set<number>(
          favorites.map((char: any) => {
            const id = typeof char.id === 'number' ? char.id : parseInt(char.id, 10);
            return isNaN(id) ? null : id;
          }).filter((id: number | null): id is number => id !== null)
        );
        setFavoriteCharacterIds(favoriteIds);
      } else {
        setFavoriteCharacterIds(new Set());
      }
    } catch (error) {

      setFavoriteCharacterIds(new Set());
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        // Нет токена - пользователь не авторизован
        setIsAuthenticated(false);
        setUserInfo(null);
        setFavoriteCharacterIds(new Set());
        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData) {
          setIsAuthenticated(true);
          setUserCoins(userData.coins || 0);
          setUserInfo({
            username: userData.username || userData.email || 'Пользователь',
            coins: userData.coins || 0,
            is_admin: userData.is_admin || false,
            id: userData.id,
            subscription: userData.subscription || { subscription_type: userData.subscription_type || 'free' }
          });
          // Загружаем избранные после успешной авторизации
          await loadFavorites();
        } else {

          setIsAuthenticated(false);
          setUserInfo(null);
          setFavoriteCharacterIds(new Set());
        }
      } else if (response.status === 401) {
        // Только при 401 (Unauthorized) пытаемся обновить токен
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch('/api/v1/auth/refresh/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (refreshResponse.ok) {
              const tokenData = await refreshResponse.json();
              authManager.setTokens(tokenData.access_token, tokenData.refresh_token);
              // Повторяем проверку авторизации с новым токеном
              await checkAuth();
              return;
            }
          } catch (refreshError) {

          }
        }
        // Если refresh не удался, удаляем токены
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUserInfo(null);
        setFavoriteCharacterIds(new Set());
      } else {
        // Для других ошибок (500, 502, и т.д.) не удаляем токены, только сбрасываем состояние

        setIsAuthenticated(false);
        setUserInfo(null);
        setFavoriteCharacterIds(new Set());
      }
    } catch (error) {
      // При сетевых ошибках не удаляем токены
      if (localStorage.getItem('authToken')) {

      }
      setIsAuthenticated(false);
      setUserInfo(null);
      setFavoriteCharacterIds(new Set());
    }
  };

  const handleCharacterClick = (character: Character) => {
    // Переходим к чату с выбранным персонажем

    if (onCharacterSelect) {
      onCharacterSelect(character);
    }
  };

  // Обработчик удаления персонажа (для админов и создателей персонажей)
  const handleDeleteCharacter = async (character: Character) => {
    const characterName = character.name || (character as any).raw?.name;
    if (!characterName) {

      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить персонажа "${characterName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {

        return;
      }

      // КРИТИЧНО: Используем ID для удаления, если он доступен
      const identifier = character.id?.toString() || characterName;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(identifier)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {

        // Обновляем список персонажей
        await loadCharacters(true);
        // Отправляем событие для обновления других страниц
        window.dispatchEvent(new CustomEvent('character-deleted', {
          detail: { characterName }
        }));
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));

        alert(`Ошибка удаления персонажа: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (error) {

      alert('Ошибка при удалении персонажа. Попробуйте позже.');
    }
  };

  // Проверяем, может ли пользователь удалить персонажа (админ или создатель)
  const canDeleteCharacter = (character: Character): boolean => {
    if (!userInfo || !isAuthenticated) {
      return false;
    }

    // Админы могут удалять всех персонажей
    if (userInfo.is_admin === true) {
      return true;
    }

    // Создатели могут удалять только своих персонажей
    const characterUserId = (character as any).raw?.user_id || (character as any).user_id;
    const currentUserId = userInfo.id;

    // Проверяем совпадение ID (конвертируем в числа для надежности)
    if (characterUserId !== undefined && currentUserId !== undefined) {
      const charUserIdNum = Number(characterUserId);
      const currUserIdNum = Number(currentUserId);
      if (!isNaN(charUserIdNum) && !isNaN(currUserIdNum) && charUserIdNum === currUserIdNum) {
        return true;
      }
    }

    return false;
  };

  const handleCreateCharacter = () => {
    if (onCreateCharacter) {
      onCreateCharacter();
    }
  };

  const handleShop = () => {
    setIsShopModalOpen(true);
  };

  const handleLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleRegister = () => {
    if (onRegister) {
      onRegister();
    } else {
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
    }
  };

  const handleLogout = () => {
    // Удаляем токен из localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    // Перезагружаем страницу для обновления состояния
    window.location.reload();
  };

  const handleAuthSuccess = (accessToken: string, refreshToken?: string) => {
    authManager.setTokens(accessToken, refreshToken);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    checkAuth(); // Обновляем информацию о пользователе
  };

  const handleBackFromPhotoGeneration = () => {
    setIsPhotoGenerationOpen(false);
    setCreatedCharacter(null);
  };

  const handleActivateSubscription = async (subscriptionType: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Must be logged in');

    const response = await fetch('/api/v1/subscription/activate/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription_type: subscriptionType
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Ошибка активации подписки');
    }

    // Обновляем статистику
    await checkAuth();
  };

  // Мемоизация нормализованных тегов выбранных тегов (один раз, не в цикле).
  const normalizedSelectedTags = useMemo(() => {
    if (selectedTags.size === 0) return new Set<string>();
    const normalized = (arr: string[]) =>
      arr.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
    return new Set(normalized(Array.from(selectedTags)));
  }, [selectedTags]);

  // Объединяем персонажей с фотографиями, рейтингами, фильтрами по contentMode и тегам (логика AND).
  // Оптимизация: нормализация selectedTags вынесена наружу, используется Set для O(1) поиска.
  const charactersWithPhotos = useMemo(() => {
    const normalizeTag = (tag: string) => String(tag).trim().toLowerCase();
    const normalizeTags = (arr: string[]) => {
      const set = new Set<string>();
      for (const t of arr) {
        const norm = normalizeTag(t);
        if (norm) set.add(norm);
      }
      return set;
    };

    return characters
      .map((character) => {
        const characterId = typeof character.id === 'number' ? character.id : parseInt(character.id, 10);
        const rating = !isNaN(characterId) ? characterRatings[characterId] : null;
        return {
          ...character,
          photos: characterPhotos[character.name.toLowerCase()] || [],
          likes: rating ? rating.likes : character.likes || 0,
          dislikes: rating ? rating.dislikes : character.dislikes || 0
        };
      })
      .filter((character) => {
        if (contentMode === 'safe') return character.is_nsfw !== true;
        return character.is_nsfw === true;
      })
      .filter((character) => {
        if (normalizedSelectedTags.size === 0) return true;
        const charTags = character.tags && Array.isArray(character.tags) ? character.tags : [];
        const charTagsSet = normalizeTags(charTags);
        // Проверка: все выбранные теги должны быть в тегах персонажа (логика AND).
        for (const selectedTag of normalizedSelectedTags) {
          if (!charTagsSet.has(selectedTag)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Сначала те, у кого есть фото
        const aHasPhotos = a.photos && a.photos.length > 0 ? 1 : 0;
        const bHasPhotos = b.photos && b.photos.length > 0 ? 1 : 0;
        if (aHasPhotos !== bHasPhotos) return bHasPhotos - aHasPhotos;

        // Затем оригинальные
        const isOriginal = (char: any) => {
          const tags = char.tags || [];
          return tags.some((t: any) => {
            const name = typeof t === 'string' ? t : (t.name || '');
            return name.toLowerCase() === 'original' || name.toLowerCase() === 'оригинальный';
          });
        };

        const aOrig = isOriginal(a) ? 1 : 0;
        const bOrig = isOriginal(b) ? 1 : 0;

        if (aOrig !== bOrig) return bOrig - aOrig;

        // Затем по лайкам
        const aLikes = a.likes || 0;
        const bLikes = b.likes || 0;
        if (aLikes !== bLikes) return bLikes - aLikes;

        // Затем по сообщениям
        const aMsgs = (a.comments || a.views || 0);
        const bMsgs = (b.comments || b.views || 0);
        return bMsgs - aMsgs;
      });
  }, [characters, contentMode, normalizedSelectedTags, characterPhotos, characterRatings, sortFilter]);

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <ContentWrapper>
        <HeaderWrapper>
          <GlobalHeader
            onShop={onShop || handleShop}
            onProfile={onProfile}
            onLogin={onLogin || handleLogin}
            onRegister={onRegister || handleRegister}
            onLogout={onLogout}
            onHome={onHome}
          />
        </HeaderWrapper>
        {!isPhotoGenerationOpen && availableTags.length > 0 && (
          <TagFilterBar>
            {availableTags.map((tagObj) => (
              <TagFilterButton
                key={tagObj.slug || tagObj.name}
                type="button"
                $active={selectedTags.has(tagObj.name)}
                onClick={() => {
                  const slug = tagObj.slug;
                  if (slug) {
                    window.history.pushState({ page: 'tags', slug }, '', `/tags/${slug}`);
                    // Будет обрабатываться в попстейт или через глобальное событие
                    window.dispatchEvent(new CustomEvent('navigate-to-tags', { detail: { slug } }));
                  } else {
                    toggleTag(tagObj.name);
                  }
                }}
              >
                {tagObj.name}
              </TagFilterButton>
            ))}
          </TagFilterBar>
        )}
        <ContentArea>
          {isPhotoGenerationOpen && createdCharacter ? (
            <PhotoGenerationPage
              character={createdCharacter}
              onBackToMain={handleBackFromPhotoGeneration}
              onCreateCharacter={handleCreateCharacter}
              onShop={handleShop}
            />
          ) : (
            <>
              <CharactersGrid ref={charactersGridRef}>
                {isLoadingCharacters ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#a8a8a8' }}>
                    Loading characters...
                  </div>
                ) : (
                  <>
                    <CreateCharacterCardWrapper
                      onClick={() => onCreateCharacter && onCreateCharacter()}
                    >
                      {/* Фон DarkVeil */}
                      <div style={{ position: 'absolute', inset: 0, borderRadius: theme.borderRadius.lg, overflow: 'hidden', pointerEvents: 'none' }}>
                        <DarkVeil speed={1.1} />
                      </div>

                      {/* Glassmorphism слой поверх фона */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                        backdropFilter: 'blur(12px)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: theme.borderRadius.lg,
                        transition: 'all 0.3s ease',
                        pointerEvents: 'none'
                      }} />

                      {/* Контент */}
                      <div style={{
                        position: 'relative',
                        zIndex: 10,
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: theme.spacing.md,
                        padding: theme.spacing.md
                      }}>
                        {/* Анимированная иконка сердечка */}
                        <motion.div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
                          }}
                          animate={{
                            scale: [1, 1.08, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <motion.div
                            className="heart-icon"
                            style={{ color: 'white', transition: 'color 0.3s ease' }}
                            animate={{
                              opacity: [0.9, 1, 0.9]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <FiHeart style={{ width: '30px', height: '30px' }} />
                          </motion.div>
                        </motion.div>

                        {/* Текст */}
                        <h3 style={{
                          fontSize: theme.fontSize.lg,
                          fontWeight: 600,
                          color: 'white',
                          textAlign: 'center',
                          margin: 0,
                          padding: `0 ${theme.spacing.sm}`
                        }}>
                          Создай персонажа
                        </h3>
                      </div>
                    </CreateCharacterCardWrapper>
                    {charactersWithPhotos.map((character) => {
                      const characterId = typeof character.id === 'number'
                        ? character.id
                        : parseInt(character.id, 10);
                      const isFavorite = !isNaN(characterId) && favoriteCharacterIds.has(characterId);
                      const canDelete = canDeleteCharacter(character);
                      const deleteHandler = canDelete ? handleDeleteCharacter : undefined;

                      return (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          onClick={handleCharacterClick}
                          isAuthenticated={isAuthenticated}
                          onPhotoGeneration={onPhotoGeneration}
                          onPaidAlbum={(character) => {
                            if (onPaidAlbum) {
                              // If external handler provided, use it relative to subscription status
                              const subType = userInfo?.subscription?.subscription_type?.toLowerCase() || 'free';
                              if (subType !== 'standard' && subType !== 'premium') {
                                setBoosterVariantOverride('album_access');
                                setIsBoosterOfferOpen(true);
                              } else {
                                // Standard/Premium logic
                                onPaidAlbum(character);
                              }
                            }
                          }}
                          isFavorite={isFavorite}
                          onFavoriteToggle={loadFavorites}
                          onDelete={deleteHandler}
                          userInfo={userInfo}
                          onNsfwToggle={async () => {
                            await loadCharacters();
                          }}
                        />
                      );
                    })}
                    {!isLoadingCharacters && hasMore && (
                      <div
                        ref={loadMoreSentinelRef}
                        style={{
                          gridColumn: '1 / -1',
                          height: '100px',
                          minHeight: '100px',
                          width: '100%',
                          opacity: 0,
                          pointerEvents: 'none',
                          position: 'relative'
                        }}
                        aria-hidden="true"
                      />
                    )}
                    {isLoadingMore && (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          textAlign: 'center',
                          padding: '1rem',
                          color: '#a8a8a8',
                          fontSize: '0.9rem'
                        }}
                      >
                        Загрузка...
                      </div>
                    )}
                  </>
                )}
              </CharactersGrid>

              <ShopModal
                isOpen={isShopModalOpen}
                onClose={() => setIsShopModalOpen(false)}
                isAuthenticated={isAuthenticated}
                onActivateSubscription={onPaymentMethod ? async (type: string) => {
                  if (onPaymentMethod) {
                    onPaymentMethod(type);
                  }
                } : handleActivateSubscription}
              />

              <BoosterOfferModal
                isOpen={isBoosterOfferOpen}
                onClose={() => setIsBoosterOfferOpen(false)}
                limitType="photos"
                onShop={() => {
                  setIsBoosterOfferOpen(false);
                  setIsShopModalOpen(true);
                }}
                variant={boosterVariantOverride}
              />

              {isAuthModalOpen && (
                <AuthModal
                  isOpen={isAuthModalOpen}
                  onClose={() => setIsAuthModalOpen(false)}
                  onAuthSuccess={handleAuthSuccess}
                  mode={authModalMode}
                />
              )}
            </>
          )}
        </ContentArea>
        <SEOContent>
          <h1>Cherry Lust — Эксклюзивный AI чат с персонажами 18+</h1>
          <h2>Виртуальное общение с нейросетью нового поколения</h2>
          <p>
            Cherry Lust — это инновационный AI чат-бот для взрослых, который предлагает
            уникальное виртуальное общение с персонажами, созданными нейросетью.
            Наш ролевой чат позволяет вам общаться с AI собеседниками, которые обладают
            уникальными характерами и могут поддержать любую беседу.
          </p>
          <h2>Возможности AI чата</h2>
          <p>
            Платформа Cherry Lust предоставляет широкий спектр функций для виртуального общения:
          </p>
          <ul>
            <li>Безлимитное общение с виртуальными персонажами без цензуры</li>
            <li>Генерация изображений с помощью нейросети в реальном времени</li>
            <li>Голосовые сообщения от AI собеседников с уникальными голосами</li>
            <li>Создание собственных персонажей с настройкой внешности и характера</li>
            <li>Ролевые сценарии и интерактивные диалоги</li>
            <li>Приватные чаты с полной конфиденциальностью</li>
          </ul>
          <h2>Почему выбирают Cherry Lust</h2>
          <p>
            Наш AI чат использует передовые технологии нейросетей для создания реалистичного
            виртуального общения. Каждый персонаж обладает уникальной личностью, стилем общения
            и может адаптироваться к вашим предпочтениям. Генерация изображений AI позволяет
            визуализировать персонажей и создавать уникальный контент.
          </p>
        </SEOContent>
        <FooterWrapper>
          <Footer />
        </FooterWrapper>
      </ContentWrapper>
    </MainContainer>
  );
};
