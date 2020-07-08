import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { join } from 'path';
import EmailTemplate = require('email-templates');

@bind({ scope: BindingScope.SINGLETON })
export class EmailService {
    emailSender: EmailTemplate;
    constructor() {
        const transport = {
            port: +(process.env.SMTP_PORT as string),
            host: process.env.SMTP_HOST as string,
            auth: {
                user: process.env.SMTP_USER as string,
                pass: process.env.SMTP_PASS as string,
            },
            secure: false, //TODO: CHANGE TO TRUE ONCE WE HAVE THE REAL CREDENTIALS
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
            textOnly: true,
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
}
