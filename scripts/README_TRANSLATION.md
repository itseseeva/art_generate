# Инструкция по запуску автоматического перевода

## Автоматический перевод при билде Docker

Перевод запускается автоматически через отдельный сервис `art_generation_translator` в docker-compose.yml.

### Как это работает:
1. При `docker compose up` запускается backend
2. Через 15 секунд запускается сервис translator
3. Translator переводит все описания персонажей через API
4. После завершения контейнер останавливается

### Ручной запуск перевода

Если нужно перевести описания вручную:

```bash
# В Docker
docker compose run --rm art_generation_translator

# Локально (с активным venv)
python scripts/translate_characters.py --api-url http://localhost:8000

# С дополнительными параметрами
python scripts/translate_characters.py \
  --api-url http://localhost:8000 \
  --batch-size 10 \
  --force  # Переводит даже если description_en уже заполнен
```

### Параметры скрипта

- `--api-url` - URL API сервера (по умолчанию: http://localhost:8000)
- `--batch-size` - Количество персонажей для обработки за раз (по умолчанию: 10)
- `--force` - Переводить даже если description_en уже заполнен

### Проверка результатов

```sql
-- Проверить, сколько персонажей имеют английские описания
SELECT 
  COUNT(*) as total,
  COUNT(description_en) as with_english,
  COUNT(*) - COUNT(description_en) as without_english
FROM characters;

-- Посмотреть примеры переводов
SELECT 
  name,
  LEFT(description, 50) as ru_desc,
  LEFT(description_en, 50) as en_desc
FROM characters
WHERE description_en IS NOT NULL
LIMIT 5;
```

### Troubleshooting

**Проблема:** Скрипт не может подключиться к API
```
Решение: Убедитесь, что backend запущен и доступен по указанному URL
```

**Проблема:** Перевод не работает
```
Решение: Проверьте логи translator контейнера:
docker compose logs art_generation_translator
```

**Проблема:** Нужно перезапустить перевод
```
Решение: 
docker compose rm -f art_generation_translator
docker compose up art_generation_translator
```
