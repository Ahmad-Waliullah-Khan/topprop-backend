import { User } from '@src/models';
import Stripe from 'stripe';

export interface ISignedEventData {
    user: User | null;
    event: Stripe.Event | null;
    error: boolean;
    errorMessage?: string;
}
export interface IInvoicePaymentSuccessData {
    id: string;
    object: string;
    account_country: string;
    account_name: string;
    amount_due: number;
    amount_paid: number;
    amount_remaining: number;
    application_fee_amount: null;
    attempt_count: number;
    attempted: boolean;
    auto_advance: boolean;
    billing_reason: string;
    charge: null;
    collection_method: string;
    created: number;
    currency: string;
    custom_fields: null;
    customer: string;
    customer_address: null;
    customer_email: string;
    customer_name: string;
    customer_phone: null;
    customer_shipping: null;
    customer_tax_exempt: string;
    customer_tax_ids: string[];
    default_payment_method: null;
    default_source: null;
    default_tax_rates: string[];
    description: null;
    discount: null;
    due_date: null;
    ending_balance: number;
    footer: null;
    hosted_invoice_url: string;
    invoice_pdf: string;
    lines: {
        object: string;
        data: IStripeLine[];
        has_more: boolean;
        total_count: number;
        url: string;
    };
    livemode: boolean;
    metadata: Stripe.Metadata;
    next_payment_attempt: null;
    number: string;
    paid: boolean;
    payment_intent: null;
    period_end: number;
    period_start: number;
    post_payment_credit_notes_amount: number;
    pre_payment_credit_notes_amount: number;
    receipt_number: null;
    starting_balance: number;
    statement_descriptor: null;
    status: string;
    status_transitions: {
        finalized_at: number;
        marked_uncollectible_at: null;
        paid_at: number;
        voided_at: null;
    };
    subscription: string;
    subtotal: number;
    tax: null;
    tax_percent: null;
    total: number;
    total_tax_amounts: string[];
    webhooks_delivered_at: null;
}
export interface IInvoicePaymentFailedData {
    id: 'pi_1GBrOyIf1QFqU8J4hlFejZrE';
    object: 'payment_intent';
    amount: 4892;
    amount_capturable: 0;
    amount_received: 0;
    application: null;
    application_fee_amount: null;
    canceled_at: null;
    cancellation_reason: null;
    capture_method: 'automatic';
    charges: {
        object: 'list';
        data: [
            {
                id: 'ch_1GBrOzIf1QFqU8J4SoxXLrAu';
                object: 'charge';
                amount: 4892;
                amount_refunded: 0;
                application: null;
                application_fee: null;
                application_fee_amount: null;
                balance_transaction: null;
                billing_details: {
                    address: { city: null; country: null; line1: null; line2: null; postal_code: null; state: null };
                    email: null;
                    name: null;
                    phone: null;
                };
                captured: false;
                created: 1581637645;
                currency: 'usd';
                customer: 'cus_GjJg31rMGGYTEh';
                description: 'Subscription creation';
                destination: null;
                dispute: null;
                disputed: false;
                failure_code: 'card_declined';
                failure_message: 'Your card was declined.';
                fraud_details: {};
                invoice: 'in_1GBrOyIf1QFqU8J4qo9mhCX1';
                livemode: false;
                metadata: {};
                on_behalf_of: null;
                order: null;
                outcome: {
                    network_status: 'declined_by_network';
                    reason: 'generic_decline';
                    risk_level: 'normal';
                    risk_score: 53;
                    seller_message: 'The bank did not return any further details with this decline.';
                    type: 'issuer_declined';
                };
                paid: false;
                payment_intent: 'pi_1GBrOyIf1QFqU8J4hlFejZrE';
                payment_method: 'pm_1GBr3SIf1QFqU8J4vwKR43ZO';
                payment_method_details: {
                    card: {
                        brand: 'visa';
                        checks: { address_line1_check: null; address_postal_code_check: null; cvc_check: null };
                        country: 'US';
                        exp_month: 2;
                        exp_year: 2021;
                        fingerprint: 'dIDjbf7x6yft3RIV';
                        funding: 'credit';
                        installments: null;
                        last4: '0341';
                        network: 'visa';
                        three_d_secure: null;
                        wallet: null;
                    };
                    type: 'card';
                };
                receipt_email: null;
                receipt_number: null;
                receipt_url: 'https://pay.stripe.com/receipts/acct_1FiPKbIf1QFqU8J4/ch_1GBrOzIf1QFqU8J4SoxXLrAu/rcpt_GjK39RDQlNj1efrzR99roNKmLyBTfAx';
                refunded: false;
                refunds: {
                    object: 'list';
                    data: [];
                    has_more: false;
                    total_count: 0;
                    url: '/v1/charges/ch_1GBrOzIf1QFqU8J4SoxXLrAu/refunds';
                };
                review: null;
                shipping: null;
                source: null;
                source_transfer: null;
                statement_descriptor: 'Premium product.';
                statement_descriptor_suffix: null;
                status: 'failed';
                transfer_data: null;
                transfer_group: null;
            },
        ];
        has_more: false;
        total_count: 1;
        url: '/v1/charges?payment_intent=pi_1GBrOyIf1QFqU8J4hlFejZrE';
    };
    client_secret: 'pi_1GBrOyIf1QFqU8J4hlFejZrE_secret_pRgipFD39TMREM55WSD3kfRW7';
    confirmation_method: 'automatic';
    created: 1581637644;
    currency: 'usd';
    customer: 'cus_GjJg31rMGGYTEh';
    description: 'Subscription creation';
    invoice: 'in_1GBrOyIf1QFqU8J4qo9mhCX1';
    last_payment_error: {
        charge: 'ch_1GBrOzIf1QFqU8J4SoxXLrAu';
        code: 'card_declined';
        decline_code: 'generic_decline';
        doc_url: 'https://stripe.com/docs/error-codes/card-declined';
        message: 'Your card was declined.';
        payment_method: {
            id: 'pm_1GBr3SIf1QFqU8J4vwKR43ZO';
            object: 'payment_method';
            billing_details: {
                address: { city: null; country: null; line1: null; line2: null; postal_code: null; state: null };
                email: null;
                name: null;
                phone: null;
            };
            card: {
                brand: 'visa';
                checks: { address_line1_check: null; address_postal_code_check: null; cvc_check: null };
                country: 'US';
                exp_month: 2;
                exp_year: 2021;
                fingerprint: 'dIDjbf7x6yft3RIV';
                funding: 'credit';
                generated_from: null;
                last4: '0341';
                three_d_secure_usage: { supported: true };
                wallet: null;
            };
            created: 1581636311;
            customer: 'cus_GjJg31rMGGYTEh';
            livemode: false;
            metadata: {};
            type: 'card';
        };
        type: 'card_error';
    };
    livemode: false;
    metadata: {};
    next_action: null;
    on_behalf_of: null;
    payment_method: null;
    payment_method_options: { card: { installments: null; request_three_d_secure: 'automatic' } };
    payment_method_types: ['card'];
    receipt_email: null;
    review: null;
    setup_future_usage: 'off_session';
    shipping: null;
    source: null;
    statement_descriptor: 'Premium product.';
    statement_descriptor_suffix: null;
    status: 'requires_payment_method';
    transfer_data: null;
    transfer_group: null;
}

export interface IStripeLine {
    id: string;
    object: string;
    amount: number;
    currency: string;
    description: string;
    discountable: boolean;
    invoice_item: string;
    livemode: boolean;
    metadata: Stripe.Metadata;
    period: {
        end: number;
        start: number;
    };
    plan: {
        id: string;
        object: string;
        active: boolean;
        aggregate_usage: null;
        amount: number;
        amount_decimal: string;
        billing_scheme: string;
        created: number;
        currency: string;
        interval: string;
        interval_count: number;
        livemode: boolean;
        metadata: {
            description: string;
            sortPriority: string;
        };
        nickname: string;
        product: string;
        tiers: null;
        tiers_mode: null;
        transform_usage: null;
        trial_period_days: null;
        usage_type: string;
    };
    proration: boolean;
    quantity: number;
    subscription: string;
    subscription_item: string;
    tax_amounts: string[];
    tax_rates: string[];
    type: string;
}
