require('dotenv').config();
const {Client}=require('pg');
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const database=process.env.PRESENTATION_DB || 'cond_presentation_'+date;
if (!/^cond_presentation_\d{8}$/.test(database)) throw new Error('Invalid presentation database name');
const db=new Client({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:'postgres'});
(async()=>{await db.connect();if(!(await db.query('SELECT 1 FROM pg_database WHERE datname=$1',[database])).rowCount)await db.query(`CREATE DATABASE "${database}"`);console.log(database);})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.end());
