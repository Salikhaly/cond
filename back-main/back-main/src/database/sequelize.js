const {Sequelize}=require('sequelize');
const logger=require('../logger/winstonLogger');
const options={dialect:'postgres',logging:process.env.SQL_LOG==='true'?msg=>logger.info(msg):false};
if(process.env.DATABASE_URL){
 module.exports=new Sequelize(process.env.DATABASE_URL,{...options,pool:{max:3,min:0,idle:10000,acquire:30000},dialectOptions:{ssl:{require:true,rejectUnauthorized:true}}});
}else{
 module.exports=new Sequelize(process.env.DB_NAME,process.env.DB_USER,process.env.DB_PASSWORD,{...options,host:process.env.DB_HOST||'localhost',port:process.env.DB_PORT});
}
