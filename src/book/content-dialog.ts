import { TrackingService } from './../tracking/tracking-service';
import { autoinject, ComponentDetached, ComponentAttached } from 'aurelia-framework';
import { DialogController, DialogComponentActivate } from 'aurelia-dialog';
import { TextUtility } from '../reading/text-utility';

@autoinject
export class ContentDialog implements DialogComponentActivate<HTMLElement>, ComponentAttached, ComponentDetached {

    private contentElement!: HTMLElement;
    private content!: HTMLElement;
    private characterCount: number = 0;
    private wordCount: number = 0;

    constructor(
        private dialogController: DialogController,
        private trackingService: TrackingService,
        private textUtility: TextUtility) {
    }

    public async activate(model?: HTMLElement | undefined) {
        if (!model) {
            throw new Error('Dialog content could not be found');
        }

        const range = document.createRange();
        range.selectNodeContents(model);

        const dialogText = range.toString();

        this.characterCount = this.textUtility.calculateVisibleCharacters(dialogText);
        this.wordCount = this.textUtility.calculateWords(dialogText);

        await this.trackingService.dialogEvent('dialogOpen', this.characterCount, this.wordCount);

        this.content = model;
    }

    public attached() {
        this.contentElement.appendChild(this.content);
    }

    public detached() {
        if (!this.content) {
            return;
        }

        this.contentElement.removeChild(this.content);
    }

    private async close() {
        await this.trackingService.dialogEvent('dialogClose', this.characterCount, this.wordCount);

        this.dialogController.ok();
    }

}