// Temporary operating mode. Reservations and document checks remain enforced.
module.exports = { allowNegative: () => process.env.COND_ALLOW_NEGATIVE_STOCK === 'true' };
