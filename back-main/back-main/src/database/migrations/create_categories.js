const bcrypt = require("bcrypt");
const {OutcomeCategory} = require("../../models/models");

async function create_categories() {
    try {
        const category = await OutcomeCategory.findOrCreate({where:
            {
                name: 'Зарплата'
            }
        })
    } catch (e) {
        throw e;
    }
}

module.exports = create_categories
