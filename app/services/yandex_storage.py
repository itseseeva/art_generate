"""
Сервис для работы с Yandex Cloud Storage.
Обеспечивает загрузку сгенерированных изображений в бакет Яндекс Облака.
"""

import os
import logging
from typing import Optional, Union, BinaryIO
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import mimetypes
import re

logger = logging.getLogger(__name__)


def transliterate_cyrillic_to_ascii(text: str) -> str:
    """
    Транслитерирует кириллические символы в ASCII для использования в URL.
    
    Args:
        text: Текст с кириллическими символами
        
    Returns:
        str: Текст с ASCII символами
    """
    if not text:
        return 'unknown'
    
    # Словарь транслитерации кириллицы в латиницу
    cyrillic_to_ascii = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    }
    
    result = ""
    for char in text:
        # Проверяем, является ли символ кириллическим
        if '\u0400' <= char <= '\u04FF':  # Диапазон кириллических символов
            result += cyrillic_to_ascii.get(char, char)
        elif char.isalnum() or char in '-_.':
            result += char
        else:
            # Заменяем не-ASCII символы на подчеркивания
            result += '_'
    
    # Убираем множественные подчеркивания и подчеркивания в начале/конце
    result = re.sub(r'_+', '_', result).strip('_')
    
    # Если результат пустой или содержит только подчеркивания, возвращаем 'unknown'
    if not result or result == '_':
        return 'unknown'
    
    return result.lower()


