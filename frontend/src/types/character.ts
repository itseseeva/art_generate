export interface Character {
    id: string | number; // Support both for now to avoid breaking changes
    name: string;
    description: string;
    avatar: string; // Used in frontend for the main image
    photos?: string[]; // Array of photo URLs
    tags?: string[]; // List of tags
    author?: string;
    likes?: number;
    dislikes?: number;
    views?: number;
    comments?: number;
    is_nsfw?: boolean;
    creator_username?: string;
    paid_album_photos_count?: number;
    paid_album_preview_urls?: string[];
    prompt?: string;
    display_name?: string;
    raw?: any;

    // Backend fields that might be present
    character_appearance?: string;
    location?: string;
    user_id?: number;
    main_photos?: string;
    voice_id?: string;
    voice_url?: string;
    created_at?: string;

    // Bilingual fields
    personality_ru?: string;
    personality_en?: string;
    situation_ru?: string;
    situation_en?: string;
    instructions_ru?: string;
    instructions_en?: string;
    style_ru?: string;
    style_en?: string;
    appearance_ru?: string;
    appearance_en?: string;
    location_ru?: string;
    location_en?: string;

    // Translation field
    translations?: {
        [lang: string]: {
            name?: string;
            description?: string;
            prompt?: string;
            situation?: string;
            instructions?: string;
            personality?: string;
            firstMessage?: string;
        };
    };
}

export interface CharacterWithCreator extends Character {
    creator_info?: {
        id: number;
        username: string;
        avatar_url: string;
    };
}
