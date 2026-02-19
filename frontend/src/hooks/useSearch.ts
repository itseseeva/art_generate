import { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '../config/api';

export interface SearchResult {
    id: number | string;
    type: 'character' | 'user';
    name: string;
    display_name: string;
    avatar_url?: string;
    description?: string;
}

export const useSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(async () => {
            try {
                const url = `${API_CONFIG.BASE_URL}${API_CONFIG.SEARCH}?q=${encodeURIComponent(query)}&limit=10`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data);
                } else {
                    console.error('Search failed');
                    setResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query]);

    return {
        query,
        setQuery,
        results,
        isLoading,
        isOpen,
        setIsOpen,
    };
};
