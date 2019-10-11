import { HttpClient } from 'aurelia-fetch-client';
import { json } from 'aurelia-fetch-client';
import { autoinject } from "aurelia-framework";

import { IWithdrawalDetails } from './i-withdrawal-details';

@autoinject
export class WithdrawService {

    constructor(private http: HttpClient) {
    }

    public async getWithdrawal(): Promise<IWithdrawalDetails> {
        const response = await this.http
            .fetch(`/user/withdrawal`);

        return await response.json();
    }

    public async postWithdrawal(withdrawal: IWithdrawalDetails): Promise<boolean> {
        const response = await this.http
            .fetch(`/user/withdrawal`, {
                method: 'post',
                body: json(withdrawal),
            });

        return response.ok;
    }

}