# Тесты для мультиязычности (i18n)

Эта папка содержит тесты для функциональности мультиязычной поддержки (RU/EN).

## Структура тестов

- `test_i18n_utils.py` - Тесты утилит i18n (определение языка, мета-теги, hreflang)
- `test_auto_translation.py` - Тесты автоматического перевода описаний
- `test_seo_endpoint.py` - Тесты SEO эндпоинта `/seo-meta/character/{id}`

## Запуск тестов

### Запустить все тесты i18n
```bash
pytest tests/i18n/ -v
```

### Запустить только тесты перевода
```bash
pytest tests/i18n/test_auto_translation.py -v
```

### Запустить только тесты утилит
```bash
pytest tests/i18n/test_i18n_utils.py -v
```

### Запустить только тесты SEO эндпоинта
```bash
pytest tests/i18n/test_seo_endpoint.py -v
```

### Запустить с подробным выводом
```bash
pytest tests/i18n/ -v --tb=short
```

### Запустить конкретный тест
```bash
pytest tests/i18n/test_auto_translation.py::TestTranslateWithRetry::test_translate_cyrillic_text -v
```

## Покрытие тестами

### Утилиты i18n (test_i18n_utils.py)
- ✅ Определение языка по Accept-Language
- ✅ Генерация мета-тегов на RU/EN
- ✅ Генерация hreflang тегов
- ✅ SEO текст футера на RU/EN

### Автоперевод (test_auto_translation.py)
- ✅ Перевод текста с кириллицей
- ✅ Пропуск текста без кириллицы
- ✅ Обработка пустого текста
- ✅ Retry при сетевых ошибках
- ✅ Fallback на оригинал после исчерпания попыток
- ✅ Перевод персонажей без английского описания
- ✅ Пропуск персонажей с английским описанием
- ✅ Откат транзакции при ошибке

### SEO эндпоинт (test_seo_endpoint.py)
- ✅ Ответ для русского бота
- ✅ Ответ для английского бота
- ✅ Наличие hreflang тегов
- ✅ 404 при отсутствии персонажа

## Требования

```bash
pip install pytest pytest-asyncio
```

## Примеры использования

```bash
# Быстрый запуск всех тестов
pytest tests/i18n/

# С покрытием кода
pytest tests/i18n/ --cov=app.utils.i18n --cov=app.scripts.auto_translate_descriptions

# Только неудачные тесты
pytest tests/i18n/ --lf

# Остановиться на первой ошибке
pytest tests/i18n/ -x
```
