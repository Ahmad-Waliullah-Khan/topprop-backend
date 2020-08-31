import { UserProfile } from '@loopback/security';
import { User } from '@src/models';

export interface ICustomUserProfile extends UserProfile {
    // role?: ROLES;
    permissions?: string[];
    token?: string;
    username?: string;
    isAdmin?: boolean;
}

// export interface IUserRequest extends User {
//     password: string;
//     confirmPassword: string;
// }

export class SignupUserRequest extends User {
    constructor(public password?: string, public confirmPassword?: string) {
        super();
    }
}
export class ISignupUserResponse {
    data: string;
}
export class ResetPasswordRequest {
    constructor(public password: string, public confirmPassword: string, public forgotPasswordToken: string) {}
}
export class ChangePasswordRequest {
    constructor(public password: string, public confirmPassword: string) {}
}

export class LoginCredentials {
    constructor(public password: string, public emailOrUsername: string) {}
}
