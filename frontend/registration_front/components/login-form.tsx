"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-3 text-center pb-8">
        <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 text-primary-foreground"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" x2="3" y1="12" y2="12" />
          </svg>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-balance">
          {isLogin ? "Добро пожаловать" : "Создать аккаунт"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isLogin ? "Войдите в свою учётную запись" : "Заполните форму для регистрации"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-foreground">
              Имя пользователя
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Введите имя пользователя"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Пароль
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Введите пароль"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all"
            >
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all bg-transparent"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Регистрация" : "Уже есть аккаунт"}
            </Button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all bg-transparent"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
          </svg>
          Войти через Google
        </Button>
      </CardContent>
    </Card>
  )
}
