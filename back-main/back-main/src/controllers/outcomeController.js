const ApiError = require("../exceptions/ApiError")
const outcomeService = require('../services/outcomeService')
const {validationResult} = require('express-validator')
const PDFDocument = require("pdfkit-table");
const {join} = require("path");

function formatDate(date) {
    const now = new Date(date);

    // Получаем компоненты даты
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const year = now.getFullYear();

    // Форматируем строку
    return `${day}.${month}.${year}`;
}


class OutcomeController {

    async create(req, res, next) {
        try {
            const { recipient, supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, date } = req.body

            const outcome = await outcomeService.create(recipient, supplierId, name, weight, unitPrice, quantity, outcomeCategoryId, date);

            return res.json(outcome);

        } catch(e) {
            next(e)
        }
    }

    async update(req, res, next) {
        try {
            const { outcomeId } = req.params
            const { recipient, name, weight, unitPrice, quantity, outcomeCategoryId, date } = req.body

            const outcome = await outcomeService.update(outcomeId, recipient, name, weight, unitPrice, quantity, outcomeCategoryId, date);

            return res.json(outcome);

        } catch(e) {
            next(e)
        }
    }

    async delete(req, res, next) {
        try {
            const { outcomeId } = req.params

            const outcome = await outcomeService.delete(outcomeId);

            return res.json(outcome);

        } catch(e) {
            next(e)
        }
    }

    async getAll(req, res, next) {
        try {

            const { date, dateFrom, dateTo, categories, order } = req.query;

            let validCategories = []
            if (categories && categories.length > 0) {
                validCategories = categories.map(obj => Number(obj.id))
            }

            const outcomes = await outcomeService.getAll({date, dateRange: {from: dateFrom, to:dateTo}, categories: validCategories});

            return res.json(outcomes);

        } catch(e) {
            next(e)
        }
    }



