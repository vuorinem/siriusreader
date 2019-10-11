import { HttpClient } from 'aurelia-fetch-client';
import { UserService } from './../user/user-service';
import { BookService } from './../book/book-service';
import { AuthService } from '../auth/auth-service';
import { autoinject } from 'aurelia-framework';
import { ReadingState } from './../reading/reading-state';
import { json } from 'aurelia-fetch-client';
import { ITrackingEvent } from './i-tracking-event';

@autoinject
export class TrackingService {

    constructor(
        private authService: AuthService,
        private http: HttpClient,
        private UserService: UserService,
        private bookService: BookService,
        private readingState: ReadingState) {
    }

    public async event(type: string) {
        await this.eventInternal(type);
    }

    public async dialogEvent(type: string, visibleCharacterCount: number, visibleWordCount: number) {
        await this.eventInternal(type, visibleCharacterCount, visibleWordCount);
    }

    private async eventInternal(type: string, visibleCharacterCount?: number, visibleWordCount?: number) {
        if (!this.authService.isAuthenticated) {
            return;
        }

        if (!this.UserService.isReadingSpeedTested) {
            return;
        }

        if (!this.bookService.book) {
            return;
        }

        const time = new Date();

        await this.send({
            bookId: this.bookService.book.bookId,
            time: time,
            timezoneOffset: time.getTimezoneOffset(),
            type: type,
            startLocation: this.readingState.startLocation,
            visibleCharacterCount: visibleCharacterCount !== undefined ?
                visibleCharacterCount : this.readingState.characterCount,
            visibleWordCount: visibleWordCount !== undefined ?
                visibleWordCount : this.readingState.wordCount,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
        });
    }

    private async send(event: ITrackingEvent) {
        await this.http.fetch('/tracking/event', {
            body: json(event),
            method: 'post',
        });
    }

}