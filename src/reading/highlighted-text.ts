import { IHighlight } from './i-highlight';

export class HighlightedText {

    public isSelected: boolean = false;

    public hadSavedAnnotation: boolean = false;

    public get isSaved(): boolean {
        return !!this.highlight.highlightId;
    }

    public get hasAnnotation(): boolean {
        return !!this.highlight.annotation && this.highlight.annotation.trim().length > 0;
    }

    constructor(
        public readonly highlight: IHighlight,
        public readonly range: Range,
        public readonly spans: HTMLSpanElement[],
        public readonly icon: HTMLSpanElement) {

        for (const span of this.spans) {
            span.classList.add("highlight");
        }

        this.icon.classList.add("highlight");

        this.hadSavedAnnotation = this.hasAnnotation;

        this.refreshClasses();
    }

    public setSaved(savedHighlight: IHighlight) {
        Object.assign(this.highlight, savedHighlight);

        this.hadSavedAnnotation = this.hasAnnotation;

        this.refreshClasses();
    }

    public setIsSelected(isSelected: boolean) {
        this.isSelected = isSelected;

        this.refreshClasses();
    }

    public setIsHighlighted(isHighlighted: boolean) {
        this.highlight.isHighlighted = isHighlighted;

        this.refreshClasses();
    }

    public setIsUnderlined(isUnderlined: boolean) {
        this.highlight.isUnderlined = isUnderlined;

        this.refreshClasses();
    }

    public refreshClasses() {
        for (const span of this.spans) {
            if (this.isSaved) {
                span.classList.add('saved');
            } else {
                span.classList.remove('saved');
            }

            if (this.isSelected) {
                span.classList.add('selected');
            } else {
                span.classList.remove('selected');
            }

            if (this.highlight.isHighlighted) {
                span.classList.add('highlighted');
            } else {
                span.classList.remove('highlighted');
            }

            if (this.highlight.isUnderlined) {
                span.classList.add('underlined');
            } else {
                span.classList.remove('underlined');
            }

            if (this.hasAnnotation) {
                span.classList.add('annotated');
            } else {
                span.classList.remove('annotated');
            }
        }

        if (this.hasAnnotation) {
            this.icon.hidden = false;
            this.icon.classList.add('oi', 'oi-comment-square');
        } else {
            this.icon.hidden = true;
            this.icon.classList.remove('oi', 'oi-comment-square');
        }
    }

}