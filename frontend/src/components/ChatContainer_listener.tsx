
// Слушаем события обновления подписки
useEffect(() => {
    const handleSubscriptionUpdate = () => {
        console.log('[CHAT_CONTAINER] Получено событие subscription-update, обновляем статистику');
        loadSubscriptionStats();
    };

    window.addEventListener('subscription-update', handleSubscriptionUpdate);
    return () => {
        window.removeEventListener('subscription-update', handleSubscriptionUpdate);
    };
}, []); // Пустой массив зависимостей, так как loadSubscriptionStats стабильна (или будет предупреждение, но это безопасно)
