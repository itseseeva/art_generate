import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { theme } from '../theme';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import { Footer } from './Footer';
import { useIsMobile } from '../hooks/useIsMobile';
import DarkVeil from '../../@/components/DarkVeil';

const TagsContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: white;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 0;
  max-width: none;
  margin: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.lg} ${theme.spacing.sm} 0;
  min-width: 0;
  padding-top: 0;
`;

const Title = styled.h1`
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

const CharactersGrid = styled.div`
  flex: 1;
  padding: 0 ${theme.spacing.sm} ${theme.spacing.xs};
  overflow-y: visible;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
  align-content: start;
  width: 100%;
  min-height: 0;

  @media (max-width: 768px) {
    flex: none;
    overflow-y: visible;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

const DescriptionSection = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.md} 0;
  width: 100%;
  margin-top: ${theme.spacing.md};
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 10;
`;

const DescriptionContainer = styled.div`
  background: rgba(20, 20, 30, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.lg};
  padding: 8px 40px;
  max-width: 1000px;
  width: 95%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }
`;

const TagTitle = styled.h2`
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 2px;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
`;

const TagDescription = styled.p`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin: 0;
  font-weight: 400;
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

const TagLabel = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-weight: 700;
  margin-right: 8px;
`;

interface TagsPageProps {
    slug: string;
    onBackToMain: () => void;
    onCharacterSelect: (character: any) => void;
    setTagName: (name: string) => void;
    onShop?: () => void;
    onProfile?: () => void;
}

export const TagsPage: React.FC<TagsPageProps> = ({
    slug,
    onBackToMain,
    onCharacterSelect,
    setTagName,
    onShop,
    onProfile
}) => {
    const { tagSlug } = useParams<{ tagSlug: string }>();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const effectiveSlug = slug || tagSlug || '';

    const [tagNameLocal, setTagNameLocal] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [characters, setCharacters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const isMobile = useIsMobile();

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/available-tags`);
                if (response.ok) {
                    const data = await response.json();
                    // Deduplicate tags
                    const uniqueTagsMap = new Map();
                    if (Array.isArray(data)) {
                        data.forEach((tag: any) => {
                            // Handle both string and object formats just in case
                            const tagName = typeof tag === 'string' ? tag : tag.name;
                            const tagObj = typeof tag === 'string' ? { name: tag, slug: tag } : tag;

                            if (!uniqueTagsMap.has(tagName)) {
                                uniqueTagsMap.set(tagName, tagObj);
                            }
                        });
                        setAvailableTags(Array.from(uniqueTagsMap.values()));
                    } else {
                        setAvailableTags([]);
                    }
                }
            } catch (error) {
                console.error('Error fetching available tags:', error);
            }
        };
        fetchTags();

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/tags/${effectiveSlug}`);
                if (response.ok) {
                    const data = await response.json();
                    const isRu = i18n.language === 'ru';
                    const name = isRu ? data.tag_name_ru || data.tag_name : data.tag_name_en || data.tag_name;
                    const seo = isRu ? data.seo_description_ru || data.seo_description : data.seo_description_en || data.seo_description;

                    setTagNameLocal(name);
                    setTagName(name);
                    setSeoDescription(seo || '');

                    // Мапим персонажей в формат, ожидаемый CharacterCard
                    const formattedChars = data.characters.map((char: any) => {
                        let photos: string[] = [];
                        if (char.main_photos) {
                            try {
                                const parsed = typeof char.main_photos === 'string' ? JSON.parse(char.main_photos) : char.main_photos;
                                photos = (Array.isArray(parsed) ? parsed : []).map((p: any) => typeof p === 'string' ? p : p.url).filter(Boolean);
                            } catch (e) {
                                console.error("Error parsing photos", e);
                            }
                        }

                        return {
                            ...char,
                            avatar: char.display_name?.charAt(0) || char.name?.charAt(0) || '?',
                            photos: photos,
                            likes: Number(char.likes) || 0,
                            comments: Number(char.comments) || 0,
                            views: Number(char.views) || 0,
                            creator_username: char.creator_username,
                            raw: char,
                            // Bilingual fields
                            personality_ru: char.personality_ru,
                            personality_en: char.personality_en,
                            situation_ru: char.situation_ru,
                            situation_en: char.situation_en,
                            instructions_ru: char.instructions_ru,
                            instructions_en: char.instructions_en,
                            style_ru: char.style_ru,
                            style_en: char.style_en,
                            appearance_ru: char.appearance_ru || char.character_appearance_ru,
                            appearance_en: char.appearance_en || char.character_appearance_en,
                            location_ru: char.location_ru,
                            location_en: char.location_en,
                            translations: char.translations
                        };
                    });

                    setCharacters(formattedChars);
                }
            } catch (error) {
                console.error('Error fetching tag data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (effectiveSlug) {
            fetchData();
        }
    }, [effectiveSlug]);

    return (
        <TagsContainer>
            {availableTags.length > 0 && (
                <TagFilterBar>
                    {availableTags.map((tagObj) => (
                        <TagFilterButton
                            key={tagObj.slug || tagObj.name}
                            type="button"
                            $active={tagObj.slug === effectiveSlug}
                            onClick={() => {
                                if (tagObj.slug) {
                                    const currentLang = i18n.language || 'ru';
                                    const path = currentLang === 'en' ? `/tags/${tagObj.slug}` : `/${currentLang}/tags/${tagObj.slug}`;
                                    navigate(path);
                                }
                            }}
                        >
                            {i18n.language === 'ru' ? tagObj.name_ru || tagObj.name : tagObj.name_en || tagObj.name}
                        </TagFilterButton>
                    ))}
                </TagFilterBar>
            )}
            <ContentWrapper>
                <ContentArea>
                    {characters.length > 0 && (
                        <CharactersGrid>
                            {characters.map((char) => (
                                <CharacterCard
                                    key={char.id}
                                    character={char}
                                    onClick={() => onCharacterSelect(char)}
                                />
                            ))}
                        </CharactersGrid>
                    )}
                    <DescriptionSection>
                        <DescriptionContainer>
                            <TagTitle>{tagNameLocal}</TagTitle>
                            <TagDescription>
                                {seoDescription}
                            </TagDescription>
                        </DescriptionContainer>
                    </DescriptionSection>
                </ContentArea>
            </ContentWrapper>
            <Footer />
        </TagsContainer>
    );
};
