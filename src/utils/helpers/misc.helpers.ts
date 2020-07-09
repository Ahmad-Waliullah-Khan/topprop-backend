// import axios, { AxiosResponse } from 'axios';
// import { GoogleIdTokenGeneratedFromCustom } from '../interfaces/misc.interfaces';
import randomString from 'randomstring';

export class MiscHelpers {
    // //* Just for testing purposes
    // static generateGoogleIdTokenFromCustom = (
    //     customToken: string,
    // ): Promise<AxiosResponse<GoogleIdTokenGeneratedFromCustom>> => {
    //     const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${process.env.FIREBASE_WEB_API_KEY}`;
    //     const data = {
    //         token: customToken,
    //         returnSecureToken: true,
    //     };
    //     return axios.post(url, data);
    // };

    static toCurrency = (amount: number): string => {
        let maskedAmount = `$${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
        if (amount < 0) '-' + maskedAmount;
        return maskedAmount;
    };

    static appendRandomStr = (str: string, customLength?: number): string => {
        customLength = customLength || 15;
        let difference = customLength - str.length;
        if (difference <= 0) return str;
        let appendableStr = randomString.generate({
            length: difference,
            charset: 'alphanumeric',
        });
        return (str += appendableStr);
    };
}
