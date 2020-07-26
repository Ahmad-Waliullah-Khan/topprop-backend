import { Request } from '@loopback/rest';

export interface IRawRequest extends Request {
    rawBody: string | Buffer;
}
