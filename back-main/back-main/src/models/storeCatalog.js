const db=require('../database/sequelize'),{DataTypes:D}=require('sequelize');
const Link=db.define('store_catalog_link',{id:{type:D.UUID,primaryKey:true,defaultValue:D.UUIDV4},outletId:{type:D.UUID,allowNull:false},tokenHash:{type:D.STRING(64),allowNull:false,unique:true},active:{type:D.BOOLEAN,allowNull:false,defaultValue:true},createdBy:{type:D.INTEGER,allowNull:false},revokedBy:D.INTEGER,revokedAt:D.DATE},{indexes:[{fields:['outletId','active']}]});
const Origin=db.define('store_catalog_order',{orderId:{type:D.UUID,primaryKey:true},linkId:{type:D.UUID,allowNull:false},outletId:{type:D.UUID,allowNull:false},representativeId:D.INTEGER});
const Rate=db.define('store_catalog_rate',{key:{type:D.STRING(160),primaryKey:true},hits:{type:D.INTEGER,allowNull:false},expiresAt:{type:D.DATE,allowNull:false}},{indexes:[{fields:['expiresAt']}]});
module.exports={Link,Origin,Rate};
