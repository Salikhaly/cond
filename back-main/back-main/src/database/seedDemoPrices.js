const {Product}=require('../models/models');
const {SellingPrice}=require('../models/operations');
module.exports=async()=>{
    if(process.env.PUBLIC_DEMO!=='true')return;
    for(const [name,price]of [['Печенье сливочное',2000],['Кексы ванильные',2200]]){
        const product=await Product.findOne({where:{name}});
        if(product)await SellingPrice.findOrCreate({where:{productId:product.id},defaults:{price}});
    }
};
