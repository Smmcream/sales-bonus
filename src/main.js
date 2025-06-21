/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100);
    return parseFloat((purchase.sale_price * purchase.quantity * discount).toFixed(2));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return parseFloat((seller.profit * 0.15).toFixed(2));
    if (index === 1 || index === 2) return parseFloat((seller.profit * 0.10).toFixed(2));
    if (index === total - 1) return 0;
    return parseFloat((seller.profit * 0.05).toFixed(2));
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка на отсутствие данных
    if (!data || typeof data !== 'object') {
        throw new Error('Некорректные входные данные');
    }

    // Проверка пустых массивов
    if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка опций (строгая)
    if (arguments.length < 2 || 
        (options && typeof options === 'object' && 
         !options.calculateRevenue && 
         !options.calculateBonus)) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    const calculateRevenue = options?.calculateRevenue || calculateSimpleRevenue;
    const calculateBonus = options?.calculateBonus || calculateBonusByProfit;

    // Подготовка данных продавцов
    const sellersMap = new Map();
    data.sellers.forEach(seller => {
        sellersMap.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: new Map()
        });
    });

    // Создание индекса товаров
    const productsMap = new Map();
    data.products.forEach(product => {
        productsMap.set(product.sku, product);
    });

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellersMap.get(record.seller_id);
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productsMap.get(item.sku);
            if (!product) return;

            const revenueItem = calculateRevenue(item, product);
            seller.revenue = parseFloat((seller.revenue + revenueItem).toFixed(2));

            const cost = product.purchase_price * item.quantity;
            seller.profit = parseFloat((seller.profit + (revenueItem - cost)).toFixed(2));

            // Учет проданных товаров
            const currentQuantity = seller.products_sold.get(item.sku) || 0;
            seller.products_sold.set(item.sku, currentQuantity + item.quantity);
        });
    });

    // Преобразование Map в массив и сортировка по прибыли
    const sellerStats = Array.from(sellersMap.values()).sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и подготовка топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        // Преобразование Map товаров в массив и сортировка
        const sortedProducts = Array.from(seller.products_sold.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));
        
        seller.top_products = sortedProducts;
    });

    // Удаляем временные поля и возвращаем результат
    return sellerStats.map(seller => {
        const result = {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: seller.revenue,
            profit: seller.profit,
            sales_count: seller.sales_count,
            top_products: seller.top_products,
            bonus: seller.bonus
        };
        return result;
    });
}