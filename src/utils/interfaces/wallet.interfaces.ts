import Stripe from 'stripe';

export interface IWalletAddPaymentMethodReqData {
    paymentMethodToken: string;
}
export interface IWalletAddPayoutMethodReqData {
    payoutMethodToken: string;
}
export interface IWalletAddFundReqData {
    amount: number;
    paymentMethod?: string;
}
export interface IWalletUpdateRequest {
    address: Stripe.AccountUpdateParams.Individual.Address;
    dob: Stripe.AccountUpdateParams.Individual.Dob;
    firstName: string;
    lastName: string;
    idNumber: string;
}
