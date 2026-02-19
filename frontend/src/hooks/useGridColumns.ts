import { useState, useLayoutEffect, RefObject } from 'react';

export const useGridColumns = (containerRef: RefObject<HTMLElement>, minCardWidth: number = 230, gap: number = 8): number => {
    const [columnsCount, setColumnsCount] = useState(6);

    useLayoutEffect(() => {
        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (let entry of entries) {
                if (window.innerWidth <= 768) {
                    setColumnsCount(2); // Mobile view fixed 2 columns
                    continue;
                }

                const width = entry.contentRect.width;
                // Exact logic from MainPage to match CSS Grid auto-fill behavior
                // floor((availWidth + gap) / (minWidth + gap))
                const calculated = Math.floor((width + gap) / (minCardWidth + gap));
                setColumnsCount(Math.max(1, calculated));
            }
        };

        const observer = new ResizeObserver(handleResize);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [containerRef, minCardWidth, gap]);

    return columnsCount;
};
