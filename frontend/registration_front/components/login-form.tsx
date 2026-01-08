"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
          {showForgotPassword 
            ? "Восстановление пароля"
            : isLogin 
              ? "Добро пожаловать" 
              : "Создать аккаунт"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {showForgotPassword
            ? resetStep === 'email'
              ? "Введите email для восстановления пароля"
              : resetStep === 'code'
                ? `Код отправлен на ${resetEmail}. Введите код из письма:`
                : "Введите новый пароль"
            : isLogin 
              ? "Войдите в свою учётную запись" 
              : "Заполните форму для регистрации"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showForgotPassword ? (
          resetStep === 'email' ? (
            <form 
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault()
                setIsLoading(true)
                setError(null)
                setSuccess(null)

                try {
                  const response = await fetch('/api/v1/auth/forgot-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmail }),
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'Ошибка при отправке кода' }))
                    throw new Error(errorData.detail || 'Ошибка при отправке кода')
                  }

                  setSuccess('Код отправлен на email')
                  setResetStep('code')
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Произошла ошибка')
                } finally {
                  setIsLoading(false)
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="reset_email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="reset_email"
                  type="email"
                  placeholder="example@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all"
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md">
                  {success}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || !resetEmail}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all"
                >
                  {isLoading ? "Отправка..." : "Отправить код"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmail('')
                    setError(null)
                    setSuccess(null)
                  }}
                  disabled={isLoading}
                  className="w-full border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all bg-transparent"
                >
                  Отмена
                </Button>
              </div>
            </form>
          ) : resetStep === 'code' ? (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!resetCode || resetCode.length !== 6) {
                  setError('Введите 6-значный код')
                  return
                }
                setResetStep('password')
                setError(null)
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="reset_code" className="text-sm font-medium text-foreground">
                  Код восстановления
                </Label>
                <Input
                  id="reset_code"
                  type="text"
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  disabled={isLoading}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || !resetCode || resetCode.length !== 6}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all"
                >
                  Продолжить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetStep('email')
                    setResetCode('')
                    setError(null)
                  }}
                  disabled={isLoading}
                  className="w-full border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all bg-transparent"
                >
                  Назад
                </Button>
              </div>
            </form>
          ) : (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault()
                setIsLoading(true)
                setError(null)
                setSuccess(null)

                if (newPassword !== confirmPassword) {
                  setError('Пароли не совпадают')
                  setIsLoading(false)
                  return
                }

                if (newPassword.length < 8) {
                  setError('Пароль должен содержать минимум 8 символов')
                  setIsLoading(false)
                  return
                }

                try {
                  const response = await fetch('/api/v1/auth/reset-password/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: resetEmail,
                      verification_code: resetCode,
                      new_password: newPassword,
                    }),
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'Ошибка при сбросе пароля' }))
                    throw new Error(errorData.detail || 'Ошибка при сбросе пароля')
                  }

                  setSuccess('Пароль успешно изменен')
                  setTimeout(() => {
                    setShowForgotPassword(false)
                    setResetStep('email')
                    setResetEmail('')
                    setResetCode('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setError(null)
                    setSuccess(null)
                  }, 2000)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Произошла ошибка')
                } finally {
                  setIsLoading(false)
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-sm font-medium text-foreground">
                  Новый пароль
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Введите новый пароль"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-sm font-medium text-foreground">
                  Подтвердите пароль
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Повторите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all"
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md">
                  {success}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all"
                >
                  {isLoading ? "Сброс..." : "Сбросить пароль"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetStep('code')
                    setNewPassword('')
                    setConfirmPassword('')
                    setError(null)
                  }}
                  disabled={isLoading}
                  className="w-full border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all bg-transparent"
                >
                  Назад
                </Button>
              </div>
            </form>
          )
        ) : (
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

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true)
                    setResetStep('email')
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Забыл пароль?
                </button>
              </div>
            )}

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
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>

        {!showForgotPassword && (
          <Button
            variant="outline"
            className="w-full border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all bg-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            Войти через Google
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
