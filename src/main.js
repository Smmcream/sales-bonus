/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100);
    return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    let bonus;
    if (index === 0) {
        bonus = seller.profit * 0.15;
    } else if (index === 1 || index === 2) {
        bonus = seller.profit * 0.10;
    } else if (index === total - 1) {
        bonus = 0;
    } else {
        bonus = seller.profit * 0.05;
    }
    return +bonus.toFixed(2); // Округление только здесь!
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data 
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка опций (исправлено!)
    if (!options || (typeof options.calculateRevenue === 'undefined' && typeof options.calculateBonus === 'undefined')) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }
    const { calculateRevenue = calculateSimpleRevenue, calculateBonus = calculateBonusByProfit } = options;

    // Подготовка данных
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0, // Пока без округления
        sales_count: 0,
        products_sold: {}
    }));

    // Индексы для быстрого доступа
    const sellerIndex = sellerStats.reduce((acc, seller) => ({ ...acc, [seller.id]: seller }), {});
    const productIndex = data.products.reduce((acc, product) => ({ ...acc, [product.sku]: product }), {});

    // Обработка чеков
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const revenueItem = calculateRevenue(item, product);
            seller.revenue = +(seller.revenue + revenueItem).toFixed(2); // Округление revenue

            const cost = product.purchase_price * item.quantity;
            seller.profit += revenueItem - cost; // Пока не округляем profit!
            
            // Учет товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Финализация profit (округляем один раз!)
    sellerStats.forEach(seller => {
        seller.profit = +seller.profit.toFixed(2);
    });

    // Сортировка по profit
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Итоговый формат
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: seller.revenue,
        profit: seller.profit,
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: seller.bonus
    }));
}