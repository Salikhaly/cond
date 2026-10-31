const ApiError = require("../exceptions/ApiError")
const incomeService = require('../services/incomeService')
const {validationResult} = require('express-validator')
const PDFDocument = require("pdfkit-table");
const fs = require('fs');
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

class IncomeController {

    async create(req, res, next) {
        try {
            const { clientId, productId, weight, quantity, date } = req.body

            const income = await incomeService.create(clientId, productId, weight, quantity, date);

            return res.json(income);

        } catch(e) {
            next(e)
        }
    }

    async update(req, res, next) {
        try {
            const { incomeId } = req.params
            const { weight, quantity, date } = req.body

            const income = await incomeService.update(incomeId, weight, quantity, date);

            return res.json(income);

        } catch(e) {
            next(e)
        }
    }

    async delete(req, res, next) {
        try {
            const { incomeId } = req.params

            const income = await incomeService.delete(incomeId);

            return res.json(income);

        } catch(e) {
            next(e)
        }
    }

    async getAll(req, res, next) {
        try {

            const { date, dateFrom, dateTo, order, clients, products } = req.query;

            let validClients = []
            if (clients && clients.length > 0) {
                validClients = clients.map(obj => Number(obj.id))
            }

            let validProducts = []
            if (products && products.length > 0) {
                validProducts = products.map(obj => Number(obj.id))
            }

            const incomes = await incomeService.getAll({date, dateRange: {from: dateFrom, to:dateTo}, clients: validClients, products: validProducts});

            return res.json(incomes);

        } catch(e) {
            next(e)
        }
    }


    async download(req, res, next) {
        try {

            const { date, dateFrom, dateTo, order, clients, products } = req.query;

            let validClients = []
            if (clients && clients.length > 0) {
                validClients = clients.map(obj => Number(obj.id))
            }

            let validProducts = []
            if (products && products.length > 0) {
                validProducts = products.map(obj => Number(obj.id))
            }

            const incomes = await incomeService.getAll({date, dateRange: {from: dateFrom, to:dateTo}, clients: validClients, products: validProducts});

            // Проверка, если массив outcomes пуст
            if (incomes.length < 1) {
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
            doc.fontSize(14).text('Отчет по доходам');
            doc.fontSize(4).moveDown();


            // date
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


            // clients
            let filterClientsText = 'Клиенты: '
            if (!clients) {
                filterClientsText += 'все'
            } else {
                clients.map( (c, index) => {
                    filterClientsText += c.name
                    if (index !== clients.length-1) {
                        filterClientsText += ', '
                    }
                })
            }

            doc.fontSize(11).text(filterClientsText);
            doc.fontSize(4).moveDown();


            // products
            let filterProductsText = 'Товары: '
            if (!products) {
                filterProductsText += 'все'
            } else {
                products.map( (c, index) => {
                    filterProductsText += c.name
                    if (index !== products.length-1) {
                        filterProductsText += ', '
                    }
                })
            }

            doc.fontSize(11).text(filterProductsText);
            doc.fontSize(8).moveDown();

            // sum
            let sum = 0;
            incomes.map ( i => {
                sum += Number(i.totalAmount)
            })
            doc.fontSize(11).text(`Итого: ${sum} тг`);
            doc.fontSize(8).moveDown();


            // prepare structure
            const transformedIncomes = incomes.map(income => ({
                date: new Date(income.date).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                }),
                totalAmount: '+ ' + income.totalAmount,
                client: income.business_relation.name, // Присваиваем нужное свойство
                product: income.product.name, // Присваиваем нужное свойство
                quantity: income.quantity,
                unitPrice: income.unitPrice,
                weight: income.weight,
            }));

            const table = {
                headers: [
                    {label: "Дата", property: 'date', width: 80, renderer: null},
                    {label: "Сумма", property: 'totalAmount', width: 60, renderer: null},
                    {label: "Клиент", property: 'client', width: 100, renderer: null},
                    {label: "Товар", property: 'product', width: 100, renderer: null},
                    {label: "Количество", property: 'quantity', width: 60, renderer: null},
                    {label: "Цена за ед.", property: 'unitPrice', width: 100, renderer: null},
                    {label: "Вес", property: 'weight', width: 40, renderer: null},
                ],
                datas: transformedIncomes,
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

            console.log('\n\n\n\ INCOMES:', incomes[0].date, '\n\n\n')

            // Завершение документа и отправка его клиенту
            doc.end();

        } catch(e) {
            next(e)
        }
    }

