import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { API_CONFIG } from '../config/api';
import { theme } from '../theme';

const TagSelectorContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 16px;
`;

const TagSelectorButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${(p) => (p.$active ? 'rgba(34, 197, 94, 0.5)' : 'rgba(139, 92, 246, 0.2)')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(30, 30, 40, 0.4)')};
  color: ${(p) => (p.$active ? '#4ade80' : 'rgba(180, 180, 180, 1)')};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  outline: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(34, 197, 94, 0.25)' : 'rgba(60, 60, 70, 0.6)')};
    border-color: ${(p) => (p.$active ? 'rgba(34, 197, 94, 0.7)' : 'rgba(139, 92, 246, 0.4)')};
    color: ${(p) => (p.$active ? '#86efac' : 'rgba(220, 220, 220, 1)')};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

interface TagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ selectedTags, onChange }) => {
    const [availableTags, setAvailableTags] = useState<any[]>([]);

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
                            const tagName = typeof tag === 'string' ? tag : tag.name;
                            const tagObj = typeof tag === 'string' ? { name: tag, slug: tag } : tag;

                            if (!uniqueTagsMap.has(tagName)) {
                                uniqueTagsMap.set(tagName, tagObj);
                            }
                        });
                        setAvailableTags(Array.from(uniqueTagsMap.values()));
                    }
                }
            } catch (error) {
                console.error('Error fetching available tags:', error);
            }
        };
        fetchTags();
    }, []);

    const toggleTag = (tagName: string) => {
        // Determine if the tag is already selected by name or slug comparison logic?
        // Assuming backend expects list of strings (names or slugs).
        // Based on TagsPage, it uses slugs for navigation but names for display.
        // Let's stick to names as identifiers for now if that's what's currently used, OR use the object.
        // However, selectedTags prop is string[].
        // Let's assume we store the "slug" or "name". Existing form likely expects a string.

        // Check if tag is in selectedTags
        const isSelected = selectedTags.includes(tagName);
        let newTags;
        if (isSelected) {
            newTags = selectedTags.filter(t => t !== tagName);
        } else {
            newTags = [...selectedTags, tagName];
        }
        onChange(newTags);
    };

    if (availableTags.length === 0) return null;

    return (
        <TagSelectorContainer>
            {availableTags.map((tagObj) => {
                const identifier = tagObj.name; // Use name as identifier for now
                return (
                    <TagSelectorButton
                        key={tagObj.slug || tagObj.name}
                        type="button"
                        $active={selectedTags.includes(identifier)}
                        onClick={(e) => {
                            e.preventDefault();
                            toggleTag(identifier);
                        }}
                    >
                        {tagObj.name}
                    </TagSelectorButton>
                );
            })}
        </TagSelectorContainer>
    );
};
