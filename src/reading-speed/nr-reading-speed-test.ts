import { TextUtility } from './../reading/text-utility';
import { autoinject, computedFrom } from "aurelia-framework";
import { UserService } from '../user/user-service';

const MaxWordsPerMinute = 900;

@autoinject
export class NrReadingSpeedTest {

    private textContainer!: HTMLElement;
    private startTime?: Date;
    private endTime?: Date;
    private wordsPerMinuteRead?: number;
    private attempt: number = 0;

    @computedFrom('wordsPerMinuteRead')
    private get isRealisticReadingSpeed(): boolean {
        return !!this.wordsPerMinuteRead && this.wordsPerMinuteRead <= MaxWordsPerMinute;
    }

    constructor(
        private userService: UserService,
        private textUtility: TextUtility) {
    }

    private start() {
        this.attempt++;
        this.endTime = undefined;
        this.startTime = new Date();
    }

    private end() {
        if (!this.startTime) {
            return;
        }

        this.endTime = new Date();

        const text = this.textContainer.textContent;
        const numberOfWords = this.textUtility.calculateWords(text!);

        const millisecondsRead = this.endTime.getTime() - this.startTime.getTime();
        const minutesRead = millisecondsRead / (1000 * 60);

        this.wordsPerMinuteRead = numberOfWords / minutesRead;
    }

    private reset() {
        this.startTime = undefined;
        this.endTime = undefined;
        this.wordsPerMinuteRead = undefined;
    }

    private async save() {
        if (!this.wordsPerMinuteRead || !this.isRealisticReadingSpeed) {
            return;
        }

        await this.userService.sendReadingSpeedTestResult(this.wordsPerMinuteRead);
    }

}