    async download(req, res, next) {
        try {

            const { date, dateFrom, dateTo, categories, order } = req.query;

            let validCategories = []
            if (categories && categories.length > 0) {
                validCategories = categories.map(obj => Number(obj.id))
            }
            console.log('\n\n\n\ OUTCOMES FILTER:',  { date, dateFrom, dateTo, categories, order }, '\n\n\n')

            const outcomes = await outcomeService.getAll({date, dateRange: {from: dateFrom, to:dateTo}, categories: validCategories});


            // Проверка, если массив outcomes пуст
            if (outcomes.length < 1 ) {
                return res.status(404).json({ message: 'Нет данных для создания отчета.' });
            }

            // Создание PDF-документа
            const doc = new PDFDocument({ margin: 20, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');

            // Укажите путь к шрифту, который поддерживает кириллицу
            const fontPath = join(__dirname, './assets/arial.ttf'); // Замените на путь к вашему шрифту
            doc.font(fontPath);

            // Заголовок документа
            doc.fontSize(14).text('Отчет по расходам');
            doc.fontSize(4).moveDown();

            let filterText = '';
            if (date != '') {
                const dateText = formatDate(date)
                filterText += `За день ${dateText}`
            } else if (dateFrom != '') {
                const dateFromText = formatDate(dateFrom)
                const dateToText = formatDate(dateTo)
                filterText += `За период с ${dateFromText} по ${dateToText}`
            }

            if (date != '' || dateFrom != '') {
                doc.fontSize(11).text(filterText);
                doc.fontSize(8).moveDown();
            }

            let filterCategoryText = 'Категории: '
            if (!categories) {
                filterCategoryText += 'все'
            } else {
                categories.map( (c, index) => {
                    filterCategoryText += c.name
                    if (index !== categories.length-1) {
                        filterCategoryText += ', '
                    }
                })
            }

            doc.fontSize(11).text(filterCategoryText);
            doc.fontSize(4).moveDown();


            // sum
            let sum = 0;
            outcomes.map ( o => {
                sum += Number(o.totalAmount)
            })
            doc.fontSize(11).text(`Итого: ${sum} тг`);
            doc.fontSize(8).moveDown();

            const transformedOutcomes = outcomes.map(outcome => ({
                // date: new Date(outcome.date).toLocaleDateString('ru-RU', {
                //     day: '2-digit',
                //     month: 'long',
                //     year: 'numeric',
                // }),
                date: formatDate(outcome.date),
                totalAmount: '- ' + outcome.totalAmount,
                category: outcome.outcome_category.name, // Присваиваем нужное свойство
                client: outcome.recipient, // Присваиваем нужное свойство
                product: outcome.name, // Присваиваем нужное свойство
                quantity: outcome.quantity,
                unitPrice: outcome.unitPrice,
                weight: outcome.weight || 0, // TODO models outcome weight defaultValue = 0
            }));

            const table = {
                headers: [
                    {label: "Дата", property: 'date', width: 50, renderer: null},
                    {label: "Сумма", property: 'totalAmount', width: 60, renderer: null},
                    {label: "Категория", property: 'category', width: 50, renderer: null},
                    {label: "Получатель", property: 'client', width: 90, renderer: null},
                    {label: "Название", property: 'product', width: 90, renderer: null},
                    {label: "Количество", property: 'quantity', width: 60, renderer: null},
                    {label: "Цена за ед.", property: 'unitPrice', width: 100, renderer: null},
                    {label: "Вес", property: 'weight', width: 40, renderer: null},
                ],
                datas: transformedOutcomes,
            }

            doc.table(table, {
                prepareHeader: () => {
                    doc.fontSize(8)
                    // const headerHeight = 16; // Высота заголовка
                    // const headerY = doc.y-4; // Текущая вертикальная позиция
                    //
                    // let xCount = doc.x
                    // // Проходим по всем заголовкам и рисуем их
                    // table.headers.forEach((header, index) => {
                    //     doc.strokeColor('gray').lineWidth(0.5);
                    //     doc.rect(xCount, headerY, header.width, headerHeight).stroke(); // Рисуем границу заголовка
                    //     xCount = xCount + header.width
                    // });
                },
                prepareRow: (row, indexColumn, indexRow, rectRow) => {
                    doc.fontSize(8);


                    // // Рисуем границы ячеек
                    // const x = rectRow.x;
                    // const y = rectRow.y;
                    // const width = rectRow.width;
                    // const height = rectRow.height;
                    //
                    // // Рисуем рамку вокруг ячейки
                    // doc.rect(x, y, width, height).stroke();


                    indexColumn === 0 && doc.addBackground(rectRow, (indexRow % 2 ? 'blue' : 'green'), 0.15);
                },
            });

            // Пайпим PDF в ответ
            doc.pipe(res);

            console.log('\n\n\n\ OUTCOMES:', outcomes[0].date, '\n\n\n')

            // Завершение документа и отправка его клиенту
            doc.end();

        } catch(e) {
            next(e)
        }
    }



    // outcome categories
    async createCategory(req, res, next) {
        try {
            const { name } = req.body

            const category = await outcomeService.createOutcomeCategory(name);

            return res.json(category);

        } catch(e) {
            next(e)
        }
    }

    async getAllCategories(req, res, next) {
        try {

            const categories = await outcomeService.getAllCategories();

            return res.json(categories);

        } catch(e) {
            next(e)
        }
    }

    async updateCategory(req, res, next) {
        try {
            const categoryId = req.params.categoryId
            const { name } = req.body

            const category = await outcomeService.updateCategory(categoryId, name);

            return res.json(category);

        } catch(e) {
            next(e)
        }
    }

    async deleteCategory(req, res, next) {
        try {
            const categoryId = req.params.categoryId

            const category = await outcomeService.deleteCategory(categoryId);

            return res.json(category);

        } catch(e) {
            next(e)
        }
    }

}

module.exports = new OutcomeController()