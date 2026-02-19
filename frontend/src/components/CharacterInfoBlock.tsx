import React, { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { ChevronDown, ChevronUp, MapPin, User, Sparkles, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../config/api';

import { translateToRussian } from '../utils/translate';
import { useCharacterTranslation } from '../hooks/useCharacterTranslation';

interface CharacterInfoBlockProps {
  character: any;
}

export const CharacterInfoBlock: React.FC<CharacterInfoBlockProps> = ({ character }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const { tChar } = useCharacterTranslation(character);

  if (!character) return null;

  // Загружаем список всех доступных тегов из API один раз при монтировании
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/available-tags`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            // Удаляем дубликаты
            const uniqueTagsMap = new Map();
            data.forEach((tag: any) => {
              const name = typeof tag === 'string' ? tag : tag.name;
              const tagObj = typeof tag === 'string' ? { name: tag, slug: tag } : tag;
              if (name && !uniqueTagsMap.has(name)) {
                uniqueTagsMap.set(name, tagObj);
              }
            });
            setAvailableTags(Array.from(uniqueTagsMap.values()));
          }
        }
      } catch (error) {
        console.error('Error fetching tags for info block:', error);
      }
    };
    fetchAvailableTags();
  }, []);

  // Парсинг тегов персонажа и поиск их реальных слагов в базе
  const tags = useMemo(() => {
    if (!character.tags) return [];
    let charTagNames: string[] = [];

    if (Array.isArray(character.tags)) {
      charTagNames = character.tags.map((t: any) => typeof t === 'string' ? t : t.name);
    } else if (typeof character.tags === 'string') {
      try {
        const parsed = JSON.parse(character.tags);
        if (Array.isArray(parsed)) {
          charTagNames = parsed.map((t: any) => typeof t === 'string' ? t : t.name);
        }
      } catch (e) {
        charTagNames = character.tags.split(',').map((s: string) => s.trim());
      }
    }

    // Удаляем дубликаты имен тегов
    charTagNames = Array.from(new Set(charTagNames.filter(Boolean)));

    // Мапим имена тегов персонажа на объекты с реальными слагами из базы
    return charTagNames
      .map(name => {
        const dbTag = availableTags.find(t => t.name.toLowerCase() === name.toLowerCase());
        return {
          name: name,
          slug: dbTag ? dbTag.slug : name.toLowerCase() // Если нет в базе, используем имя (fallback)
        };
      })
      .filter(t => t.name);
  }, [character.tags, availableTags]);

  // Извлечение данных из промпта
  const prompt = character.prompt || character.raw?.prompt || "";

  const extractedData = useMemo(() => {
    if (!prompt) return { personality: "", situation: "", instructions: "" };

    const pMatch = prompt.match(/Personality and Character:\s*([\s\S]*?)(?=\s*(?:Role-playing Situation:|Instructions:|Response Style:|###|$))/i);
    const sMatch = prompt.match(/Role-playing Situation:\s*([\s\S]*?)(?=\s*(?:Instructions:|Response Style:|###|$))/i);
    const iMatch = prompt.match(/Instructions:\s*([\s\S]*?)(?=\s*(?:Response Style:|IMPORTANT:|###|$))/i);

    return {
      personality: pMatch ? pMatch[1].trim() : "",
      situation: sMatch ? sMatch[1].trim() : "",
      instructions: iMatch ? iMatch[1].trim() : ""
    };
  }, [prompt]);

  const description = tChar('description') || character.description || character.greeting || t('characterCard.noDescription');

  // Приоритет: 1. tChar (берет из новых полей), 2. extract из prompt, 3. fallback (не имя)
  const displayPersonality = tChar('personality') || extractedData.personality || "";

  const displaySituation = useMemo(() => {
    const fromT = tChar('situation');
    if (fromT) return fromT;

    // Only use description if it's NOT just the character name
    const fallbackDesc = (character.description && character.description.toLowerCase() !== character.name.toLowerCase())
      ? character.description
      : "";

    if (extractedData.situation) return extractedData.situation;
    return fallbackDesc;
  }, [tChar, extractedData.situation, character.description, character.name]);

  const displayAppearance = tChar('appearance') || character.character_appearance || "";
  const displayLocation = tChar('location') || character.location || "";
  const translatedTagsList = tChar<string[]>('tags');

  const jsonLd = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": tChar('name') || character.display_name || character.name,
      "description": description,
      "image": character.avatar,
      "identifier": character.id,
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Appearance",
          "value": displayAppearance || "Not specified"
        },
        {
          "@type": "PropertyValue",
          "name": "Location",
          "value": displayLocation || "Not specified"
        },
        {
          "@type": "PropertyValue",
          "name": "Personality",
          "value": displayPersonality || "Not specified"
        },
        {
          "@type": "PropertyValue",
          "name": "Role-playing Situation",
          "value": displaySituation || "Not specified"
        },
        {
          "@type": "PropertyValue",
          "name": "Tags",
          "value": tags.map(t => t.name).join(', ')
        }
      ]
    };
  }, [character, description, displayPersonality, displaySituation, displayAppearance, displayLocation, tags, tChar]);

  const handleTagClick = (tag: { name: string; slug: string }) => {
    const slug = tag.slug;
    if (slug) {
      window.history.pushState({ page: 'tags', slug }, '', `/tags/${slug}`);
      window.dispatchEvent(new CustomEvent('navigate-to-tags', { detail: { slug } }));
    }
  };

  return (
    <RootWrapper>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      <Title>{t('characterCard.about')}</Title>

      <ExpandButtonContainer
        $isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? t('characterCard.collapse') : t('characterCard.expand')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </ExpandButtonContainer>

      <SlidingContainer $isExpanded={isExpanded}>
        <ContentWrapper>
          <DescriptionText>
            {description}
          </DescriptionText>

          <ExtraDetailsWrapper>
            {displayAppearance && (
              <DetailRow>
                <DetailLabel><User size={12} /> {t('characterCard.appearance')}:</DetailLabel>
                <span>{displayAppearance}</span>
              </DetailRow>
            )}

            {displayLocation && (
              <DetailRow>
                <DetailLabel><MapPin size={12} /> {t('characterCard.location')}:</DetailLabel>
                <span>{displayLocation}</span>
              </DetailRow>
            )}

            {displayPersonality && (
              <DetailRow>
                <DetailLabel><Brain size={12} /> {t('characterCard.personality')}:</DetailLabel>
                <span>{displayPersonality}</span>
              </DetailRow>
            )}

            {displaySituation && (
              <DetailRow>
                <DetailLabel><Sparkles size={12} /> {t('characterCard.situation')}:</DetailLabel>
                <span>{displaySituation}</span>
              </DetailRow>
            )}

            {tags.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <DetailLabel style={{ marginBottom: 6 }}><Sparkles size={12} /> {t('characterCard.tags')}:</DetailLabel>
                <TagContainer>
                  {tags.map((tag, idx) => {
                    let displayText = tag.name;

                    if (Array.isArray(translatedTagsList) && Array.isArray(character.tags)) {
                      const originalIndex = character.tags.indexOf(tag.name);
                      if (originalIndex !== -1 && translatedTagsList[originalIndex]) {
                        displayText = translatedTagsList[originalIndex];
                      }
                    }

                    return (
                      <Tag key={idx} onClick={(e) => {
                        e.stopPropagation();
                        handleTagClick(tag);
                      }}>{displayText}</Tag>
                    );
                  })}
                </TagContainer>
              </div>
            )}
          </ExtraDetailsWrapper>
        </ContentWrapper>
      </SlidingContainer>
    </RootWrapper>
  );
};

const RootWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 0;
  margin-bottom: ${theme.spacing.xl};
  position: relative;
  z-index: 5;
`;

const Title = styled.h3`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  text-shadow: 0 0 8px rgba(236, 72, 153, 0.4);
  text-align: center;
`;

const SlidingContainer = styled.div<{ $isExpanded: boolean }>`
  width: 100%;
  overflow: hidden;
  max-height: ${props => props.$isExpanded ? '2000px' : '0'};
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: ${props => props.$isExpanded ? '12px' : '0'};
  visibility: visible;
  pointer-events: ${props => props.$isExpanded ? 'auto' : 'none'};
`;

const ContentWrapper = styled.div`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: ${theme.spacing.md};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const DescriptionText = styled.p`
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px 0;
  white-space: pre-wrap;
`;

const ExtraDetailsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const DetailRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  
  span {
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    white-space: pre-wrap;
  }
`;

const DetailLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: ${theme.colors.accent.primary};
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  svg {
    color: ${theme.colors.accent.primary};
  }
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Tag = styled.button`
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  padding: 4px 10px;
  border-radius: 12px;
  color: rgba(200, 200, 200, 0.9);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const ExpandButtonContainer = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 4px;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  transition: all 0.3s ease;
  
  &:hover {
    color: ${theme.colors.text.primary};
  }

  svg {
    transform: rotate(${props => props.$isExpanded ? '180deg' : '0deg'});
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: ${props => props.$isExpanded ? 'none' : 'arrowBounce 2s infinite'};
    width: 24px;
    height: 24px;
  }

  @keyframes arrowBounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0) rotate(0deg); }
    40% { transform: translateY(5px) rotate(0deg); }
    60% { transform: translateY(3px) rotate(0deg); }
  }
`;
