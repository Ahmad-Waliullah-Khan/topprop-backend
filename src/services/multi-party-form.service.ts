import { /* inject, */ BindingScope, injectable } from '@loopback/core';
import { Request } from '@loopback/rest';
import { IMappedField, IMappedFile, IRequestFile } from '@src/utils/constants';
import { parse } from 'bytes';
import chalk from 'chalk';
import { removeSync } from 'fs-extra';
import { forOwn, isEqual } from 'lodash';
import multiparty from 'multiparty';

@injectable({ scope: BindingScope.SINGLETON })
export class MultiPartyFormService {
    constructor(/* Add @inject to inject parameters */) {}

    async getFilesAndFields(req: Request, maxFileSize = '10MB'): Promise<{ files: IMappedFile; fields: IMappedField }> {
        return new Promise((resolve, reject) => {
            const form = new multiparty.Form({
                maxFilesSize: parse(maxFileSize),
            });
            form.parse(req, (error, fields, files) => {
                if (error) {
                    if (isEqual((error as any).code, 'ETOOBIG')) error.message = `The maximum file size is 10MB.`;
                    return reject(error);
                }
                let mappedFile: IMappedFile = {};
                forOwn(files, (val, key) => {
                    let file: IRequestFile = val[0];
                    mappedFile[file.fieldName] = file;
                });
                let mappedField: IMappedField = {};
                forOwn(fields, (val, key) => {
                    mappedField[key] = val[0];
                });

                return resolve({ files: mappedFile, fields: mappedField });
            });
        });
    }

    removeFiles(files: IMappedFile, keepFile?: string): void {
        forOwn(files, (val, key) => {
            if (keepFile && isEqual(key, keepFile)) return;
            removeSync(val.path);
            delete files[key];
            console.log(chalk.greenBright(`File: ${val.originalFilename} was removed successfully.`));
        });
    }

    isContentType(baseContentType: string, contentTypeToMatch: string): boolean {
        return new RegExp(baseContentType).test(contentTypeToMatch);
    }
}
