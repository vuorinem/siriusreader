import { HighlightedText } from '../reading/highlighted-text';
import { IBookDetails } from './i-book-details';
import { bindable, autoinject, TaskQueue } from 'aurelia-framework';
import { TrackingService } from '../tracking/tracking-service';

@autoinject
export class NrHighlightMenu {

    @bindable private book?: IBookDetails;
    @bindable private highlight?: HighlightedText;

    private showAnnotation: boolean = false;
    private annotationInput!: HTMLTextAreaElement;

    constructor(
        private taskQueue: TaskQueue,
        private trackingService: TrackingService) {
    }

    private toggleHighlighted() {
        if (!this.highlight) {
            return;
        }

        const newIsHighlighted = !this.highlight.highlight.isHighlighted;

        this.trackingService.event(newIsHighlighted ? 'highlightAdd' : 'highlightRemove');
        this.highlight.setIsHighlighted(newIsHighlighted);
    }

    private toggleUnderlined() {
        if (!this.highlight) {
            return;
        }

        const newIsUnderlined = !this.highlight.highlight.isUnderlined;

        this.trackingService.event(newIsUnderlined ? 'underlineAdd' : 'underlineRemove');
        this.highlight.setIsUnderlined(newIsUnderlined);
    }

    private toggleAnnotation() {
        if (!this.highlight) {
            return;
        }

        if (!this.highlight.highlight.annotation) {
            this.showAnnotation = !this.showAnnotation;
        }

        if (this.showAnnotation || !!this.highlight.highlight.annotation) {
            this.taskQueue.queueTask(() => this.annotationInput.focus());
        }
    }

    private clearAnnotation() {
        if (!this.highlight) {
            return;
        }

        this.highlight.highlight.annotation = '';
        this.showAnnotation = false;

        this.highlight.refreshClasses();
    }

    private highlightChanged() {
        this.showAnnotation = false;
    }

}