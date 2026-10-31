const assert = require('node:assert/strict');
const validate = require('../src/config/validate');
const original = {...process.env};
const valid = {NODE_ENV:'production',LOCAL_DEMO:'false',DB_NAME:'cond_prod',DB_USER:'cond_app',DB_PASSWORD:'a-distinct-long-password-238519',DB_HOST:'db',CLIENT_URL:'https://cond.test',SECRET_KEY:'unique-test-secret-for-validation-only-123456789012345678901234',SMTP_HOST:'smtp.test',SMTP_PORT:'587',SMTP_USER:'test@test.test',SMTP_PASSWORD:'smtp-test-password',SUPERADMIN_EMAILS:'admin@test.test',SUPERADMIN_PASSWORD:'admin-test-password'};
let count=0;
try {
    Object.assign(process.env, valid); validate(); console.log('PASS complete production configuration'); count++;
    for (const [key,value] of Object.entries({LOCAL_DEMO:'true',SECRET_KEY:'weak',DB_PASSWORD:'cond_local_dev',CLIENT_URL:'http://cond.test',SMTP_HOST:'',SUPERADMIN_PASSWORD:'short'})) {
        Object.assign(process.env,valid,{[key]:value}); assert.throws(validate); console.log('PASS rejects unsafe '+key); count++;
    }
    console.log(count+' production configuration checks passed');
} finally { for(const key of Object.keys(process.env)) if(!(key in original)) delete process.env[key]; Object.assign(process.env,original); }
