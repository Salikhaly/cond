const nodemailer = require('nodemailer')
const emailTemplate = require('./emailTemplate')
class MailService {

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
            requireTLS: Number(process.env.SMTP_PORT || 587) !== 465,
            connectionTimeout: 10000,
            socketTimeout: 15000,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        })
    }
    async sendActivationMail(to, code) {
        await this.transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject: 'Код верификации для аккаунта на ' + process.env.API_URL,
            text: '',
            html: emailTemplate(code)
        })
    }

    async sendAccountLink(to, link, kind) {
        const invite=kind==='invite';
        await this.transporter.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to,
            subject:invite?'COND — приглашение сотрудника':'COND — смена пароля',
            text:(invite?'Вас пригласили в COND. Задайте пароль по ссылке (48 часов):':'Для смены пароля откройте ссылку (30 минут):')+'\n'+link+'\nЕсли вы не запрашивали письмо, проигнорируйте его.'});
    }

}

module.exports = new MailService();
