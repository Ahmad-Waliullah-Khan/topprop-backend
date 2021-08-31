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
        const maskedAmount = `$${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
        if (amount < 0) '-' + maskedAmount;
        return maskedAmount;
    };

    static appendRandomStr = (str: string, customLength?: number): string => {
        customLength = customLength || 15;
        const difference = customLength - str.length;
        if (difference <= 0) return str;
        const appendableStr = randomString.generate({
            length: difference,
            charset: 'alphanumeric',
        });
        return (str += appendableStr);
    };

    static roundValue = (value: number, step: number) => {
        step || (step = 1.0);
        const inv = 1.0 / step;
        let total = 0;
        if (value < 0) {
            total = Math.floor(value * inv) / inv;
        } else {
            total = Math.ceil(value * inv) / inv;
        }
        return total;
    };

    static parseCookie(cookie: string) {
        const value = '; ' + document.cookie;
        const parts = value.split('; ' + name + '=');
        console.log('Parsing cookie: ' + name);
        if (parts.length === 2) {
            console.log(parts.pop()?.split(';').shift());
            return parts.pop()?.split(';').shift();
        }
    }

    static getUniqueItemsByProperties(items: any, propNames: string[] | string) {
        const propNamesArray = Array.from(propNames);

        return items.filter(
            (item: any, index: number, array: any) =>
                index === array.findIndex((foundItem: any) => this.isPropValuesEqual(foundItem, item, propNamesArray)),
        );
    }

    static isPropValuesEqual(subject: any, target: any, propNames: any) {
        return propNames.every((propName: any) => subject[propName] === target[propName]);
    }

    static d2c(value: string | number) {
        return Number(value) * 100;
    }

    static c2d(value: string | number) {
        return Number(value) / 100;
    }
}
