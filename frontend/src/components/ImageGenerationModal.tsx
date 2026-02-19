import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FiSettings, FiX, FiZap, FiRefreshCw, FiCheck, FiChevronDown } from 'react-icons/fi';
import { Sparkles, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ModelCardProps {
    $isSelected: boolean;
    $previewImage: string;
}

interface ImageGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    imagePromptInput: string;
    setImagePromptInput: (value: string) => void;
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    isTagsExpanded: boolean;
    setIsTagsExpanded: (value: boolean) => void;
    onGenerate: (prompt: string) => void;
    onReset: () => void;
    activeGenerationsCount: number;
    generationQueueLimit: number;
    isMobile: boolean;
}

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
    isOpen,
    onClose,
    imagePromptInput,
    setImagePromptInput,
    selectedModel,
    setSelectedModel,
    isTagsExpanded,
    setIsTagsExpanded,
    onGenerate,
    onReset,
    activeGenerationsCount,
    generationQueueLimit,
    isMobile
}) => {
    const { t } = useTranslation('common');

    const tags = [
        { id: 'highDetail', label: t('photoPrompts.highDetail.label'), value: t('photoPrompts.highDetail.value') },
        { id: 'cyberpunk', label: t('photoPrompts.cyberpunk.label'), value: t('photoPrompts.cyberpunk.value') },
        { id: 'fantasy', label: t('photoPrompts.fantasy.label'), value: t('photoPrompts.fantasy.value') },
        { id: 'portrait', label: t('photoPrompts.portrait.label'), value: t('photoPrompts.portrait.value') },
        { id: 'fullBody', label: t('photoPrompts.fullBody.label'), value: t('photoPrompts.fullBody.value') },
        { id: 'anime', label: t('photoPrompts.anime.label'), value: t('photoPrompts.anime.value') },
        { id: 'realism', label: t('photoPrompts.realism.label'), value: t('photoPrompts.realism.value') },
        { id: 'cinematic', label: t('photoPrompts.cinematic.label'), value: t('photoPrompts.cinematic.value') },
        { id: 'beach', label: t('photoPrompts.beach.label'), value: t('photoPrompts.beach.value') },
        { id: 'city', label: t('photoPrompts.city.label'), value: t('photoPrompts.city.value') },
        { id: 'forest', label: t('photoPrompts.forest.label'), value: t('photoPrompts.forest.value') },
        { id: 'office', label: t('photoPrompts.office.label'), value: t('photoPrompts.office.value') },
        { id: 'summerDress', label: t('photoPrompts.summerDress.label'), value: t('photoPrompts.summerDress.value') },
        { id: 'eveningLight', label: t('photoPrompts.eveningLight.label'), value: t('photoPrompts.eveningLight.value') },
        { id: 'winter', label: t('photoPrompts.winter.label'), value: t('photoPrompts.winter.value') },
        { id: 'elegant', label: t('photoPrompts.elegant.label'), value: t('photoPrompts.elegant.value') },
        { id: 'closeUp', label: t('photoPrompts.closeUp.label'), value: t('photoPrompts.closeUp.value') },
        { id: 'park', label: t('photoPrompts.park.label'), value: t('photoPrompts.park.value') },
        { id: 'cafe', label: t('photoPrompts.cafe.label'), value: t('photoPrompts.cafe.value') },
        { id: 'nature', label: t('photoPrompts.nature.label'), value: t('photoPrompts.nature.value') },
        { id: 'eveningOutfit', label: t('photoPrompts.eveningOutfit.label'), value: t('photoPrompts.eveningOutfit.value') },
        { id: 'casual', label: t('photoPrompts.casual.label'), value: t('photoPrompts.casual.value') },
        { id: 'sport', label: t('photoPrompts.sport.label'), value: t('photoPrompts.sport.value') },
        { id: 'romantic', label: t('photoPrompts.romantic.label'), value: t('photoPrompts.romantic.value') }
    ];

    const handleTagClick = (tagValue: string) => {
        const trimmedInput = imagePromptInput.trim();
        // Улучшенная проверка наличия тега (учитываем возможные вариации пробелов)
        const escapedTagValue = tagValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tagRegex = new RegExp(`(^|,\\s*)${escapedTagValue}(\\s*(,|$))`, 'g');

        if (tagRegex.test(trimmedInput)) {
            // Если есть, удаляем его
            const newValue = trimmedInput.replace(tagRegex, (match, p1, p2, p3) => {
                // Если это был единственный элемент или в середине
                return p1 === ',' && p3 === ',' ? ',' : '';
            }).replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
            setImagePromptInput(newValue);
        } else {
            // Если нет, добавляем
            const separator = trimmedInput.length > 0 && !trimmedInput.endsWith(',') ? ', ' : '';
            const newValue = trimmedInput + separator + tagValue;
            setImagePromptInput(newValue.trim());
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1000] flex items-start justify-center pt-4 md:pt-12 p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
                >
                    {/* Background Blobs */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="relative w-full max-w-6xl bg-[#0f0f13]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative Gradient Border Top */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10 focus:outline-none focus:ring-0"
                        >
                            <FiX size={20} />
                        </button>

                        <div className={`flex flex-col ${isMobile ? 'p-4' : 'p-6'} h-full max-h-[90vh] overflow-y-auto`}>

                            {/* Header */}
                            <div className="mb-4 text-center">
                                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                                    Генерация фото персонажа
                                </h2>

                            </div>

                            {/* Model Selection */}
                            <div className="mb-5">
                                <div className="flex items-center gap-2 mb-4 text-gray-300 text-sm font-medium">
                                    <FiSettings className="w-4 h-4 text-purple-400" />
                                    ВЫБЕРИТЕ СТИЛЬ
                                </div>

                                <div className="flex flex-wrap justify-center gap-4">
                                    {/* Anime Realism Card */}
                                    <div
                                        onClick={() => setSelectedModel('anime-realism')}
                                        className={`relative group cursor-pointer rounded-2xl overflow-hidden w-[180px] h-[260px] shrink-0 transition-all duration-300 border ${selectedModel === 'anime-realism'
                                            ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                            : 'border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        <img
                                            src="/анимереализм.jpg"
                                            alt="Anime Realism"
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${selectedModel === 'anime-realism' ? 'opacity-100' : 'opacity-80 group-hover:opacity-90'}`} />

                                        <div className="absolute bottom-0 left-0 p-4 w-full">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-white font-bold text-lg mb-0.5">Аниме + Реализм</h3>
                                                    <p className="text-gray-300 text-xs">Сбалансированный стиль</p>
                                                </div>
                                                {selectedModel === 'anime-realism' && (
                                                    <div className="flex items-center justify-center transform scale-100 transition-transform">
                                                        <FiCheck className="text-green-500 w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Anime Card */}
                                    <div
                                        onClick={() => setSelectedModel('anime')}
                                        className={`relative group cursor-pointer rounded-2xl overflow-hidden w-[180px] h-[260px] shrink-0 transition-all duration-300 border ${selectedModel === 'anime'
                                            ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                            : 'border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        <img
                                            src="/аниме.png"
                                            alt="Anime"
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${selectedModel === 'anime' ? 'opacity-100' : 'opacity-80 group-hover:opacity-90'}`} />

                                        <div className="absolute bottom-0 left-0 p-4 w-full">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-white font-bold text-lg mb-0.5">Аниме</h3>
                                                    <p className="text-gray-300 text-xs">Классический 2D стиль</p>
                                                </div>
                                                {selectedModel === 'anime' && (
                                                    <div className="flex items-center justify-center transform scale-100 transition-transform">
                                                        <FiCheck className="text-green-500 w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Prompt Input */}
                            <div className="mb-4 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-4 text-gray-300 text-sm font-medium">
                                    <Sparkles className="w-4 h-4 text-yellow-500" />
                                    ОПИСАНИЕ ОБРАЗА
                                </div>

                                <div className="relative flex-1 min-h-[100px]">
                                    <div className="absolute top-4 left-4 text-purple-500 animate-pulse font-mono pointer-events-none select-none">
                                        &gt;_
                                    </div>
                                    <textarea
                                        value={imagePromptInput}
                                        onChange={(e) => setImagePromptInput(e.target.value)}
                                        placeholder="Опишите желаемое изображение..."
                                        className="w-full h-full min-h-[100px] bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-4 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none font-mono text-sm leading-relaxed"
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Помощники</span>

                                </div>

                                <div className={`flex flex-wrap gap-2 transition-all duration-300 ease-in-out overflow-hidden ${isTagsExpanded ? 'max-h-[300px]' : 'max-h-[70px]'} relative`}>
                                    {tags.map((tag, idx) => {
                                        const escapedTagValue = tag.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const isActive = new RegExp(`(^|,\\s*)${escapedTagValue}(\\s*(,|$))`).test(imagePromptInput);
                                        return (
                                            <motion.button
                                                key={idx}
                                                whileHover={{ scale: 1.05, backgroundColor: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)' }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleTagClick(tag.value);
                                                }}
                                                className={`group flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs transition-all cursor-pointer whitespace-nowrap ${isActive
                                                    ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                                    }`}
                                            >
                                                {isActive ? (
                                                    <FiCheck className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <Plus className="w-3 h-3 text-gray-500 group-hover:text-purple-400 transition-colors" />
                                                )}
                                                {tag.label}
                                            </motion.button>
                                        );
                                    })}

                                    {/* Fade gradient for collapsed state */}
                                    {!isTagsExpanded && (
                                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0f0f13]/90 to-transparent pointer-events-none" />
                                    )}
                                </div>

                                <button
                                    onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                                    className="w-full flex justify-center mt-2 group outline-none focus:outline-none focus:ring-0 active:outline-none"
                                >
                                    <FiChevronDown
                                        className={`w-6 h-6 text-gray-500 group-hover:text-white transition-all duration-300 ${isTagsExpanded ? 'rotate-180' : 'animate-bounce'}`}
                                    />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className={`mt-auto flex gap-4 ${isMobile ? 'flex-col-reverse' : 'flex-row items-center'}`}>
                                <button
                                    onClick={onReset}
                                    className="px-6 py-3 rounded-xl text-gray-400 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/5 transition-all text-sm font-medium flex items-center justify-center gap-2 group focus:outline-none focus:ring-0"
                                >
                                    <FiRefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                    Сбросить
                                </button>

                                <div className="flex-1 flex gap-4">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-6 py-3 rounded-xl text-gray-300 hover:text-white border border-white/10 hover:bg-white/5 transition-all text-sm font-medium focus:outline-none focus:ring-0"
                                    >
                                        Отмена
                                    </button>

                                    <motion.button
                                        whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(234, 179, 8, 0.4)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onGenerate(imagePromptInput)}
                                        disabled={!imagePromptInput.trim() || activeGenerationsCount >= generationQueueLimit}
                                        className={`flex-[2] relative overflow-hidden px-8 py-3 rounded-xl font-bold text-black shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-0 ${!imagePromptInput.trim() || activeGenerationsCount >= generationQueueLimit
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50 shadow-none'
                                            : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 bg-[length:200%_auto] hover:bg-right'
                                            }`}
                                    >
                                        {activeGenerationsCount >= generationQueueLimit ? (
                                            'Очередь заполнена'
                                        ) : (
                                            <>
                                                <FiZap className="w-5 h-5 fill-current" />
                                                СГЕНЕРИРОВАТЬ
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
