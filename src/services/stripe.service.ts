import { bind, BindingScope } from '@loopback/core';
import { TOP_PROP_FEES_MULTIPLIER } from '@src/utils/constants';
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
        let fees = Math.ceil(amount * 0.029 + 30);
        // if (fees % 1 === 0) return fees * TOP_PROP_FEES_MULTIPLIER;
        // return Math.ceil(fees * TOP_PROP_FEES_MULTIPLIER);
        return fees * TOP_PROP_FEES_MULTIPLIER;
    }

    amountAfterFees(amount: number): number {
        let afterFees = amount - this.calculateAppFee(amount);
        return afterFees <= 0 ? 0 : afterFees;
    }
}
