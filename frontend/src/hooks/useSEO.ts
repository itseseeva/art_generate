import { useEffect } from 'react';

export interface SEOConfig {
    title: string;
    description: string;
    canonical?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    hreflangs?: { hreflang: string; href: string }[];
}

/**
 * Custom hook для управления SEO мета-тегами
 * Обновляет title, description, canonical link, Open Graph теги и hreflang
 */
export const useSEO = (config: SEOConfig) => {
    useEffect(() => {
        // Обновление title
        if (config.title) {
            document.title = config.title;
        }

        // Обновление meta description
        if (config.description) {
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', config.description);
        }

        // Обновление keywords
        if (config.keywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
                metaKeywords = document.createElement('meta');
                metaKeywords.setAttribute('name', 'keywords');
                document.head.appendChild(metaKeywords);
            }
            metaKeywords.setAttribute('content', config.keywords);
        }

        // Обновление canonical link
        if (config.canonical) {
            let linkCanonical = document.querySelector('link[rel="canonical"]');
            if (!linkCanonical) {
                linkCanonical = document.createElement('link');
                linkCanonical.setAttribute('rel', 'canonical');
                document.head.appendChild(linkCanonical);
            }
            linkCanonical.setAttribute('href', config.canonical);
        }

        // Обновление Open Graph title
        const ogTitle = config.ogTitle || config.title;
        if (ogTitle) {
            let metaOgTitle = document.querySelector('meta[property="og:title"]');
            if (!metaOgTitle) {
                metaOgTitle = document.createElement('meta');
                metaOgTitle.setAttribute('property', 'og:title');
                document.head.appendChild(metaOgTitle);
            }
            metaOgTitle.setAttribute('content', ogTitle);
        }

        // Обновление Open Graph description
        const ogDescription = config.ogDescription || config.description;
        if (ogDescription) {
            let metaOgDescription = document.querySelector('meta[property="og:description"]');
            if (!metaOgDescription) {
                metaOgDescription = document.createElement('meta');
                metaOgDescription.setAttribute('property', 'og:description');
                document.head.appendChild(metaOgDescription);
            }
            metaOgDescription.setAttribute('content', ogDescription);
        }

        // Обновление Open Graph URL
        if (config.canonical) {
            let metaOgUrl = document.querySelector('meta[property="og:url"]');
            if (!metaOgUrl) {
                metaOgUrl = document.createElement('meta');
                metaOgUrl.setAttribute('property', 'og:url');
                document.head.appendChild(metaOgUrl);
            }
            metaOgUrl.setAttribute('content', config.canonical);
        }

        // Обновление Open Graph image
        if (config.ogImage) {
            let metaOgImage = document.querySelector('meta[property="og:image"]');
            if (!metaOgImage) {
                metaOgImage = document.createElement('meta');
                metaOgImage.setAttribute('property', 'og:image');
                document.head.appendChild(metaOgImage);
            }
            metaOgImage.setAttribute('content', config.ogImage);
        }

        // Обновление Twitter Card title
        if (ogTitle) {
            let metaTwitterTitle = document.querySelector('meta[name="twitter:title"]');
            if (!metaTwitterTitle) {
                metaTwitterTitle = document.createElement('meta');
                metaTwitterTitle.setAttribute('name', 'twitter:title');
                document.head.appendChild(metaTwitterTitle);
            }
            metaTwitterTitle.setAttribute('content', ogTitle);
        }

        // Обновление Twitter Card description
        if (ogDescription) {
            let metaTwitterDescription = document.querySelector('meta[name="twitter:description"]');
            if (!metaTwitterDescription) {
                metaTwitterDescription = document.createElement('meta');
                metaTwitterDescription.setAttribute('name', 'twitter:description');
                document.head.appendChild(metaTwitterDescription);
            }
            metaTwitterDescription.setAttribute('content', ogDescription);
        }

        // Обновление Twitter Card URL
        if (config.canonical) {
            let metaTwitterUrl = document.querySelector('meta[name="twitter:url"]');
            if (!metaTwitterUrl) {
                metaTwitterUrl = document.createElement('meta');
                metaTwitterUrl.setAttribute('name', 'twitter:url');
                document.head.appendChild(metaTwitterUrl);
            }
            metaTwitterUrl.setAttribute('content', config.canonical);
        }

        // Обновление Twitter Card image
        if (config.ogImage) {
            let metaTwitterImage = document.querySelector('meta[name="twitter:image"]');
            if (!metaTwitterImage) {
                metaTwitterImage = document.createElement('meta');
                metaTwitterImage.setAttribute('name', 'twitter:image');
                document.head.appendChild(metaTwitterImage);
            }
            metaTwitterImage.setAttribute('content', config.ogImage);
        }

        // Обновление hreflang
        const existingHreflangs = document.querySelectorAll('link[rel="alternate"][hreflang]');
        existingHreflangs.forEach(el => el.remove());

        if (config.hreflangs && config.hreflangs.length > 0) {
            config.hreflangs.forEach(lang => {
                const link = document.createElement('link');
                link.setAttribute('rel', 'alternate');
                link.setAttribute('hreflang', lang.hreflang);
                link.setAttribute('href', lang.href);
                document.head.appendChild(link);
            });
        }
    }, [
        config.title,
        config.description,
        config.canonical,
        config.keywords,
        config.ogTitle,
        config.ogDescription,
        config.ogImage,
        JSON.stringify(config.hreflangs)
    ]);
};
