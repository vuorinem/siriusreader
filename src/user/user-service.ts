import { HttpClient } from 'aurelia-fetch-client';
import { EventLogin, EventLogout } from './../auth/auth-service';
import { autoinject, computedFrom } from 'aurelia-framework';
import { IUserDetails } from './i-user-details';
import { json } from 'aurelia-fetch-client';
import { EventAggregator } from 'aurelia-event-aggregator';

@autoinject
export class UserService {

    private userDetails?: IUserDetails;

    @computedFrom('userDetails')
    public get isReadingSpeedTested(): boolean {
        return !!this.userDetails &&
            !!this.userDetails.readingSpeedWordsPerMinute;
    }

    @computedFrom('userDetails')
    public get isDeadlinePassed(): boolean {
        if (!this.userDetails) {
            return false;
        }

        const deadline = new Date(this.userDetails.deadline);

        return new Date() > deadline;
    }

    @computedFrom('userDetails')
    public get user(): Readonly<IUserDetails> | undefined {
        return this.userDetails;
    }

    constructor(
        private eventAggregator: EventAggregator,
        private http: HttpClient) {

        eventAggregator.subscribe(EventLogin, () => this.load());
        eventAggregator.subscribe(EventLogout, () => this.clear());
    }

    public async load(): Promise<IUserDetails> {
        const response = await this.http
            .fetch('/user/current');

        const userDetails = await response.json();

        this.userDetails = userDetails;

        return userDetails;
    }

    public clear() {
        this.userDetails = undefined;
    }

    public async sendReadingSpeedTestResult(result: number) {
        const response = await this.http
            .fetch('/user/current/reading-speed-result', {
                method: 'post',
                body: json({ readingSpeedWordsPerMinute: result }),
            });

        if (!response.ok) {
            throw Error('Error saving readins speed test result');
        }

        this.userDetails = await response.json();
    }

    public async sendConfirmInformationSheet() {
        const response = await this.http
            .fetch('/user/current/confirm-information-sheet', { method: 'post' });

        if (!response.ok) {
            throw Error('Error confirming information sheet');
        }

        this.userDetails = await response.json();
    }

    public async sendConfirmConsent() {
        const response = await this.http
            .fetch('/user/current/confirm-consent', { method: 'post' });

        if (!response.ok) {
            throw Error('Error confirming consent');
        }

        this.userDetails = await response.json();
    }

    public async sendConfirmDebriefSheet(name: string) {
        const response = await this.http
            .fetch('/user/current/confirm-debrief', {
                method: 'post',
                body: json({ name: name }),
            });

        if (!response.ok) {
            throw Error('Error confirming debriefing');
        }

        this.userDetails = await response.json();
    }

}