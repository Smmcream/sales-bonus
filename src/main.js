/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100);
    return Math.round(purchase.sale_price * purchase.quantity * discount * 100) / 100;
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
    let rate;
    
    if (index === 0) rate = 0.15;
    else if (index === 1 || index === 2) rate = 0.10;
    else if (index === total - 1) rate = 0;
    else rate = 0.05;
    
    return Math.round(profit * rate * 100) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || typeof data !== 'object' ||
        !Array.isArray(data.sellers) || !Array.isArray(data.products) || 
        !Array.isArray(data.purchase_records)) {
        throw new Error('Некорректные входные данные');
    }

    // Строгая проверка опций
    if (arguments.length < 2 || 
        (options && typeof options === 'object' && 
         !options.calculateRevenue && 
         !options.calculateBonus)) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    const calculateRevenue = options?.calculateRevenue || calculateSimpleRevenue;
    const calculateBonus = options?.calculateBonus || calculateBonusByProfit;

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
    const sellerIndex = {};
    data.sellers.forEach(seller => {
        sellerIndex[seller.id] = sellerStats.find(s => s.id === seller.id);
    });

    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count++;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const revenueItem = calculateRevenue(item, product);
            seller.revenue = Math.round((seller.revenue + revenueItem) * 100) / 100;

            const cost = product.purchase_price * item.quantity;
            seller.profit += Math.round((revenueItem - cost) * 100) / 100;
            
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортировка по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sellerStats;
}