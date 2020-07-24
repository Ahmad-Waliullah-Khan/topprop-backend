export interface IWalletAddPaymentMethodReqData {
    paymentMethodToken: string;
}
export interface IWalletAddFundReqData {
    amount: number;
    paymentMethod?: string;
}
