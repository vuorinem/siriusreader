import { HttpClient } from 'aurelia-fetch-client';
import { IVerificationResponse } from './i-verification-response';
import { autoinject, bindable } from 'aurelia-framework';
import { json } from 'aurelia-fetch-client';

@autoinject
export class UserRegister {

    @bindable() private registered?: () => void;
    @bindable private emailAddress: string = "";
    private verificationToken: string = "";
    private name: string = "";
    private password: string = "";
    private passwordConfirm: string = "";

    private isLoading: boolean = false;
    private error?: string;

    private isEmailSent: boolean = false;
    private isEmailVerified: boolean = false;
    private isEmailRegistered: boolean = false;

    constructor(private http: HttpClient) {
    }

    private reset() {
        this.emailAddress = "";

        this.clearState();
    }

    private clearState(){
        this.isEmailSent = false;
        this.isEmailVerified = false;
        this.isEmailRegistered = false;

        this.verificationToken = "";
        this.name = "";
        this.password = "";
        this.passwordConfirm = "";
    }

    private async requestVerification() {
        this.error = undefined;

        try {
            this.isLoading = true;
            const response = await this.http.fetch(`/email-verification`, {
                method: "post",
                body: json({ emailAddress: this.emailAddress }),
            });

            if (!response.ok) {
                this.error = "Could not send registration email, please try again later.";
            } else {
                this.isEmailSent = true;
            }
        } finally {
            this.isLoading = false;
        }
    }

    private async verify() {
        this.error = undefined;
        this.isEmailVerified = false;

        try {
            this.isLoading = true;
            const response = await this.http.fetch(`/email-verification/verify`, {
                method: "post",
                body: json({
                    emailAddress: this.emailAddress,
                    emailVerificationToken: this.verificationToken,
                }),
            });

            if (!response.ok) {
                const responseMessage = await response.json();
                if (responseMessage) {
                    this.error = responseMessage;
                } else {
                    this.error = "Could not verify email address, please check the verification code.";
                }
            } else {
                const responseContent: IVerificationResponse = await response.json();
                this.isEmailVerified = true;
                this.isEmailRegistered = responseContent.isEmailRegistered;
            }
        } finally {
            this.isLoading = false;
        }
    }

    private async register() {
        if (this.password !== this.passwordConfirm) {
            this.error = "Please type the same password in both fields.";
            return;
        }

        this.error = undefined;

        try {
            this.isLoading = true;
            const response = await this.http.fetch(`/user`, {
                method: "post",
                body: json({
                    emailAddress: this.emailAddress,
                    emailVerificationToken: this.verificationToken,
                    name: this.name,
                    password: this.password,
                }),
            });

            if (!response.ok) {
                const responseMessage = await response.json();
                if (responseMessage) {
                    this.error = responseMessage;
                } else {
                    this.error = "Could not register, please try again later.";
                }
            } else {
                this.clearState();

                if (this.registered) {
                    this.registered();
                }
            }
        } finally {
            this.isLoading = false;
        }
    }

}