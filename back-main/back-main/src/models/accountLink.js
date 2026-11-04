const D=require('sequelize').DataTypes;
module.exports=require('../database/sequelize').define('account_link',{
 hash:{type:D.STRING(64),primaryKey:true},kind:{type:D.STRING(16),allowNull:false},
 email:{type:D.STRING,allowNull:false},userId:D.INTEGER,payload:D.JSONB,
 expiresAt:{type:D.DATE,allowNull:false},usedAt:D.DATE,
},{indexes:[{fields:['email','createdAt']}]});
