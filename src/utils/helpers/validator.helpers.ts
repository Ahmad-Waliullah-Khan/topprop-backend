import { find, isEqual } from 'lodash';
import moment from 'moment';
import { US_STATES_ABBREVIATIONS } from '../constants/wallet.constants';

export class ValidatorHelpers {
    static comparePasswords = (val: string, schema: any): boolean => isEqual(schema.password, val);

    // static validAddress = (val: UserAddress, schema: any): boolean => {
    //     if (isEmpty(val) || !val) return false;
    //     let validAddress = false;
    //     if (
    //         val.street1 &&
    //         val.city &&
    //         val.state &&
    //         val.zip &&
    //         isEqual(val.zip.length, 5) &&
    //         val.country &&
    //         val.latitude &&
    //         isNumber(val.latitude) &&
    //         val.longitude &&
    //         isNumber(val.longitude)
    //     )
    //         validAddress = true;
    //     return validAddress;
    // };

    static isEqualTo =
        (equalTo: any) =>
        (val: any, schema: any): boolean =>
            isEqual(val, equalTo);

    static isNumber = (val: any, schema: any): boolean => !isNaN(val);

    static isValidDate = (val: any, schema: any): boolean => moment(val).isValid();

    static isValidAfter =
        (amount: number, unit: moment.unitOfTime.DurationConstructor) =>
        (val: string, schema: any): boolean =>
            moment(val).isAfter(moment().add(amount, unit));

    static isValidAfterFieldBy =
        (amount: number, unit: moment.unitOfTime.DurationConstructor, field: string) =>
        (val: string, schema: any): boolean =>
            moment(val).isAfter(moment(schema[field]).add(amount, unit));

    static isValidAfterMoment =
        (afterMoment: moment.Moment) =>
        (val: string, schema: any): boolean =>
            moment(val).isAfter(afterMoment);

    static isValidBeforeMoment =
        (beforeMoment: moment.Moment) =>
        (val: string, schema: any): boolean =>
            moment(val).isBefore(beforeMoment);

    static isBetween =
        (betweenMoments: [moment.Moment, moment.Moment]) =>
        (val: string, schema: any): boolean =>
            moment(val).isBetween(betweenMoments[0], betweenMoments[1]);

    static lowerOrEqualThan =
        (amount: number) =>
        (val: number, schema: any): boolean =>
            val <= amount;

    static greaterOrEqualThan =
        (amount: number) =>
        (val: number, schema: any): boolean =>
            +val >= amount;

    // static validDeviceInfo = (val: IDeviceInfo, schema: any): boolean => {
    //     if (isEmpty(val) || !val) return false;
    //     let validDeviceInfo = false;
    //     if (
    //         val.deviceType &&
    //         val.language &&
    //         val.manufacturer &&
    //         val.model &&
    //         val.os &&
    //         val.osVersion &&
    //         val.region &&
    //         val.sdkVersion &&
    //         val.uuid
    //     )
    //         validDeviceInfo = true;
    //     return validDeviceInfo;
    // };

    static validWalletState = (value: string): boolean => {
        let state = find(US_STATES_ABBREVIATIONS, state => isEqual(state.value, value));
        if (state) return true;
        return false;
    };
}
