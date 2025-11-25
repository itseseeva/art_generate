#!/usr/bin/env python3
"""
GPU Performance Monitor for Text Generation WebUI
Мониторинг производительности GPU для оптимизации модели
"""

import subprocess
import time
import json
import os
from datetime import datetime
from typing import Dict, List, Optional

class GPUMonitor:
    """Мониторинг производительности GPU"""
    
    def __init__(self, log_file: str = "gpu_performance.log"):
        self.log_file = log_file
        self.start_time = time.time()
        
    def get_gpu_info(self) -> Dict:
        """Получение информации о GPU"""
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw", 
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, check=True
            )
            
            lines = result.stdout.strip().split('\n')
            gpu_data = {}
            
            for i, line in enumerate(lines):
                parts = line.split(', ')
                if len(parts) >= 7:
                    gpu_data[f"GPU_{i}"] = {
                        "name": parts[0],
                        "memory_total_mb": int(parts[1]),
                        "memory_used_mb": int(parts[2]),
                        "memory_free_mb": int(parts[3]),
                        "utilization_gpu": int(parts[4]),
                        "temperature_c": int(parts[5]),
                        "power_w": float(parts[6]) if parts[6] != "N/A" else 0
                    }
            
            return gpu_data
            
        except subprocess.CalledProcessError as e:
            print(f"Ошибка получения информации о GPU: {e}")
            return {}
        except Exception as e:
            print(f"Неожиданная ошибка: {e}")
            return {}
    
    def calculate_performance_metrics(self, gpu_data: Dict) -> Dict:
        """Расчет метрик производительности"""
        if not gpu_data:
            return {}
        
        metrics = {}
        for gpu_id, gpu_info in gpu_data.items():
            # Использование памяти в процентах
            memory_usage_pct = (gpu_info["memory_used_mb"] / gpu_info["memory_total_mb"]) * 100
            
            # Эффективность использования памяти
            memory_efficiency = gpu_info["memory_used_mb"] / max(gpu_info["memory_total_mb"], 1)
            
            # Оценка производительности (0-100)
            performance_score = (
                (gpu_info["utilization_gpu"] * 0.4) +  # Утилизация GPU 40%
                (memory_efficiency * 40) +              # Эффективность памяти 40%
                (min(gpu_info["temperature_c"] / 80, 1) * 20)  # Температура 20%
            )
            
            metrics[gpu_id] = {
                "memory_usage_pct": round(memory_usage_pct, 1),
                "memory_efficiency": round(memory_efficiency, 3),
                "performance_score": round(performance_score, 1),
                "is_optimal": memory_usage_pct > 80 and gpu_info["utilization_gpu"] > 50
            }
        
        return metrics
    
    def log_performance(self, gpu_data: Dict, metrics: Dict):
        """Логирование производительности"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        uptime = time.time() - self.start_time
        
        log_entry = {
            "timestamp": timestamp,
            "uptime_seconds": round(uptime, 1),
            "gpu_data": gpu_data,
            "performance_metrics": metrics
        }
        
        # Запись в лог файл
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        
        # Вывод в консоль
        print(f"\n=== GPU Performance Report ({timestamp}) ===")
        print(f"Uptime: {uptime:.1f}s")
        
        for gpu_id, gpu_info in gpu_data.items():
            metric = metrics.get(gpu_id, {})
            print(f"\n{gpu_id}: {gpu_info['name']}")
            print(f"  Memory: {gpu_info['memory_used_mb']}/{gpu_info['memory_total_mb']} MB ({metric.get('memory_usage_pct', 0):.1f}%)")
            print(f"  GPU Usage: {gpu_info['utilization_gpu']}%")
            print(f"  Temperature: {gpu_info['temperature_c']}°C")
            print(f"  Power: {gpu_info['power_w']:.1f}W")
            print(f"  Performance Score: {metric.get('performance_score', 0):.1f}/100")
            print(f"  Optimal: {'✅' if metric.get('is_optimal', False) else '❌'}")
    
    def get_optimization_recommendations(self, gpu_data: Dict, metrics: Dict) -> List[str]:
        """Получение рекомендаций по оптимизации"""
        recommendations = []
        
        for gpu_id, gpu_info in gpu_data.items():
            metric = metrics.get(gpu_id, {})
            
            # Анализ использования памяти
            if metric.get('memory_usage_pct', 0) < 70:
                recommendations.append(f"{gpu_id}: Увеличьте gpu-layers для лучшей производительности")
            elif metric.get('memory_usage_pct', 0) > 95:
                recommendations.append(f"{gpu_id}: Уменьшите gpu-layers или ctx-size для стабильности")
            
            # Анализ утилизации GPU
            if gpu_info['utilization_gpu'] < 30:
                recommendations.append(f"{gpu_id}: GPU недостаточно загружен - проверьте batch-size и threads")
            
            # Анализ температуры
            if gpu_info['temperature_c'] > 75:
                recommendations.append(f"{gpu_id}: Высокая температура - проверьте охлаждение")
        
        return recommendations
    
    def monitor_continuously(self, interval: int = 5, max_iterations: Optional[int] = None):
        """Непрерывный мониторинг производительности"""
        print(f"🚀 Запуск мониторинга GPU каждые {interval} секунд")
        print(f"📝 Лог файл: {self.log_file}")
        print("Нажмите Ctrl+C для остановки\n")
        
        iteration = 0
        try:
            while True:
                if max_iterations and iteration >= max_iterations:
                    break
                
                gpu_data = self.get_gpu_info()
                if gpu_data:
                    metrics = self.calculate_performance_metrics(gpu_data)
                    self.log_performance(gpu_data, metrics)
                    
                    # Рекомендации по оптимизации
                    recommendations = self.get_optimization_recommendations(gpu_data, metrics)
                    if recommendations:
                        print("\n🔧 РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ:")
                        for rec in recommendations:
                            print(f"  • {rec}")
                
                iteration += 1
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print(f"\n⏹️  Мониторинг остановлен после {iteration} итераций")
            print(f"📊 Результаты сохранены в {self.log_file}")

def main():
    """Основная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(description="GPU Performance Monitor for Text Generation WebUI")
    parser.add_argument("--interval", "-i", type=int, default=5, help="Интервал мониторинга в секундах")
    parser.add_argument("--iterations", "-n", type=int, help="Максимальное количество итераций")
    parser.add_argument("--log-file", "-l", default="gpu_performance.log", help="Файл для логирования")
    
    args = parser.parse_args()
    
    monitor = GPUMonitor(log_file=args.log_file)
    monitor.monitor_continuously(interval=args.interval, max_iterations=args.iterations)

if __name__ == "__main__":
    main()
