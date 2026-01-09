# Инструкция по переиндексации сайта в поисковых системах

## Проблема
Поисковые системы (Yandex, Google) могут показывать старую версию сайта без описания и аватарки, так как они кэшируют мета-теги.

## Решение: Принудительная переиндексация

### 1. Yandex Webmaster

1. Зайдите в [Yandex Webmaster](https://webmaster.yandex.ru/)
2. Выберите ваш сайт: `https://cherrylust.art/`
3. Перейдите в раздел **"Индексирование"** → **"Проверка URL"**
4. Введите URL: `https://cherrylust.art/`
5. Нажмите **"Проверить"**
6. После проверки нажмите **"Добавить в очередь на переиндексацию"**
7. Подождите несколько часов (обычно 2-24 часа)

### 2. Google Search Console

1. Зайдите в [Google Search Console](https://search.google.com/search-console)
2. Выберите ваш сайт: `https://cherrylust.art/`
3. Перейдите в раздел **"Проверка URL"**
4. Введите URL: `https://cherrylust.art/`
5. Нажмите **"Запросить индексирование"**
6. Подождите несколько часов

### 3. Проверка мета-тегов

Проверьте, что мета-теги доступны:

```bash
curl -s https://cherrylust.art/ | grep -E "(og:title|og:description|og:image|description)"
```

Должны быть видны:
- `<title>Cherry Lust - AI Чат с виртуальными персонажами 18+</title>`
- `<meta name="description" content="...">`
- `<meta property="og:image" content="https://cherrylust.art/site-avatar.jpg">`

### 4. Проверка изображения

Убедитесь, что изображение доступно:
- Откройте в браузере: `https://cherrylust.art/site-avatar.jpg`
- Должно отображаться изображение

### 5. Инструменты для проверки

- **Yandex Validator**: https://webmaster.yandex.ru/tools/structured-data/
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Facebook Debugger**: https://developers.facebook.com/tools/debug/ (для проверки Open Graph)

### 6. Время обновления

- **Yandex**: обычно 2-24 часа после запроса переиндексации
- **Google**: обычно 1-7 дней (может быть быстрее после запроса)

### 7. Если не помогло

1. Проверьте, что файлы задеплоены на сервер
2. Проверьте, что nginx правильно отдает статические файлы
3. Очистите кэш браузера и проверьте снова
4. Убедитесь, что robots.txt не блокирует индексацию

## Текущий статус

✅ Мета-теги добавлены в `frontend/index.html`
✅ Изображение `site-avatar.jpg` доступно (35KB, 668x667)
✅ Open Graph теги настроены
✅ JSON-LD структурированные данные добавлены
✅ Sitemap.xml добавлен в Search Console

**Следующий шаг**: Запросить переиндексацию в Yandex Webmaster и Google Search Console