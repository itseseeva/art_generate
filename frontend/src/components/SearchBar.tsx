import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiUser } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSearch, SearchResult } from '../hooks/useSearch';
import { API_CONFIG } from '../config/api';

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 300px;
  margin-left: 20px;
  z-index: 1001;

  @media (max-width: 768px) {
    display: none; // Hide on mobile for now or implement mobile view
  }
`;

const SearchInputWrapper = styled.div<{ $isFocused: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  background: ${props => props.$isFocused ? 'rgba(30, 30, 40, 0.9)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$isFocused ? 'rgba(100, 100, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  padding: 0 15px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  font-size: 14px;
  margin-left: 10px;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const ResultsDropdown = styled(motion.div)`
  position: absolute;
  top: 50px;
  left: 0;
  width: 100%;
  background: rgba(18, 18, 28, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  max-height: 400px;
  overflow-y: auto;
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 15px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Avatar = styled.div<{ $src?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-image: ${props => props.$src ? `url(${props.$src})` : 'none'};
  background-color: rgba(255, 255, 255, 0.1);
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ResultName = styled.span`
  font-size: 14px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultType = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
`;

const NoResults = styled.div`
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const LoadingSpinner = styled(motion.div)`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #646cff;
  border-radius: 50%;
`;

export const SearchBar: React.FC = () => {
    const { t, i18n } = useTranslation('common');
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce logic moved here or imported from useSearch if we used the hook exactly
    // But since useSearch hook from previous step had its own state, let's adapt it
    // Actually, I'll rewrite useSearch logic here directly or use the hook properly.
    // The hook in previous step returns `results`, `query`, `setQuery`.

    // Let's use the hook I created.
    // Wait, the hook I created returns everything needed.
    // I need to import it.

    // Re-implementing simplified logic here to ensure it works with UI component structure matches
    // because I might have missed exporting `useSearch` properly or types.
    // Let's assume `useSearch` is available and works as implemented.

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Custom fetch logic to avoid hook complexity mismatch for now
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setIsLoading(true);
            try {
                const url = `${API_CONFIG.BASE_URL}/api/v1/search/?q=${encodeURIComponent(query)}&limit=10`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        const currentLang = i18n.language || 'ru';
        if (result.type === 'character') {
            navigate(`/${currentLang}/chat/${result.id}`);
        } else if (result.type === 'user') {
            navigate(`/${currentLang}/profile/${result.id}`);
        }
        setIsFocused(false);
        setQuery('');
    };

    return (
        <SearchContainer ref={containerRef}>
            <SearchInputWrapper $isFocused={isFocused}>
                <FiSearch color={isFocused ? "#646cff" : "rgba(255, 255, 255, 0.4)"} />
                <SearchInput
                    placeholder={t('search.placeholder', 'Поиск...')}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsFocused(true);
                    }}
                    onFocus={() => setIsFocused(true)}
                />
                {query && (
                    <FiX
                        color="rgba(255, 255, 255, 0.4)"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setQuery('')}
                    />
                )}
            </SearchInputWrapper>

            <AnimatePresence>
                {isFocused && query.length >= 2 && (
                    <ResultsDropdown
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isLoading ? (
                            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                                <LoadingSpinner
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                />
                            </div>
                        ) : results.length > 0 ? (
                            results.map((result) => (
                                <ResultItem key={`${result.type}-${result.id}`} onClick={() => handleSelect(result)}>
                                    <Avatar $src={result.avatar_url}>
                                        {!result.avatar_url && <FiUser color="rgba(255,255,255,0.5)" />}
                                    </Avatar>
                                    <ResultInfo>
                                        <ResultName>{result.display_name || result.name}</ResultName>
                                        <ResultType>
                                            {result.type === 'character' ? t('search.character', 'Персонаж') : t('search.user', 'Пользователь')}
                                        </ResultType>
                                    </ResultInfo>
                                </ResultItem>
                            ))
                        ) : (
                            <NoResults>{t('search.noResults', 'Ничего не найдено')}</NoResults>
                        )}
                    </ResultsDropdown>
                )}
            </AnimatePresence>
        </SearchContainer>
    );
};
