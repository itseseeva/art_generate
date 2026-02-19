# Инструкция по применению изменений БД

## Простой способ (без миграции)

Вместо создания merge миграции, просто добавьте поле `description_en` вручную:

### 1. Подключитесь к БД

```bash
# Локально
psql -U your_user -d your_database

# Или через Docker
docker exec -it art_generation_postgres psql -U postgres -d art_generation_db
```

### 2. Выполните SQL

```sql
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS description_en TEXT;
```

### 3. Проверьте

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'characters' 
  AND column_name = 'description_en';
```

Должно вернуть:
```
 column_name   | data_type 
---------------+-----------
 description_en | text
```

### 4. Готово!

Теперь можно запускать автоперевод:

```bash
# Локально
python -m app.scripts.auto_translate_descriptions

# В Docker (автоматически при docker compose up)
docker compose up -d
```

## Альтернатива: SQL скрипт

Также создан файл `scripts/add_description_en.sql` - можно выполнить его:

```bash
psql -U your_user -d your_database -f scripts/add_description_en.sql
```

## Проверка работы

После добавления поля проверьте автоперевод:

```bash
# Запустите скрипт
python -m app.scripts.auto_translate_descriptions

# Проверьте результат
psql -U your_user -d your_database -c "SELECT name, description_en FROM characters LIMIT 5;"
```
