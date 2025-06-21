/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100);
    const revenue = purchase.sale_price * purchase.quantity * discount;
    return parseFloat(revenue.toFixed(2));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const profit = seller.profit;
    let bonus;
    
    if (index === 0) {
        bonus = profit * 0.15;
    } else if (index === 1 || index === 2) {
        bonus = profit * 0.10;
    } else if (index === total - 1) {
        bonus = 0;
    } else {
        bonus = profit * 0.05;
    }
    
    return parseFloat(bonus.toFixed(2));
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options = {}) {
    // Проверка входных данных
    if (!data || typeof data !== 'object' ||
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка опций (исправленная версия)
    const { calculateRevenue, calculateBonus } = options;
    if ((typeof calculateRevenue === 'undefined' && typeof calculateBonus === 'undefined')) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    const usedCalculateRevenue = calculateRevenue || calculateSimpleRevenue;
    const usedCalculateBonus = calculateBonus || calculateBonusByProfit;

    // Подготовка данных
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создание индексов
    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const revenueItem = usedCalculateRevenue(item, product);
            seller.revenue = parseFloat((seller.revenue + revenueItem).toFixed(2));

            const cost = product.purchase_price * item.quantity;
            seller.profit += revenueItem - cost;
            
            // Учет проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Финализация profit
    sellerStats.forEach(seller => {
        seller.profit = parseFloat(seller.profit.toFixed(2));
    });

    // Сортировка по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов
    sellerStats.forEach((seller, index) => {
        seller.bonus = usedCalculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

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