import { bind, BindingScope } from '@loopback/core';
import Stripe from 'stripe';

@bind({ scope: BindingScope.SINGLETON })
export class StripeService {
    stripe: Stripe;
    constructor() {
        const apiVersion2020_03_02 = '2020-03-02';
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: apiVersion2020_03_02 });
    }

    async defaultPaymentMethod(customerToken: string): Promise<string> {
        const customer = (await this.stripe.customers.retrieve(customerToken)) as Stripe.Customer;
        return customer.invoice_settings.default_payment_method as string;
    }
}
