const sequelize = require('../database/sequelize')
const {DataTypes} = require('sequelize')

const VerfCodes = sequelize.define('verfcode', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    email: {type: DataTypes.STRING, allowNull: false},
    code: {type: DataTypes.STRING, allowNull: false},
    isActive: {type: DataTypes.BOOLEAN, defaultValue: true}
})

const Token = sequelize.define('token', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    refreshToken: {type: DataTypes.TEXT, allowNull: false},
})

const User = sequelize.define('user', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING},
    email: {type: DataTypes.STRING, unique: true, allowNull: false},
    email_confirmed: {type: DataTypes.DATE},
    password: {type: DataTypes.STRING},
    role: {type: DataTypes.STRING, defaultValue: "employee"},
})

const Product = sequelize.define('product', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING},
    image: {type: DataTypes.TEXT},
    ingredients: {type: DataTypes.JSON, nullable: false},
    additional: {type: DataTypes.JSON, nullable: false},
    quantity: {type: DataTypes.INTEGER, defaultValue: 0},
    is_active: {type: DataTypes.BOOLEAN, nullable: false, defaultValue: true},
    weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    priceTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    weightTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    priceForEmployee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
})

const BusinessRelation = sequelize.define('business_relation', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING},
    category: {type: DataTypes.TEXT, defaultValue: 'client'}, // client or supplier
    // ingredients: {type: DataTypes.JSON},
    is_active: {type: DataTypes.BOOLEAN, nullable: false, defaultValue: true},
})

const BusinessRelationProducts =  sequelize.define('business_relation_products', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    price: {type: DataTypes.TEXT, nullable: false}, // client or supplier
    // ingredients: {type: DataTypes.JSON},
})

const Report = sequelize.define('report', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    // unit: {type: DataTypes.INTEGER, defaultValue: 1 },
    // quantity: {type: DataTypes.INTEGER},
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    // products: {type: DataTypes.JSON},

})

const ReportProducts = sequelize.define('report_products', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    measure: {type: DataTypes.TEXT, defaultValue: 'kg' },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    totalForSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
});

const OutcomeCategory = sequelize.define('outcome_category', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, nullable: false, unique: true},
    is_active: {type: DataTypes.BOOLEAN, nullable: false, defaultValue: true},
});

const Outcome = sequelize.define('outcome', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},

    recipient: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    date: {
        type: DataTypes.DATE(),
        allowNull: false
    }
})

const Salary = sequelize.define('salary', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    advanced_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    date: {
        type: DataTypes.DATE(),
        allowNull: false
    },
    is_active: { type: DataTypes.BOOLEAN, nullable: false, defaultValue: true },
});

const Advance = sequelize.define('advance', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    payment_type: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    // date: { type: DataTypes.DATE, nullable: false, defaultValue: DataTypes.NOW },
});


const Income = sequelize.define('income', {
    id : {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    quantity: {
        type: DataTypes.DECIMAL(16, 4),
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    totalWeight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    date: {
        type: DataTypes.DATE(),
        allowNull: false
    }
})

User.hasMany(Token)
Token.belongsTo(User)

User.hasMany(Salary)
Salary.belongsTo(User)

Salary.hasMany(Advance)
Advance.belongsTo(Salary)

OutcomeCategory.hasMany(Outcome)
Outcome.belongsTo(OutcomeCategory)

Product.hasMany(Income)
Income.belongsTo(Product)
BusinessRelation.hasMany(Income)
Income.belongsTo(BusinessRelation)


BusinessRelation.hasMany(Outcome)
Outcome.belongsTo(BusinessRelation)
Advance.hasMany(Outcome)
Outcome.belongsTo(Advance)

User.hasMany(Report)
Report.belongsTo(User)

// Product.belongsToMany(Report, { through: ReportProducts });
// Report.belongsToMany(Product, { through: ReportProducts });
Product.hasMany(ReportProducts)
ReportProducts.belongsTo(Product)
Report.hasMany(ReportProducts)
ReportProducts.belongsTo(Report)



Product.belongsToMany(BusinessRelation, { through: BusinessRelationProducts });
BusinessRelation.belongsToMany(Product, { through: BusinessRelationProducts });

module.exports = {
    User,
    VerfCodes,
    Token,
    Product,
    BusinessRelation, BusinessRelationProducts,
    Report, ReportProducts,
    OutcomeCategory, Outcome,
    Salary, Advance,
    Income
}

