"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "~/lib/utils"

interface CircularGalleryItem {
  id: string
  name: string
  image?: string
  photos?: string[]
  [key: string]: any
}

interface CircularGalleryProps {
  items: CircularGalleryItem[]
  className?: string
  onItemClick?: (item: CircularGalleryItem) => void
  onIndexChange?: (index: number) => void
  itemSize?: number
  itemHeight?: number
  itemWidth?: number
  visibleCount?: number
  bend?: number
  borderRadius?: number
  scrollSpeed?: number
  scrollEase?: number
}

export function CircularGallery({
  items,
  className,
  onItemClick,
  onIndexChange,
  itemSize,
  itemHeight = 300,
  itemWidth = 200,
  visibleCount = 5,
  bend = 10,
  borderRadius = 0.22,
  scrollSpeed = 3.4,
  scrollEase = 0.11,
}: CircularGalleryProps) {
  const width = itemSize || itemWidth
  const height = itemSize || itemHeight
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [startX, setStartX] = React.useState(0)
  const [currentX, setCurrentX] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const targetIndexRef = React.useRef(currentIndex)
  const scrollVelocityRef = React.useRef(0)

  if (!items || items.length === 0) {
    return null
  }

  const getItemImage = (item: CircularGalleryItem) => {
    if (item.image) return item.image
    if (item.photos && item.photos.length > 0) {
      return item.photos[0]
    }
    return null
  }

  const rotateItems = (direction: 'left' | 'right') => {
    setCurrentIndex((prev) => {
      let newIndex: number
      if (direction === 'left') {
        newIndex = prev === 0 ? items.length - 1 : prev - 1
      } else {
        newIndex = prev === items.length - 1 ? 0 : prev + 1
      }
      targetIndexRef.current = newIndex
      if (onIndexChange) {
        onIndexChange(newIndex)
      }
      return newIndex
    })
  }

  // Плавная прокрутка с использованием scrollEase
  React.useEffect(() => {
    if (isDragging) return

    const animate = () => {
      const current = currentIndex
      const target = targetIndexRef.current
      
      if (Math.abs(current - target) > 0.01) {
        const diff = target - current
        const newIndex = current + diff * scrollEase
        setCurrentIndex(newIndex)
      } else {
        setCurrentIndex(target)
      }
    }

    const intervalId = setInterval(animate, 16)
    return () => clearInterval(intervalId)
  }, [currentIndex, isDragging, scrollEase])

  React.useEffect(() => {
    if (onIndexChange && !isDragging) {
      onIndexChange(Math.round(currentIndex))
    }
  }, [currentIndex, onIndexChange, isDragging])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
    setCurrentX(e.clientX)
    scrollVelocityRef.current = 0
  }

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX
    scrollVelocityRef.current = (newX - currentX) * scrollSpeed * 0.01
    setCurrentX(newX)
  }, [isDragging, currentX, scrollSpeed])

  const handleMouseUp = React.useCallback(() => {
    if (!isDragging) return
    
    const deltaX = startX - currentX
    const threshold = 50

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        rotateItems('right')
      } else {
        rotateItems('left')
      }
    }

    setIsDragging(false)
    setStartX(0)
    setCurrentX(0)
    scrollVelocityRef.current = 0
  }, [isDragging, startX, currentX])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    setCurrentX(e.touches[0].clientX)
    scrollVelocityRef.current = 0
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const newX = e.touches[0].clientX
    scrollVelocityRef.current = (newX - currentX) * scrollSpeed * 0.01
    setCurrentX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    
    const deltaX = startX - currentX
    const threshold = 50

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        rotateItems('right')
      } else {
        rotateItems('left')
      }
    }

    setIsDragging(false)
    setStartX(0)
    setCurrentX(0)
    scrollVelocityRef.current = 0
  }

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const getVisibleItems = () => {
    if (isDragging) {
      return items.map((item, idx) => ({ item, index: idx }))
    }
    
    const visible: Array<{ item: CircularGalleryItem; index: number }> = []
    const half = Math.floor(visibleCount / 2)

    for (let i = -half; i <= half; i++) {
      const index = (Math.round(currentIndex) + i + items.length) % items.length
      visible.push({ item: items[index], index })
    }

    return visible
  }

  const visibleItems = getVisibleItems()
  const centerIndex = isDragging ? Math.floor(items.length / 2) : Math.floor(visibleCount / 2)
  
  const dragOffset = isDragging ? (currentX - startX) * scrollSpeed * 0.01 : 0
  const baseOffset = width * 1.1

  const borderRadiusPercent = Math.min(100, Math.max(0, borderRadius * 100))

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full flex items-center justify-center", className)}
    >
      <button
        onClick={() => rotateItems('left')}
        className="absolute left-0 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white transition-all duration-200 shadow-lg hover:scale-110"
        aria-label="Previous"
        type="button"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div 
        className="relative w-full flex items-center justify-center select-none overflow-hidden"
        style={{ 
          height: `${height + 80}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {visibleItems.map((itemData, idx) => {
          const item = itemData.item
          const actualIndex = itemData.index
          
          let relativeIndex = actualIndex - Math.round(currentIndex)
          
          if (relativeIndex > items.length / 2) {
            relativeIndex -= items.length
          } else if (relativeIndex < -items.length / 2) {
            relativeIndex += items.length
          }
          
          const isCenter = !isDragging && idx === centerIndex
          const offset = relativeIndex
          
          const position = offset * baseOffset + dragOffset
          const maxDistance = isDragging ? items.length / 2 : visibleCount / 2
          const distance = Math.abs(offset) + Math.abs(dragOffset / baseOffset)
          
          // Используем параметр bend для изгиба
          const normalizedDistance = isDragging 
            ? Math.min(Math.abs(offset) / maxDistance, 1)
            : Math.abs(offset) / maxDistance
          const y = -Math.pow(normalizedDistance, 1.5) * bend
          
          const scale = isCenter && Math.abs(dragOffset) < 10 ? 1 : Math.max(0.65, 1 - distance * 0.12)
          const opacity = isCenter && Math.abs(dragOffset) < 10 ? 1 : Math.max(0.5, 1 - distance * 0.15)
          const zIndex = isCenter ? 10 : (isDragging ? items.length - Math.abs(offset) : visibleCount - Math.abs(offset))

          const imageUrl = getItemImage(item)

          return (
            <div
              key={`${item.id}-${actualIndex}`}
              className="absolute transition-all ease-out"
              style={{
                transform: `translateX(${position}px) translateY(${y}px) scale(${scale})`,
                opacity,
                zIndex,
                left: '50%',
                top: '50%',
                marginLeft: `-${width / 2}px`,
                marginTop: `-${height / 2}px`,
                pointerEvents: isDragging ? 'none' : 'auto',
                transitionDuration: isDragging ? '0ms' : `${300 / scrollSpeed}ms`,
              }}
              onClick={(e) => {
                if (isDragging) {
                  e.preventDefault()
                  return
                }
                if (isCenter && onItemClick) {
                  onItemClick(item)
                } else if (!isCenter) {
                  rotateItems(offset > 0 ? 'right' : 'left')
                }
              }}
            >
              <div
                className="overflow-hidden border-2 bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300"
                style={{
                  width: width,
                  height: height,
                  borderRadius: `${borderRadiusPercent}%`,
                  borderColor: isCenter && Math.abs(dragOffset) < 10
                    ? 'rgba(236, 72, 153, 0.7)' 
                    : 'rgba(255, 255, 255, 0.2)',
                  boxShadow: isCenter && Math.abs(dragOffset) < 10
                    ? '0 0 30px rgba(236, 72, 153, 0.5), 0 0 60px rgba(236, 72, 153, 0.3)'
                    : '0 4px 15px rgba(0, 0, 0, 0.4)',
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                    loading="lazy"
                    style={{
                      borderRadius: `${borderRadiusPercent}%`,
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/30 to-purple-500/30 text-white font-bold text-xl pointer-events-none">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isCenter && Math.abs(dragOffset) < 10 && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-white text-sm font-semibold whitespace-nowrap px-4 py-2 bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg">
                  {item.name}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => rotateItems('right')}
        className="absolute right-0 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white transition-all duration-200 shadow-lg hover:scale-110"
        aria-label="Next"
        type="button"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  )
}
