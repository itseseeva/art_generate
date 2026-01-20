"""
Утилиты для сбора и анализа статистики генерации
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json
import os
import logging

# Настраиваем логирование
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class GenerationStats:
    """Класс для сбора и анализа статистики генерации"""
    
    def __init__(self):
        """Инициализация статистики"""
        self.stats_file = "data/generation_stats.json"
        os.makedirs(os.path.dirname(self.stats_file), exist_ok=True)
        
        # Инициализируем базовую структуру статистики
        self.stats = {
            "total_generations": 0,
            "total_time": self._format_time_for_json(0),
            "average_time": self._format_time_for_json(0),
            "by_sampler": {},
            "by_steps": {},
            "by_resolution": {},
            "by_cfg_scale": {},
            "recent_generations": []
        }
        
        logger.info(
            f"Инициализация GenerationStats. "
            f"Файл статистики: {self.stats_file}"
        )
        self.stats = self._load_stats()
    
    def _format_time(self, seconds: float) -> str:
        """Форматирует время в читаемый вид"""
        return str(timedelta(seconds=int(seconds)))
        
    def _format_time_for_json(self, seconds: float) -> Dict:
        """Форматирует время для JSON"""
        return {
            "formatted": self._format_time(seconds),
            "total_seconds": seconds
        }
    
    def _load_stats(self) -> Dict:
        """Загружает статистику из файла"""
        try:
            if os.path.exists(self.stats_file):
                with open(self.stats_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Ошибка загрузки статистики: {str(e)}")
        return self.stats
    
    def _save_stats(self) -> None:
        """Сохраняет статистику в файл"""
        try:
            logger.info(f"Сохраняю статистику в файл: {self.stats_file}")
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(self.stats, f, ensure_ascii=False, indent=2)
            logger.info(f"Статистика успешно сохранена в {self.stats_file}")
        except Exception as e:
            logger.error(f"Ошибка сохранения статистики: {str(e)}")
            logger.error(f"Путь к файлу: {self.stats_file}")
            logger.error(f"Директория существует: {os.path.exists(os.path.dirname(self.stats_file))}")
    
    def add_generation(self, params: Dict, execution_time: float,
                      result: Optional[Dict] = None,
                      detailed: Optional[Dict] = None):
        """Добавляет новую генерацию в статистику
        :param params: параметры генерации (settings)
        :param execution_time: время генерации
        :param result: результат генерации (info/result)
        :param detailed: расширенный объект (если есть)
        """
        import asyncio
        
        # Логируем только метаданные без base64 изображений
        logger.info(
            f"[add_generation] Входные параметры: params={params}, "
            f"execution_time={execution_time}"
        )
        if result:
            result_summary = {
                "images_count": len(result.get("images", [])),
                "info_keys": (
                    list(result.keys()) if isinstance(result, dict) 
                    else "not_dict"
                )
            }
            logger.info(f"[add_generation] Результат: {result_summary}")
        if detailed:
            detailed_summary = {
                "keys": (
                    list(detailed.keys()) if isinstance(detailed, dict) 
                    else "not_dict"
                ),
                "status": detailed.get("status", "unknown")
            }
            logger.info(f"[add_generation] Detailed: {detailed_summary}")
        
        # Фильтруем параметры, убирая изображения и большие данные
        filtered_params = self._filter_params(params)
        
        # Фильтруем результат, убирая изображения
        filtered_result = self._filter_result(result) if result else None
        
        # Фильтруем detailed, убирая изображения
        filtered_detailed = self._filter_detailed(detailed) if detailed else None
        
        # Обновляем общую статистику
        self.stats["total_generations"] += 1
        current_total = (
            self.stats["total_time"]["total_seconds"] + execution_time
        )
        self.stats["total_time"] = self._format_time_for_json(current_total)
        self.stats["average_time"] = self._format_time_for_json(
            current_total / self.stats["total_generations"]
        )
        
        # Статистика по сэмплеру
        sampler = filtered_params.get("sampler_name", "unknown")
        if sampler not in self.stats["by_sampler"]:
            self.stats["by_sampler"][sampler] = {
                "count": 0,
                "total_time": self._format_time_for_json(0),
                "avg_time": self._format_time_for_json(0)
            }
        self.stats["by_sampler"][sampler]["count"] += 1
        current_total = (
            self.stats["by_sampler"][sampler]["total_time"]["total_seconds"]
            + execution_time
        )
        self.stats["by_sampler"][sampler]["total_time"] = (
            self._format_time_for_json(current_total)
        )
        self.stats["by_sampler"][sampler]["avg_time"] = (
            self._format_time_for_json(
                current_total / self.stats["by_sampler"][sampler]["count"]
            )
        )
        
        # Статистика по шагам
        steps = str(filtered_params.get("steps", 0))
        if steps not in self.stats["by_steps"]:
            self.stats["by_steps"][steps] = {
                "count": 0,
                "total_time": self._format_time_for_json(0),
                "avg_time": self._format_time_for_json(0)
            }
        self.stats["by_steps"][steps]["count"] += 1
        current_total = (
            self.stats["by_steps"][steps]["total_time"]["total_seconds"]
            + execution_time
        )
        self.stats["by_steps"][steps]["total_time"] = (
            self._format_time_for_json(current_total)
        )
        self.stats["by_steps"][steps]["avg_time"] = (
            self._format_time_for_json(
                current_total / self.stats["by_steps"][steps]["count"]
            )
        )
        
        # Статистика по разрешению
        resolution = f"{filtered_params.get('width', 0)}x{filtered_params.get('height', 0)}"
        if resolution not in self.stats["by_resolution"]:
            self.stats["by_resolution"][resolution] = {
                "count": 0,
                "total_time": self._format_time_for_json(0),
                "avg_time": self._format_time_for_json(0)
            }
        self.stats["by_resolution"][resolution]["count"] += 1
        current_total = (
            self.stats["by_resolution"][resolution]["total_time"]["total_seconds"]
            + execution_time
        )
        self.stats["by_resolution"][resolution]["total_time"] = (
            self._format_time_for_json(current_total)
        )
        self.stats["by_resolution"][resolution]["avg_time"] = (
            self._format_time_for_json(
                current_total / self.stats["by_resolution"][resolution]["count"]
            )
        )
        
        # Статистика по CFG Scale
        cfg_scale = str(filtered_params.get("cfg_scale", 0))
        if cfg_scale not in self.stats["by_cfg_scale"]:
            self.stats["by_cfg_scale"][cfg_scale] = {
                "count": 0,
                "total_time": self._format_time_for_json(0),
                "avg_time": self._format_time_for_json(0)
            }
        self.stats["by_cfg_scale"][cfg_scale]["count"] += 1
        current_total = (
            self.stats["by_cfg_scale"][cfg_scale]["total_time"]["total_seconds"]
            + execution_time
        )
        self.stats["by_cfg_scale"][cfg_scale]["total_time"] = (
            self._format_time_for_json(current_total)
        )
        self.stats["by_cfg_scale"][cfg_scale]["avg_time"] = (
            self._format_time_for_json(
                current_total / self.stats["by_cfg_scale"][cfg_scale]["count"]
            )
        )
        
        # Добавляем упрощенную запись о последней генерации
        if "recent_generations" not in self.stats:
            self.stats["recent_generations"] = []
        
        # Собираем упрощенный словарь только с важной информацией
        gen_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "time": f"{execution_time:.1f}s",
            "prompt": filtered_params.get("prompt", "")[:100] + "..." if len(filtered_params.get("prompt", "")) > 100 else filtered_params.get("prompt", ""),
            "steps": filtered_params.get("steps", 0),
            "sampler": filtered_params.get("sampler_name", "unknown"),
            "resolution": f"{filtered_params.get('width', 0)}x{filtered_params.get('height', 0)}",
            "cfg_scale": filtered_params.get("cfg_scale", 0),
            "service": filtered_detailed.get("service", "unknown") if filtered_detailed else "unknown"
        }
        
        # Добавляем информацию об ADetailer если есть
        if "adetailer" in filtered_params:
            adetailer = filtered_params["adetailer"]
            gen_record["adetailer"] = {
                "enabled": adetailer.get("enabled", False),
                "model": adetailer.get("model", "unknown"),
                "steps": adetailer.get("steps", 0)
            }
        
        logger.info(f"[add_generation] Формируемый упрощенный словарь: {gen_record}")
        
        self.stats["recent_generations"].append(gen_record)
        
        # Ограничиваем количество последних генераций до 20 (вместо 100)
        if len(self.stats["recent_generations"]) > 20:
            self.stats["recent_generations"] = (
                self.stats["recent_generations"][-20:]
            )
        
        # Сохраняем статистику
        logger.info(f"[add_generation] Пытаюсь сохранить статистику в файл: {self.stats_file}")
        
        def save_and_verify():
            self._save_stats()
            # Проверяем размер и часть содержимого файла
            try:
                if os.path.exists(self.stats_file):
                    with open(self.stats_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        logger.info(f"[add_generation] Файл {self.stats_file} успешно записан. Размер: {len(content)} байт. Первые 500 символов: {content[:500]}")
                else:
                    logger.error(f"[add_generation] Файл {self.stats_file} не найден после записи!")
            except Exception as e:
                logger.error(f"[add_generation] Ошибка при проверке файла после записи: {e}")

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.run_in_executor(None, save_and_verify)
            else:
                save_and_verify()
        except RuntimeError:
            # Если loop не найден (например, в синхронном скрипте)
            save_and_verify()

        logger.info(
            f"Статистика обновлена. "
            f"Всего генераций: {self.stats['total_generations']}"
        )
    
    def get_stats_summary(self) -> Dict:
        """Возвращает краткую сводку статистики"""
        return {
            "summary": {
                "total_generations": self.stats["total_generations"],
                "total_time": self.stats["total_time"]["formatted"],
                "average_time": self.stats["average_time"]["formatted"]
            },
            "by_sampler": self.stats["by_sampler"],
            "by_steps": self.stats["by_steps"],
            "by_resolution": self.stats["by_resolution"],
            "by_cfg_scale": self.stats["by_cfg_scale"],
            "recent_generations": self.stats["recent_generations"][-5:]  # Только последние 5
        }
    
    def get_recent_generations(self, limit: int = 10) -> List[Dict]:
        """Возвращает последние генерации"""
        return self.stats["recent_generations"][-limit:]
    
    def clear_stats(self) -> None:
        """Очищает статистику"""
        self.stats = {
            "total_generations": 0,
            "total_time": self._format_time_for_json(0),
            "average_time": self._format_time_for_json(0),
            "by_sampler": {},
            "by_steps": {},
            "by_resolution": {},
            "by_cfg_scale": {},
            "recent_generations": []
        }
        self._save_stats()
        logger.info("Статистика очищена")

    def _filter_params(self, params: Dict) -> Dict:
        """Фильтрует параметры, убирая изображения и большие данные"""
        if not params:
            return {}
        
        # Поля, которые нужно исключить
        exclude_fields = {
            'images', 'image', 'img', 'base64', 'data:image', 
            'alwayson_scripts', 'script_args', 'override_settings',
            'lora_models', 'hr_prompt', 'hr_negative_prompt'
        }
        
        filtered = {}
        for key, value in params.items():
            # Пропускаем поля с изображениями
            if any(exclude in str(key).lower() for exclude in exclude_fields):
                continue
            
            # Пропускаем большие строки (возможно base64)
            if isinstance(value, str) and len(value) > 1000:
                continue
                
            # Пропускаем сложные объекты
            if isinstance(value, dict) and len(str(value)) > 500:
                continue
                
            filtered[key] = value
        
        return filtered
    
    def _filter_result(self, result: Dict) -> Dict:
        """Фильтрует результат, убирая изображения"""
        if not result:
            return {}
        
        filtered = {}
        for key, value in result.items():
            # Пропускаем изображения
            if key in ['images', 'image', 'img']:
                continue
            
            # Пропускаем большие строки (возможно base64)
            if isinstance(value, str) and len(value) > 1000:
                continue
            
            # Пропускаем списки с большими строками (base64 изображения)
            if isinstance(value, list):
                # Проверяем, не содержит ли список base64 изображения
                if any(isinstance(item, str) and len(item) > 1000 for item in value):
                    continue
                # Ограничиваем размер списка
                if len(value) > 10:
                    continue
                    
            filtered[key] = value
        
        return filtered
    
    def _filter_detailed(self, detailed: Dict) -> Dict:
        """Фильтрует detailed, убирая изображения"""
        if not detailed:
            return {}
        
        filtered = {}
        for key, value in detailed.items():
            # Пропускаем изображения и большие данные
            if key in ['images', 'image', 'img', 'base64', 'memory_before', 'memory_after']:
                continue
            
            # Пропускаем большие строки
            if isinstance(value, str) and len(value) > 1000:
                continue
            
            # Пропускаем сложные объекты
            if isinstance(value, dict) and len(str(value)) > 500:
                continue
                
            filtered[key] = value
        
        return filtered


# Создаем глобальный экземпляр для сбора статистики
generation_stats = GenerationStats() 