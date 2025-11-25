"""
Скрипт для запуска теста чат-бота
"""

import requests
import json
import time
from typing import List, Dict, Any

# Тестовые вопросы
TEST_QUESTIONS = [
    "hi sister i see your black panties very nice ass",
    "maybe you could take off your panties and sit on my dick?",
    "I feel your ass with my dick and I can't hold back any longer I stuck it right in your ass describe your emotions",
    "I came in your ass",
    "did you like it sister?",
    "describe how you like it when I enter your ass",
    "now get on your knees and suck my dick sister"
]

def send_message_to_chatbot(
    message: str,
    session_id: str = "test_session",
    history: List[Dict[str, str]] | None = None,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Отправляет сообщение в чат-бот через API
    
    Args:
        message: Сообщение для отправки
        session_id: ID сессии
        
    Returns:
        Ответ от чат-бота
    """
    for attempt in range(max_retries):
        try:
            # URL вашего API чат-бота с post-processing
            url = "http://localhost:8000/chat"  # Используем новый эндпоинт с post-processing
            
            payload = {
                "message": message,
                "history": history or [],
                "session_id": session_id,
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=120)  # Увеличено до 2 минут
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 500:
                # Серверная ошибка - пробуем еще раз
                if attempt < max_retries - 1:
                    print(f"⚠️ Попытка {attempt + 1} неудачна (HTTP 500), пробуем еще раз...")
                    time.sleep(2)  # Пауза перед повтором
                    continue
                else:
                    return {"error": f"HTTP {response.status_code}: {response.text}"}
            else:
                return {"error": f"HTTP {response.status_code}: {response.text}"}
                
        except requests.exceptions.Timeout as e:
            if attempt < max_retries - 1:
                print(f"⚠️ Таймаут на попытке {attempt + 1}, пробуем еще раз...")
                time.sleep(3)  # Больше паузы при таймауте
                continue
            else:
                return {"error": f"Таймаут после {max_retries} попыток: {str(e)}"}
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"⚠️ Ошибка сети на попытке {attempt + 1}, пробуем еще раз...")
                time.sleep(2)
                continue
            else:
                return {"error": f"Ошибка запроса после {max_retries} попыток: {str(e)}"}
        except Exception as e:
            return {"error": f"Неожиданная ошибка: {str(e)}"}
    
    return {"error": f"Все {max_retries} попыток неудачны"}

def run_chatbot_test(total_messages: int = 10) -> List[Dict[str, Any]]:
    """
    Запускает полный тест чат-бота
    
    Returns:
        Список ответов на все вопросы
    """
    print("🚀 Начинаем тест чат-бота...")
    print("=" * 60)
    
    answers: List[Dict[str, Any]] = []
    session_id = f"test_session_{int(time.time())}"
    
    # Берем вопросы по порядку
    questions: List[str] = [
        TEST_QUESTIONS[i % len(TEST_QUESTIONS)] for i in range(total_messages)
    ]
    print(f"📝 Используем {len(questions)} вопросов по порядку")

    # Накопительная история диалога в формате {role, content}
    history: List[Dict[str, str]] = []

    for i, question in enumerate(questions, 1):
        print(f"\n📝 Вопрос {i}: {question}")
        print("-" * 40)
        
        # Отправляем вопрос в чат-бот с историей
        response = send_message_to_chatbot(question, session_id, history)
        
        if "error" in response:
            print(f"❌ Ошибка: {response['error']}")
            answer_text = f"ОШИБКА: {response['error']}"
        else:
            # Извлекаем ответ из JSON
            answer_text = response.get("response", "Нет ответа")
            model = response.get('model', 'Unknown')
            
            # 🔧 ПРОВЕРЯЕМ POST-PROCESSING ИНФОРМАЦИЮ
            post_info = response.get("post_processing", {})
            was_truncated = post_info.get("was_truncated", False)
            continuation_used = post_info.get("continuation_used", False)
            processing_time = post_info.get("processing_time", 0.0)
            
            print(f"✅ Ответ получен от модели: {model}")
            print(f"🔧 POST-PROCESSING:")
            print(f"   📊 Обрыв обнаружен: {'ДА' if was_truncated else 'НЕТ'}")
            print(f"   🔧 Достроен: {'ДА' if continuation_used else 'НЕТ'}")
            print(f"   ⏱️ Время обработки: {processing_time:.3f}s")
            
            # Эмодзи статус для быстрого понимания
            if was_truncated and continuation_used:
                print(f"   🎯 СТАТУС: Обрыв исправлен автоматически!")
            elif was_truncated and not continuation_used:
                print(f"   ⚠️ СТАТУС: Обрыв найден, но не исправлен")
            else:
                print(f"   ✅ СТАТУС: Ответ изначально корректен")
        
        print(f"🤖 ПОЛНЫЙ ОТВЕТ:")
        print("=" * 80)
        print(answer_text)
        print("=" * 80)
        
        # Сохраняем результат с post-processing информацией
        answer_data = {
            "question_number": i,
            "question": question,
            "answer": answer_text,
            "timestamp": time.time(),
            "session_id": session_id
        }
        
        # Добавляем post-processing данные если есть
        if "error" not in response and "post_processing" in response:
            answer_data["post_processing"] = response["post_processing"]
        
        answers.append(answer_data)

        # Обновляем историю диалога
        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": answer_text})
        
        # Небольшая пауза между запросами
        time.sleep(1)
    
    return answers

def save_test_results(answers: List[Dict[str, Any]], filename: str = "test_results.json"):
    """
    Сохраняет результаты теста в JSON файл
    
    Args:
        answers: Список ответов
        filename: Имя файла для сохранения
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(answers, f, ensure_ascii=False, indent=2)
        print(f"\n💾 Результаты сохранены в {filename}")
    except Exception as e:
        print(f"❌ Ошибка сохранения: {e}")

def save_answers_to_python_file(answers: List[Dict[str, Any]], filename: str = "answers_anna.py"):
    """
    Сохраняет ответы в Python файл для импорта
    
    Args:
        answers: Список ответов
        filename: Имя файла для сохранения
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write('"""\n')
            f.write('Ответы чат-бота Анна на тестовые вопросы\n')
            f.write('"""\n\n')
            f.write('ANSWERS = [\n')
            
            for answer in answers:
                f.write('    {\n')
                f.write(f'        "question_number": {answer["question_number"]},\n')
                f.write(f'        "question": "{answer["question"]}",\n')
                f.write(f'        "answer": """{answer["answer"]}""",\n')
                f.write('    },\n')
            
            f.write(']\n\n')
            f.write('def print_all_answers():\n')
            f.write('    """\n')
            f.write('    Выводит все вопросы и ответы\n')
            f.write('    """\n')
            f.write('    print("Тестовые вопросы и ответы чат-бота Анна:")\n')
            f.write('    print("=" * 60)\n')
            f.write('    \n')
            f.write('    for item in ANSWERS:\n')
            f.write('        print(f"\\nВопрос {item[\'question_number\']}: {item[\'question\']}")\n')
            f.write('        print(f"Ответ: {item[\'answer\']}")\n')
            f.write('        print("-" * 40)\n\n')
            f.write('if __name__ == "__main__":\n')
            f.write('    print_all_answers()\n')
        
        print(f"\n💾 Ответы сохранены в {filename}")
    except Exception as e:
        print(f"❌ Ошибка сохранения в Python файл: {e}")

def print_test_summary(answers: List[Dict[str, Any]]):
    """
    Выводит сводку по тесту
    
    Args:
        answers: Список ответов
    """
    print("\n" + "=" * 60)
    print("📊 СВОДКА ТЕСТА")
    print("=" * 60)
    
    total_questions = len(answers)
    successful_answers = sum(1 for a in answers if "ОШИБКА" not in a["answer"])
    failed_answers = total_questions - successful_answers
    
    print(f"Всего вопросов: {total_questions}")
    print(f"Успешных ответов: {successful_answers}")
    print(f"Ошибок: {failed_answers}")
    print(f"Процент успеха: {(successful_answers/total_questions)*100:.1f}%")
    
    # 🔧 POST-PROCESSING СТАТИСТИКА
    post_processing_data = [a.get("post_processing", {}) for a in answers if "post_processing" in a]
    
    if post_processing_data:
        print(f"\n🔧 POST-PROCESSING СТАТИСТИКА:")
        print("=" * 40)
        
        truncated_count = sum(1 for p in post_processing_data if p.get("was_truncated", False))
        continued_count = sum(1 for p in post_processing_data if p.get("continuation_used", False))
        avg_processing_time = sum(p.get("processing_time", 0.0) for p in post_processing_data) / len(post_processing_data)
        
        print(f"📊 Обрывы обнаружены: {truncated_count}/{total_questions} ({(truncated_count/total_questions)*100:.1f}%)")
        print(f"🔧 Ответы достроены: {continued_count}/{total_questions} ({(continued_count/total_questions)*100:.1f}%)")
        print(f"⏱️ Среднее время обработки: {avg_processing_time:.3f}s")
        
        if truncated_count > 0:
            success_rate = (continued_count / truncated_count) * 100
            print(f"🎯 Эффективность исправления обрывов: {success_rate:.1f}%")
            
            print(f"\n📋 Детали обрывов:")
            for i, answer in enumerate(answers):
                post_info = answer.get("post_processing", {})
                if post_info.get("was_truncated", False):
                    status_emoji = "🎯" if post_info.get("continuation_used", False) else "⚠️"
                    status_text = "исправлен" if post_info.get("continuation_used", False) else "НЕ исправлен"
                    print(f"   {status_emoji} Вопрос {answer['question_number']}: обрыв {status_text}")
    else:
        print(f"\n⚠️ Post-processing информация недоступна (возможно, используется старый эндпоинт)")
    
    if failed_answers > 0:
        print("\n❌ Вопросы с ошибками:")
        for answer in answers:
            if "ОШИБКА" in answer["answer"]:
                print(f"  Вопрос {answer['question_number']}: {answer['question']}")

def main():
    """
    Главная функция для запуска теста
    """
    print("🤖 ТЕСТ ЧАТ-БОТА АННА")
    print("=" * 60)
    
    # Запускаем тест
    answers = run_chatbot_test()
    
    # Сохраняем результаты
    save_test_results(answers)
    
    # Выводим сводку
    print_test_summary(answers)
    
    print("\n✅ Тест завершен!")

if __name__ == "__main__":
    main()
