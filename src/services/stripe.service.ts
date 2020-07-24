import { bind, BindingScope } from '@loopback/core';
import Stripe from 'stripe';

@bind({ scope: BindingScope.SINGLETON })
export class StripeService {
    stripe: Stripe;
    constructor() {
        const apiVersion2020_03_02 = '2020-03-02';
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: apiVersion2020_03_02,
        });
        // this.stripe.accounts.del('acct_1H8S4XEPnaM6Osxg').then(res => console.log);
    }

    async defaultPaymentMethod(customerToken: string): Promise<string> {
        const customer = (await this.stripe.customers.retrieve(customerToken)) as Stripe.Customer;
        return customer.invoice_settings.default_payment_method as string;
    }

    stripifyAmount(amount: number) {
        return amount * 100;
    }

    calculateAppFee(amount: number): number {
        return amount * 0.029 + 30;
    }

    amountAfterFees(amount: number): number {
        return amount - this.calculateAppFee(amount);
    }
}