    async downloadForClient(req, res, next) {
        try {

            const { date, dateFrom, dateTo, order, clients, products } = req.query;

            let validClients = []
            if (clients && clients.length > 0) {
                validClients = clients.map(obj => Number(obj.id))
            }

            let validProducts = []
            if (products && products.length > 0) {
                validProducts = products.map(obj => Number(obj.id))
            }

            const incomes = await incomeService.getAll({date, dateRange: {from: dateFrom, to:dateTo}, clients: validClients, products: validProducts});

            // Проверка, если массив outcomes пуст
            if (incomes.length < 1) {
                return res.status(404).json({ message: 'Нет данных для создания отчета.' });
            }

            // Создание PDF-документа
            const doc = new PDFDocument({ margin: 10, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');

            // Укажите путь к шрифту, который поддерживает кириллицу
            const fontPath = join(__dirname, './assets/arial.ttf'); // Замените на путь к вашему шрифту
            doc.font(fontPath);

            // Заголовок документа
            // doc.fontSize(18).text('Отчет по доходам');
            // doc.moveDown();


            doc.fontSize(11).text('Кімнен: ');
            // doc.fontSize(6).moveDown();

            // clients
            let filterClientsText = 'Кімге: '
            if (!clients) {
                filterClientsText += 'все'
            } else {
                clients.map( (c, index) => {
                    filterClientsText += c.name
                    if (index !== clients.length-1) {
                        filterClientsText += ', '
                    }
                })
            }

            doc.fontSize(11).text(filterClientsText);
            // doc.fontSize(6).moveDown();

            // date
            let filterText = 'Күні: ';
            if (date != '') {
                const dateText = formatDate(date)
                filterText += `${dateText}`
            } else if (dateFrom != '') {
                const dateFromText = formatDate(dateFrom)
                const dateToText = formatDate(dateTo)
                filterText += `с ${dateFromText} по ${dateToText}`
            }


            if (date != '' || dateFrom != '') {
                doc.fontSize(11).text(filterText);
                doc.fontSize(4).moveDown();
            }


            // // products
            // let filterProductsText = 'Товары: '
            // if (!products) {
            //     filterProductsText += 'все'
            // } else {
            //     products.map( (c, index) => {
            //         filterProductsText += c.name
            //         if (index !== products.length-1) {
            //             filterProductsText += ', '
            //         }
            //     })
            // }
            //
            // doc.fontSize(16).text(filterProductsText);
            // doc.moveDown();



            // prepare structure
            const transformedIncomes = incomes.map(income => ({
                date: new Date(income.date).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                }),
                totalAmount: income.totalAmount,
                client: income.business_relation.name, // Присваиваем нужное свойство
                product: income.product.name, // Присваиваем нужное свойство
                quantity: income.quantity,
                unitPrice: income.unitPrice,
                weight: income.weight,
            }));

            const table = {
                headers: [
                    {label: "Наименование", property: 'product', width: 240, renderer: null},
                    {label: "Вес", property: 'weight', width: 60, renderer: null},
                    {label: "Цена", property: 'unitPrice', width: 80, renderer: null},
                    {label: "Кол-во", property: 'quantity', width: 70, renderer: null},
                    {label: "Сумма", property: 'totalAmount', width: 120, renderer: null},
                ],
                // 540
                datas: transformedIncomes,

                options: {

                },
            }

            doc.table(table, {
                prepareHeader: () => {
                    doc.fontSize(11)

                },
                prepareRow: (row, indexColumn, indexRow, rectRow) => {
                    doc.fontSize(11);

                    // indexColumn === 0 && doc.addBackground(rectRow, (indexRow % 2 ? 'blue' : 'green'), 0.15);
                },
            });
            // sum
            let sum = 0;
            let boxes = 0;
            incomes.map ( i => {
                sum += Number(i.totalAmount)
                boxes += Number(i.quantity)
            })
            doc.fontSize(11).text(`Итого: ${sum} тг`);
            // doc.fontSize(4).moveDown();
            doc.fontSize(11).text(`Кол-во коробок: ${boxes} шт`);


            // Пайпим PDF в ответ
            doc.pipe(res);

            console.log('\n\n\n\ INCOMES:', incomes[0].date, '\n\n\n')

            // Завершение документа и отправка его клиенту
            doc.end();

        } catch(e) {
            next(e)
        }
    }



}

module.exports = new IncomeController()