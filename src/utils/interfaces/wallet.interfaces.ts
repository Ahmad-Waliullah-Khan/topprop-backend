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
