import { NavigationMenuDemo } from "@/components/navigation-menu-demo"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <NavigationMenuDemo />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Navigation Menu Demo</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Это демонстрация навигационного меню с различными вариантами отображения. Меню адаптивное и корректно
              работает на мобильных устройствах.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Особенности меню:</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Выпадающие панели с различными макетами</li>
              <li>Адаптивный дизайн для мобильных устройств</li>
              <li>Поддержка иконок и описаний</li>
              <li>Несколько стилей отображения элементов</li>
              <li>Плавные анимации и переходы</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h3 className="text-xl font-semibold">Попробуйте</h3>
            <p className="text-muted-foreground">
              Наведите курсор или нажмите на элементы меню выше, чтобы увидеть различные варианты выпадающих панелей.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
