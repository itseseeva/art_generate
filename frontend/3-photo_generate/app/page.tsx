"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PhotoGeneratorPage() {
  const [prompt, setPrompt] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)

    // Simulate generation with placeholder images
    setTimeout(() => {
      const newImages = [
        `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(prompt + " style 1")}`,
        `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(prompt + " style 2")}`,
        `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(prompt + " style 3")}`,
      ]
      setImages(newImages)
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground text-balance">Генератор фото</h1>
          <p className="mt-2 text-muted-foreground">Введите промпт и создайте три уникальных изображения</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Left side - Generated images */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Сгенерированные фото</h2>

            {images.length === 0 && !isGenerating && (
              <Card className="flex min-h-[600px] items-center justify-center border-dashed bg-card">
                <p className="text-muted-foreground">Здесь появятся ваши изображения</p>
              </Card>
            )}

            {isGenerating && (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="flex aspect-square items-center justify-center bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </Card>
                ))}
              </div>
            )}

            {images.length > 0 && !isGenerating && (
              <div className="grid gap-4 md:grid-cols-3">
                {images.map((image, index) => (
                  <Card key={index} className="overflow-hidden bg-card p-2">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Generated ${index + 1}`}
                      className="h-full w-full rounded object-cover"
                    />
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right side - Prompt input */}
          <div className="space-y-4">
            <Card className="sticky top-8 bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold text-card-foreground">Создать изображение</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="prompt" className="text-sm font-medium text-card-foreground">
                    Промпт
                  </label>
                  <Textarea
                    id="prompt"
                    placeholder="Опишите изображение, которое хотите создать..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[200px] resize-none bg-input text-foreground"
                    disabled={isGenerating}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    "Сгенерировать"
                  )}
                </Button>

                <div className="space-y-2 rounded-lg bg-secondary p-4">
                  <h3 className="text-sm font-medium text-secondary-foreground">Советы:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Будьте конкретны в описании</li>
                    <li>• Укажите стиль (реализм, арт, абстракция)</li>
                    <li>• Добавьте детали освещения и настроения</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
