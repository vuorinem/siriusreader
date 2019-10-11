import { HttpClient } from 'aurelia-fetch-client';
import { UserService } from './../user/user-service';
import { autoinject, computedFrom } from 'aurelia-framework';

@autoinject
export class NrConsentForm {

    private consentsConfirmed: string[] = [];

    @computedFrom('consentsConfirmed.length', 'http.isRequesting')
    private get canContinue(): boolean {
        return this.consentsConfirmed.length === 10 &&
            !this.http.isRequesting;
    }

    constructor(
        private http: HttpClient,
        private userService: UserService) {
    }

    private async confirm() {
        if (this.consentsConfirmed.length !== 10) {
            return;
        }

        await this.userService.sendConfirmConsent();
    }

}