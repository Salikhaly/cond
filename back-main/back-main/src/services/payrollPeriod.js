const ApiError = require('../exceptions/ApiError');
module.exports = month => {
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0,4)) < 2000 || Number(month.slice(0,4)) > 2100) throw ApiError.badRequest('Выберите корректный месяц зарплаты');
    const next = new Date(month + '-01T12:00:00Z'); next.setUTCMonth(next.getUTCMonth() + 1);
    return { start: new Date(month + '-01T00:00:00+05:00'), end: new Date(next.toISOString().slice(0,10) + 'T00:00:00+05:00') };
};
