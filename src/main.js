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
    // Проверка входных данных
    if (!data || typeof data !== 'object' ||
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // Строгая проверка опций
    if (arguments.length < 2 || (options && typeof options === 'object' && 
        Object.keys(options).length === 0)) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    const calculateRevenue = options?.calculateRevenue || calculateSimpleRevenue;
    const calculateBonus = options?.calculateBonus || calculateBonusByProfit;

    // Подготовка данных продавцов
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создание индексов
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.seller_id] = seller;
    });

    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const revenueItem = calculateRevenue(item, product);
            seller.revenue = parseFloat((seller.revenue + revenueItem).toFixed(2));

            const cost = product.purchase_price * item.quantity;
            const profitItem = revenueItem - cost;
            seller.profit = parseFloat((seller.profit + profitItem).toFixed(2));

            // Учет проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и подготовка топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        // Формирование топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // Удаление временного поля
        delete seller.products_sold;
    });

    return sellerStats;
}