import { TrackingService } from './../tracking/tracking-service';
import { SectionModel } from './../book/section-model';
import { ReadingService } from './reading-service';
import { HighlightedText } from './highlighted-text';
import { DomUtility } from './dom-utility';
import { IHighlight } from './i-highlight';
import { autoinject } from 'aurelia-framework';

type HighlightClickHandler = (event: MouseEvent | TouchEvent, highlight: HighlightedText) => void;

@autoinject
export class Highlighter {

    private highlights: IHighlight[] = [];
    private highlightedTexts: HighlightedText[] = [];

    private bookId?: number;
    private onHighlightClick?: HighlightClickHandler;

    constructor(
        private readingService: ReadingService,
        private trackingService: TrackingService,
        private domUtility: DomUtility) {
    }

    public async loadHighlights(bookId: number, onHighlightClick?: HighlightClickHandler) {
        this.bookId = bookId;
        this.onHighlightClick = onHighlightClick;
        this.highlights = await this.readingService.getHighlights(bookId);
        this.highlightedTexts = [];
    }

    public showSectionHighlights(section: SectionModel) {
        for (const highlight of this.highlights) {
            if (highlight.endLocation < section.startLocation) {
                continue;
            }

            if (highlight.startLocation > section.endLocation) {
                continue;
            }

            const highlightedText = this.createHighlight(section, highlight);

            if (!highlightedText) {
                continue;
            }

            this.highlightedTexts.push(highlightedText);
        }
    }

    public async updateHighlight(highlight: HighlightedText) {
        const isEmpty = !highlight.highlight.isHighlighted &&
            !highlight.highlight.isUnderlined &&
            !highlight.hasAnnotation;

        if (highlight.hasAnnotation && !highlight.hadSavedAnnotation) {
            this.trackingService.event('annotationAdd');
        } else if (!highlight.hasAnnotation && highlight.hadSavedAnnotation) {
            this.trackingService.event('annotationRemove');
        }

        if (isEmpty) {
            this.removeHighlight(highlight);
        } else {
            this.saveHighlight(highlight);
        }
    }

    public async saveHighlight(highlight: HighlightedText) {
        if (!this.bookId) {
            throw new Error("Book has not been loaded");
        }

        const savedHighlight = await this.readingService.setHighlight(this.bookId, highlight.highlight);

        highlight.setSaved(savedHighlight);

        this.highlightedTexts.push(highlight);
        this.highlights.push(savedHighlight);
    }

    public async removeHighlight(highlight: HighlightedText) {
        if (!this.bookId) {
            throw new Error("Book has not been loaded");
        }

        if (highlight.isSaved) {
            await this.readingService.deleteHighlight(this.bookId, highlight.highlight);

            this.highlights.splice(this.highlights.indexOf(highlight.highlight));
            this.highlightedTexts.splice(this.highlightedTexts.indexOf(highlight));
        }

        this.removeHighlightSpans(highlight);
    }

    public createHighlight(section: SectionModel, highlight: IHighlight): HighlightedText | undefined {
        const matchingHighlight = this.highlightedTexts.find(h =>
            h.highlight.startLocation === highlight.startLocation &&
            h.highlight.endLocation === highlight.endLocation);

        if (matchingHighlight) {
            // No not create highlight that matches an existing one
            return matchingHighlight;
        }

        const startRange = this.domUtility.findRangeEndByLocation(
            section.element, highlight.startLocation - section.startLocation, false);
        const range = this.domUtility.findRangeEndByLocation(
            section.element, highlight.endLocation - section.startLocation, true);

        range.setStart(startRange.endContainer, startRange.endOffset);

        const spans = this.createSpansFromRange(range);

        if (spans.length === 0) {
            return undefined;
        }

        const icon = this.createIconSpan(spans[spans.length - 1]);

        const highlightedText = new HighlightedText(highlight, range, spans, icon);

        const eventHandler = (event: MouseEvent | TouchEvent) => {
            if (this.onHighlightClick) {
                this.onHighlightClick(event, highlightedText);
            }
        }

        for (const span of spans) {
            span.addEventListener("mousedown", eventHandler);
            span.addEventListener('touchend', eventHandler)
        }

        icon.addEventListener('mousedown', eventHandler);
        icon.addEventListener('touchend', eventHandler);

        return highlightedText;
    }

    private removeHighlightSpans(highlight: HighlightedText) {
        for (const span of highlight.spans) {
            span.insertAdjacentText('afterend', span.innerText);
            span.parentElement!.removeChild(span);
        }

        highlight.icon.parentElement!.removeChild(highlight.icon);
    }

    private createSpansFromRange(range: Range): HTMLSpanElement[] {
        const currentRange = range.cloneRange();
        const spans: HTMLSpanElement[] = [];

        let nextSpan: HTMLSpanElement | undefined;

        while (nextSpan = this.createNextSpan(currentRange)) {
            spans.push(nextSpan);
        }

        return spans;
    }

    private createNextSpan(range: Range): HTMLSpanElement | undefined {
        const text = range.toString().trim();

        if (text.length === 0) {
            return;
        }

        const spanRange = document.createRange();
        spanRange.setStart(range.startContainer, range.startOffset);

        if (range.startContainer === range.endContainer) {
            spanRange.setEnd(range.endContainer, range.endOffset);
            range.setStart(spanRange.endContainer, spanRange.endOffset);
        } else {
            // Span will be created until the end of the start container
            spanRange.setEndAfter(range.startContainer);
            range.setStartAfter(range.startContainer);
            this.moveToNextTextNode(range);

            // Ranges containing only whitespace should be skipped
            const spanText = spanRange.toString().trim();
            if (spanText.length === 0) {
                return this.createNextSpan(range);
            }
        }

        const span = document.createElement("span");

        spanRange.surroundContents(span);

        return span;
    }

    private createIconSpan(span: HTMLSpanElement): HTMLSpanElement {
        const icon = document.createElement('span');

        icon.classList.add('icon');

        span.insertAdjacentElement('afterend', icon);

        return icon;
    }

    private moveToNextTextNode(range: Range): void {
        if (range.startContainer instanceof CharacterData) {
            return;
        }

        if (range.startOffset >= range.startContainer.childNodes.length) {
            // Start offset is beyond the end of the start container, move range to start after it
            range.setStartAfter(range.startContainer);

            return this.moveToNextTextNode(range);
        }

        const childStartContainer = range.startContainer.childNodes.item(range.startOffset);

        range.setStart(childStartContainer, 0);

        return this.moveToNextTextNode(range);
    }

}