import { bind, BindingScope } from '@loopback/core';
import { isEqual } from 'lodash';
import Stripe from 'stripe';

@bind({ scope: BindingScope.SINGLETON })
export class StripeService {
    stripe: Stripe;
    constructor() {
        const apiVersion2020_03_02 = '2020-03-02';
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: apiVersion2020_03_02,
        });
    }

    async defaultPaymentMethod(customerToken: string): Promise<string> {
        const customer = (await this.stripe.customers.retrieve(customerToken)) as Stripe.Customer;
        return customer.invoice_settings.default_payment_method as string;
    }
    async validPaymentMethod(customerToken: string, paymentMethodToken: string): Promise<boolean> {
        const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodToken);
        if (isEqual(paymentMethod.customer, customerToken)) return true;
        return false;
    }

    stripifyAmount(amount: number) {
        return amount * 100;
    }

    calculateAppFee(amount: number): number {
        let returnValue = amount * 0.029 + 30;
        if (returnValue % 1 === 0) return returnValue;
        return Math.ceil(returnValue);
    }

    amountAfterFees(amount: number): number {
        return amount - this.calculateAppFee(amount);
    }
}