class YandexCloudStorageService:
    """
    Сервис для работы с Yandex Cloud Storage.
    
    Предоставляет методы для загрузки файлов в бакет Яндекс Облака,
    получения публичных URL и управления файлами.
    """
    
    def __init__(self):
        """
        Инициализация сервиса Yandex Cloud Storage.
        
        Получает настройки из переменных окружения:
        - BUCKET_NAME: название бакета
        - YANDEX-KEY: ключ доступа
        - SECRET_KEY: секретный ключ
        - ENDPOINT_URL: URL эндпоинта
        """
        # Загружаем переменные окружения из .env файла
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ImportError:
            pass  # python-dotenv не установлен, используем системные переменные
        
        # Используем новые стандартные названия переменных
        # Fallback на старые для обратной совместимости
        self.bucket_name = (
            os.getenv("YANDEX_BUCKET_NAME") or
            os.getenv("BUCKET_NAME")
        )
        self.access_key = (
            os.getenv("YANDEX_ACCESS_KEY") or
            os.getenv("YANDEX_KEY") or
            os.getenv("YANDEX-KEY") or
            os.getenv("AWS_ACCESS_KEY_ID")
        )
        self.secret_key = (
            os.getenv("YANDEX_SECRET_KEY") or
            os.getenv("SECRET_KEY") or
            os.getenv("AWS_SECRET_ACCESS_KEY")
        )
        self.endpoint_url = (
            os.getenv("YANDEX_ENDPOINT_URL") or
            os.getenv("ENDPOINT_URL") or
            "https://storage.yandexcloud.net"
        )
        
        # Логируем наличие переменных (без значений для безопасности)
        logger.info(
            f"Yandex Cloud Storage переменные: "
            f"YANDEX_BUCKET_NAME={'установлен' if self.bucket_name else 'НЕ УСТАНОВЛЕН'}, "
            f"YANDEX_ACCESS_KEY={'установлен' if self.access_key else 'НЕ УСТАНОВЛЕН'}, "
            f"YANDEX_SECRET_KEY={'установлен' if self.secret_key else 'НЕ УСТАНОВЛЕН'}, "
            f"YANDEX_ENDPOINT_URL={'установлен' if self.endpoint_url else 'НЕ УСТАНОВЛЕН'}"
        )
        
        # Валидация обязательных параметров
        if not all([self.bucket_name, self.access_key, self.secret_key, self.endpoint_url]):
            missing = []
            if not self.bucket_name:
                missing.append("YANDEX_BUCKET_NAME")
            if not self.access_key:
                missing.append("YANDEX_ACCESS_KEY")
            if not self.secret_key:
                missing.append("YANDEX_SECRET_KEY")
            if not self.endpoint_url:
                missing.append("YANDEX_ENDPOINT_URL")
            
            error_msg = (
                f"Отсутствуют обязательные переменные окружения для "
                f"Yandex Cloud Storage: {', '.join(missing)}. "
                f"Убедитесь, что они установлены в docker-compose.yml или в .env файле."
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Дополнительная проверка на валидность значений
        if not self.access_key or self.access_key.strip() == "":
            error_msg = (
                "YANDEX-KEY установлен, но имеет пустое значение. "
                "Проверьте переменные окружения в docker-compose.yml."
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Дополнительная проверка перед созданием клиента
        # Yandex Cloud ключи доступа обычно имеют длину 20+ символов
        access_key_len = len(self.access_key.strip()) if self.access_key else 0
        if not self.access_key or access_key_len < 15:
            # Логируем первые 3 символа для диагностики (безопасно)
            key_preview = (
                self.access_key[:3] + "..."
                if self.access_key and len(self.access_key) >= 3
                else "пусто"
            )
            error_msg = (
                f"YANDEX-KEY имеет недопустимое значение. "
                f"Длина ключа: {access_key_len} (ожидается минимум 15 символов). "
                f"Первые символы: {key_preview}. "
                f"Проверьте переменные окружения в docker-compose.yml. "
                f"Убедитесь, что переменная YANDEX-KEY установлена в .env файле или в системе. "
                f"Проблема может быть в том, что переменная с дефисом не правильно передается в Docker."
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Настройка клиента S3 для Yandex Cloud
        try:
            self.s3_client = boto3.client(
                's3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                config=Config(
                    region_name='ru-central1',
                    signature_version='s3v4',
                    s3={
                        'addressing_style': 'virtual'
                    }
                )
            )
        except Exception as e:
            logger.error(f"Ошибка создания S3 клиента: {e}")
            logger.error(f"Проверьте переменные: access_key длина={len(self.access_key) if self.access_key else 0}, "
                        f"secret_key длина={len(self.secret_key) if self.secret_key else 0}, "
                        f"endpoint_url={self.endpoint_url}")
            raise
        
        # Пул потоков для асинхронных операций
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        logger.info(f"YandexCloudStorageService инициализирован для бакета: {self.bucket_name}")
    
    async def upload_file(
        self,
        file_data: Union[bytes, BinaryIO, str],
        object_key: str,
        content_type: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """
        Загружает файл в бакет Yandex Cloud Storage.
        
        Args:
            file_data: Данные файла (bytes, файловый объект или путь к файлу)
            object_key: Ключ объекта в бакете (путь к файлу)
            content_type: MIME-тип файла
            metadata: Дополнительные метаданные
            
        Returns:
            str: Публичный URL загруженного файла
            
        Raises:
            ClientError: Ошибка при загрузке файла
            NoCredentialsError: Ошибка аутентификации
        """
        try:
            # Определяем тип контента если не указан
            if not content_type:
                content_type, _ = mimetypes.guess_type(object_key)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            # Подготавливаем метаданные
            extra_args = {
                'ContentType': content_type,
                'CacheControl': 'max-age=31536000'  # Кэширование на год
            }
            
            if metadata:
                # Фильтруем метаданные, оставляя только ASCII символы
                ascii_metadata = {}
                for key, value in metadata.items():
                    # Проверяем, что ключ содержит только ASCII символы
                    if key.encode('ascii', errors='ignore').decode('ascii') == key:
                        # Проверяем значение - если содержит не-ASCII, кодируем в base64
                        try:
                            value.encode('ascii')
                            ascii_metadata[key] = str(value)
                        except UnicodeEncodeError:
                            # Кодируем не-ASCII значения в base64
                            import base64
                            encoded_value = base64.b64encode(str(value).encode('utf-8')).decode('ascii')
                            ascii_metadata[f"{key}_encoded"] = encoded_value
                
                if ascii_metadata:
                    extra_args['Metadata'] = ascii_metadata
            
            # Выполняем загрузку в отдельном потоке
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                self._upload_file_sync,
                file_data,
                object_key,
                extra_args
            )
            
            # Используем подписанный URL для надежного доступа
            best_url = self.get_best_url(object_key)
            
            logger.info(f"Файл успешно загружен: {object_key} -> {best_url}")
            return best_url
            
        except Exception as e:
            logger.error(f"Ошибка при загрузке файла {object_key}: {str(e)}")
            raise
    
    def _upload_file_sync(
        self,
        file_data: Union[bytes, BinaryIO, str],
        object_key: str,
        extra_args: dict
    ) -> None:
        """
        Синхронная загрузка файла в бакет.
        
        Args:
            file_data: Данные файла
            object_key: Ключ объекта
            extra_args: Дополнительные аргументы для загрузки
        """
        try:
            # Если передан путь к файлу, открываем его
            if isinstance(file_data, str):
                with open(file_data, 'rb') as f:
                    self.s3_client.upload_fileobj(f, self.bucket_name, object_key, ExtraArgs=extra_args)
            else:
                # Если передан файловый объект или bytes
                if isinstance(file_data, bytes):
                    from io import BytesIO
                    file_data = BytesIO(file_data)
                
                self.s3_client.upload_fileobj(file_data, self.bucket_name, object_key, ExtraArgs=extra_args)
                
        except ClientError as e:
            # Детальное логирование ошибки от boto3
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"Ошибка синхронной загрузки {object_key}: {error_code} - {error_message}")
            logger.error(f"Детали ошибки: Response={e.response}")
            raise
        except Exception as e:
            logger.error(f"Ошибка синхронной загрузки {object_key}: {str(e)}")
            logger.error(f"Тип ошибки: {type(e).__name__}")
            raise
    
    async def upload_image_from_base64(
        self,
        base64_data: str,
        filename: str,
        folder: str = "generated_images",
        metadata: Optional[dict] = None
    ) -> str:
        """
        Загружает изображение из base64 строки в бакет.
        
        Args:
            base64_data: Base64 строка с изображением
            filename: Имя файла
            folder: Папка в бакете
            metadata: Дополнительные метаданные
            
        Returns:
            str: Публичный URL загруженного изображения
        """
        try:
            import base64
            from io import BytesIO
            
            # Декодируем base64
            image_bytes = base64.b64decode(base64_data)
            
            # Формируем ключ объекта
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_key = f"{folder}/{timestamp}_{filename}"
            
            # Подготавливаем метаданные
            upload_metadata = {
                'uploaded_at': datetime.now().isoformat(),
                'source': 'stable_diffusion_generation',
                **(metadata or {})
            }
            
            # Загружаем файл
            return await self.upload_file(
                file_data=image_bytes,
                object_key=object_key,
                content_type='image/png',
                metadata=upload_metadata
            )
            
        except Exception as e:
            logger.error(f"Ошибка при загрузке изображения из base64: {str(e)}")
            raise
    
    async def upload_image_from_path(
        self,
        file_path: Union[str, Path],
        folder: str = "generated_images",
        custom_filename: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """
        Загружает изображение из локального файла в бакет.
        
        Args:
            file_path: Путь к локальному файлу
            folder: Папка в бакете
            custom_filename: Пользовательское имя файла
            metadata: Дополнительные метаданные
            
        Returns:
            str: Публичный URL загруженного изображения
        """
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                raise FileNotFoundError(f"Файл не найден: {file_path}")
            
            # Определяем имя файла
            if custom_filename:
                filename = custom_filename
            else:
                filename = file_path.name
            
            # Формируем ключ объекта
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_key = f"{folder}/{timestamp}_{filename}"
            
            # Подготавливаем метаданные
            upload_metadata = {
                'uploaded_at': datetime.now().isoformat(),
                'source': 'stable_diffusion_generation',
                'original_path': str(file_path),
                **(metadata or {})
            }
            
            # Загружаем файл
            return await self.upload_file(
                file_data=str(file_path),
                object_key=object_key,
                content_type='image/png',
                metadata=upload_metadata
            )
            
        except Exception as e:
            logger.error(f"Ошибка при загрузке изображения из файла {file_path}: {str(e)}")
            raise
    
    async def delete_file(self, object_key: str) -> bool:
        """
        Удаляет файл из бакета.
        
        Args:
            object_key: Ключ объекта для удаления
            
        Returns:
            bool: True если файл удален успешно
        """
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=object_key
                )
            )
            
            logger.info(f"Файл удален из бакета: {object_key}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка при удалении файла {object_key}: {str(e)}")
            return False
    
    async def file_exists(self, object_key: str) -> bool:
        """
        Проверяет существование файла в бакете.
        
        Args:
            object_key: Ключ объекта для проверки
            
        Returns:
            bool: True если файл существует
        """
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.head_object(
                    Bucket=self.bucket_name,
                    Key=object_key
                )
            )
            return True
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise
    
    def get_public_url(self, object_key: str) -> str:
        """
        Получает публичный URL файла через прокси Nginx.
        
        Args:
            object_key: Ключ объекта
            
        Returns:
            str: Публичный URL через домен cherrylust.art
        """
        # Возвращаем путь через прокси Nginx, который перенаправляет на Yandex.Бакет
        return f"https://cherrylust.art/media/{object_key}"
    
    @staticmethod
    def convert_yandex_url_to_proxy(url: str) -> str:
        """
        Преобразует старый URL Яндекс.Бакета в новый URL через прокси.
        
        Args:
            url: Старый URL (может быть уже новый или старый)
            
        Returns:
            str: URL через прокси cherrylust.art/media/
        """
        if not url:
            return url
        
        # Если URL уже использует прокси, возвращаем как есть
        if 'cherrylust.art/media/' in url:
            return url
        
        # Извлекаем object_key из старого URL
        # Форматы: 
        # https://bucket-name.storage.yandexcloud.net/path/to/file
        # https://storage.yandexcloud.net/bucket-name/path/to/file
        if '.storage.yandexcloud.net/' in url:
            # Формат: https://bucket-name.storage.yandexcloud.net/path/to/file
            object_key = url.split('.storage.yandexcloud.net/')[-1]
            return f"https://cherrylust.art/media/{object_key}"
        elif 'storage.yandexcloud.net/' in url:
            # Формат: https://storage.yandexcloud.net/bucket-name/path/to/file
            # или: https://storage.yandexcloud.net/jfpohpdofnhd/generated/file.png
            parts = url.split('storage.yandexcloud.net/')
            if len(parts) > 1:
                # Пропускаем bucket-name и берем остальное
                path_parts = parts[1].split('/', 1)
                if len(path_parts) > 1:
                    # path_parts[0] - это bucket-name, path_parts[1] - это путь к файлу
                    object_key = path_parts[1]
                    return f"https://cherrylust.art/media/{object_key}"
                elif len(path_parts) == 1:
                    # Если нет слеша после bucket-name, значит весь путь после storage.yandexcloud.net/ это object_key
                    # Но это маловероятно, оставляем как есть
                    pass
        
        # Если не удалось распарсить, возвращаем как есть
        return url
    
    def get_presigned_url(self, object_key: str, expiration: int = 3600) -> str:
        """
        Получает подписанный URL файла с временным доступом.
        
        Args:
            object_key: Ключ объекта
            expiration: Время жизни URL в секундах (по умолчанию 1 час)
            
        Returns:
            str: Подписанный URL
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': object_key},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            logger.error(f"Ошибка генерации подписанного URL: {str(e)}")
            # Fallback к публичному URL
            return self.get_public_url(object_key)
    
    async def list_files(self, prefix: str = "", max_keys: int = 1000) -> list:
        """
        Получает список файлов в бакете.
        
        Args:
            prefix: Префикс для фильтрации файлов
            max_keys: Максимальное количество файлов
            
        Returns:
            list: Список файлов
        """
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=prefix,
                    MaxKeys=max_keys
                )
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'url': self.get_public_url(obj['Key'])
                    })
            
            return files
            
        except Exception as e:
            logger.error(f"Ошибка при получении списка файлов: {str(e)}")
            raise
    
    def decode_metadata(self, metadata: dict) -> dict:
        """
        Декодирует метаданные, восстанавливая кириллические символы из base64.
        
        Args:
            metadata: Словарь с метаданными
            
        Returns:
            dict: Декодированные метаданные
        """
        decoded_metadata = {}
        
        for key, value in metadata.items():
            if key.endswith('_encoded'):
                # Декодируем base64 значения
                try:
                    import base64
                    decoded_value = base64.b64decode(value).decode('utf-8')
                    original_key = key.replace('_encoded', '')
                    decoded_metadata[original_key] = decoded_value
                except Exception:
                    # Если декодирование не удалось, оставляем как есть
                    decoded_metadata[key] = value
            else:
                decoded_metadata[key] = value
        
        return decoded_metadata
    
    def get_best_url(self, object_key: str) -> str:
        """
        Получает публичный URL файла.
        Использует публичный доступ к бакету.
        
        Args:
            object_key: Ключ объекта
            
        Returns:
            str: Публичный URL файла
        """
        # Используем публичный URL (постоянный доступ)
        public_url = self.get_public_url(object_key)
        logger.info(f"Используем публичный URL: {public_url}")
        return public_url


# Глобальный экземпляр сервиса (ленивая инициализация)
yandex_storage_service = None

def get_yandex_storage_service() -> YandexCloudStorageService:
    """Получить экземпляр сервиса Yandex Cloud Storage с ленивой инициализацией."""
    global yandex_storage_service
    if yandex_storage_service is None:
        yandex_storage_service = YandexCloudStorageService()
    return yandex_storage_service
