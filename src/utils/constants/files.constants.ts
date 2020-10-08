export interface IRequestFileHeaders {
    'content-disposition': string;
    'content-type': string;
}
export interface IRequestFile {
    fieldName: string;
    originalFilename: string;
    path: string;
    headers: IRequestFileHeaders;
    size: number;
}
export interface IMappedFile {
    [fileName: string]: IRequestFile;
}
export interface IMappedField {
    [fieldName: string]: string;
}

export enum FILE_NAMES {
    PLAYERS = 'players',
    VERIFICATION_FILE = 'verification-file',
}

export enum VERIFICATION_FILE_SIDES {
    BACK = 'back',
    FRONT = 'front',
}
