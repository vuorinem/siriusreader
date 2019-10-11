import { HttpClient } from 'aurelia-fetch-client';
import { autoinject } from 'aurelia-framework';
import { UserService } from './../user/user-service';

@autoinject
export class NrDebriefSheet {
    
    private name: string = "";

    constructor(
        private http: HttpClient,
        private userService: UserService) {
    }

    private async send() {
        await this.userService.sendConfirmDebriefSheet(this.name);
    }

}