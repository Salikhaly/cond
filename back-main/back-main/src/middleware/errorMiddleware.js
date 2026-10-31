const ApiError = require('../exceptions/ApiError')

module.exports = function(err, req, res, next) {
    console.error(JSON.stringify({requestId:req.requestId, path:req.path, name:err.name, status:err.status || 500, code:err.original?.code}));
    if (err instanceof ApiError) {
        return res.status(err.status).json({message: err.message, errors: err.errors})
    }
    if (/SequelizeConnection|SequelizeHost|SequelizeConnectionAcquire/.test(err.name)) return res.status(503).json({message:'База временно недоступна. Записи остаются в очереди телефона.'});

    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({message: 'Такая запись уже есть. Проверьте название, email или номер прихода у поставщика.'});
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeForeignKeyConstraintError' || err.original?.code === '22P02') return res.status(400).json({message: 'Проверьте заполненные поля и выбранные записи.'});
    return res.status(500).json({message: "Не удалось сохранить данные. Повторите попытку или обратитесь к администратору."})
}
