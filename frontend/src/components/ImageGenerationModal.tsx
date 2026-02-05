import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FiSettings, FiX, FiZap, FiRefreshCw, FiCheck, FiChevronDown } from 'react-icons/fi';
import { Sparkles, Plus } from 'lucide-react';

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


    const tags = [
        { label: 'Высокая детализация', value: 'высокая детализация, реализм, 8к разрешение' },
        { label: 'Киберпанк', value: 'стиль киберпанк, неоновое освещение, футуристично' },
        { label: 'Фэнтези', value: 'фэнтези стиль, магическая атмосфера' },
        { label: 'Портрет', value: 'крупный план, детальное лицо, выразительный взгляд' },
        { label: 'В полный рост', value: 'в полный рост, изящная поза' },
        { label: 'Аниме стиль', value: 'красивый аниме стиль, четкие линии, яркие цвета' },
        { label: 'Реализм', value: 'фотореалистично, натуральные текстуры кожи' },
        { label: 'Кинематографично', value: 'кинематографичный свет, глубокие тени, драматично' },
        { label: 'На пляже', value: 'на берегу океана, золотой песок, закатное солнце' },
        { label: 'В городе', value: 'на оживленной улице города, ночные огни, боке' },
        { label: 'В лесу', value: 'в сказочном лесу, лучи солнца сквозь листву' },
        { label: 'Офисный стиль', value: 'в строгом офисном костюме, деловая обстановка' },
        { label: 'Летнее платье', value: 'в легком летнем платье, летящая ткань' },
        { label: 'Вечерний свет', value: 'мягкий вечерний свет, теплые тона' },
        { label: 'Зима', value: 'зимний пейзаж, падающий снег, меховая одежда' },
        { label: 'Элегантный образ', value: 'элегантная поза, утонченный стиль, изысканность' },
        { label: 'Портрет крупным планом', value: 'крупный план лица, выразительный взгляд, детализированные черты' },
        { label: 'В парке', value: 'в городском парке, зеленая трава, солнечный свет' },
        { label: 'В кафе', value: 'в уютном кафе, теплая атмосфера, приятная обстановка' },
        { label: 'На природе', value: 'на природе, свежий воздух, красивые пейзажи' },
        { label: 'Вечерний наряд', value: 'в красивом вечернем наряде, элегантный стиль' },
        { label: 'Повседневный образ', value: 'в повседневной одежде, комфортный стиль' },
        { label: 'Спортивный стиль', value: 'в спортивной одежде, активный образ жизни' },
        { label: 'Романтичная атмосфера', value: 'романтичная обстановка, мягкое освещение, уют' }
    ];

    const handleTagClick = (tagValue: string) => {
        const separator = imagePromptInput.length > 0 && !imagePromptInput.trim().endsWith(',') ? ', ' : '';
        const newValue = imagePromptInput + separator + tagValue;
        setImagePromptInput(newValue);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1000] flex items-start justify-center pt-4 md:pt-12 p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
                    onClick={onClose}
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
                                    {tags.map((tag, idx) => (
                                        <motion.button
                                            key={idx}
                                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleTagClick(tag.value);
                                            }}
                                            className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer whitespace-nowrap"
                                        >
                                            <Plus className="w-3 h-3 text-gray-500 group-hover:text-purple-400 transition-colors" />
                                            {tag.label}
                                        </motion.button>
                                    ))}

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
