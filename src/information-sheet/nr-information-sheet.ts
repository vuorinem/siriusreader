import { HttpClient } from 'aurelia-fetch-client';
import { UserService } from './../user/user-service';
import { autoinject, computedFrom } from 'aurelia-framework';

@autoinject
export class NrInformationSheet {

    private isConfirmed: boolean = false;

    @computedFrom('isConfirmed', 'http.isRequesting')
    private get canContinue(): boolean {
        return this.isConfirmed &&
            !this.http.isRequesting;
    }

    constructor(
        private http: HttpClient,
        private userService: UserService) {
    }

    private async confirm() {
        if (!this.isConfirmed) {
            return;
        }

        await this.userService.sendConfirmInformationSheet();
    }

}