import {bind, /* inject, */ BindingScope} from '@loopback/core';
import {join} from 'path';
import EmailTemplate = require('email-templates');
import chalk = require('chalk');

@bind({ scope: BindingScope.SINGLETON })
export class EmailService {
    private emailSender: EmailTemplate;
    constructor() {
        const transport = {
            port: +(process.env.SMTP_PORT as string),
            host: process.env.SMTP_HOST as string,
            auth: {
                user: process.env.SMTP_USER as string,
                pass: process.env.SMTP_PASS as string,
            },
            secure: true,
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false,
            },
        };

        this.emailSender = new EmailTemplate({
            message: {
                from: process.env.MAIL_FROM as string,
            },
            htmlToText: false,
            textOnly: false,
            preview: false,
            send: true,
            transport,
            views: {
                root: join(__dirname, '..', '..', 'emails'),
                // options: {
                //     extension: 'ejs', // <---- HERE
                // },
            },
            juice: true,
            juiceResources: {
                preserveImportant: true,
                webResources: {
                    relativeTo: join(__dirname, '..', '..', 'emails', 'styles'),
                },
            },
        });
    }

    async sendEmail(options: EmailTemplate.EmailOptions): Promise<void> {
        try {
            await this.emailSender.send(options);
            console.log(chalk.greenBright(`Email sent. Template: ${options.template} - To: ${options.message.to}`));
        } catch (error) {
            console.error(
                chalk.redBright(
                    `Error sending email. Template: ${options} - To: ${options.message.to}. Error: `,
                    error,
                ),
            );
        }
    }
}
