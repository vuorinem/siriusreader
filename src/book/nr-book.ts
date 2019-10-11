import { HighlightedText } from '../reading/highlighted-text';
import { Highlighter } from './../reading/highlighter';
import { TimeoutService } from '../utility/timeout-service';
import { WindowTrackingService } from './../tracking/window-tracking-service';
import { DomUtility } from './../reading/dom-utility';
import { TrackingService } from './../tracking/tracking-service';
import { ReadingState } from './../reading/reading-state';
import { bookConfig } from './book-config';
import { SectionModel } from './section-model';
import { BindingEngine, Disposable, computedFrom, bindingMode } from 'aurelia-binding';
import { autoinject, ComponentAttached, ComponentDetached, TaskQueue, bindable } from 'aurelia-framework';
import { BookService } from './book-service';
import { IBookDetails } from '../book/i-book-details';
import { ReadingService } from '../reading/reading-service';

type BrowseStyle = 'turn' | 'jump';

const SwipeThreshold = 20;
const HorizontalScrollThreshold = 20;
const HighlightMenuWidth = 310;
const HighlightMenuHeight = 80;
const LongTouchThreshold = 1000;
const InactiveTimeoutInMinutes = 5;

@autoinject
export class NrBook implements ComponentAttached, ComponentDetached {
    @bindable({ defaultBindingMode: bindingMode.twoWay }) private isMenuOpen!: boolean;

    private book?: IBookDetails;
    private sections: SectionModel[] = [];

    private isHighlightMenuOpen: boolean = false;
    private selectedHighlight: HighlightedText | null = null;
    private highlightMenuX: number = 0;
    private highlightMenuY: number = 0;

    private bookContentElement?: HTMLDivElement;
    private bookSectionsElement?: HTMLDivElement;
    private currentViewOffset: number = 0;
    private isTransitioning: boolean = false;
    private totalCharacters: number = 0;

    private observers: Disposable[] = [];

    private onTransitionend: () => void = () => this.handleTransitionend();
    private onKeyDown: (e: KeyboardEvent) => void = e => this.handleKeyDown(e);
    private onWheel: (e: WheelEvent) => void = e => this.handleWheel(e);
    private onWindowResize: () => void = () => this.handleWindowResize();

    private canTriggerPageTurn: boolean = false;
    private browseStyle: BrowseStyle = 'turn';
    private isInitialized: boolean = false;
    private isInactive: boolean = false;
    private isDialogOpen: boolean = false;

    private touchStartX: number | null = null;
    private touchEndX: number | null = null;
    private touchStartY: number | null = null;
    private touchStartTime: Date | null = null;

    @computedFrom("isMenuOpen", 'isInitialized', 'windowTrackingService.isFocused', 'isInactive', 'isDialogOpen')
    private get isContentHidden(): boolean {
        return this.isMenuOpen ||
            this.isInactive ||
            this.isDialogOpen ||
            !this.windowTrackingService.isFocused ||
            !this.isInitialized;
    }

    @computedFrom('readingState.startLocation', 'totalCharacters')
    private get progressPercentage(): number {
        if (!this.totalCharacters) {
            return 0;
        }

        if (this.readingState.startLocation + this.readingState.characterCount >= this.totalCharacters) {
            // When showing the last page, show 100% instead of the percentage for the start of the page
            return 100;
        }

        return this.readingState.startLocation * 100 / this.totalCharacters;
    }

    constructor(
        private bindingEngine: BindingEngine,
        private taskQueue: TaskQueue,
        private timeoutService: TimeoutService,
        private bookService: BookService,
        private readingState: ReadingState,
        private readingService: ReadingService,
        private windowTrackingService: WindowTrackingService,
        private trackingService: TrackingService,
        private highlighter: Highlighter,
        private domUtility: DomUtility) {
    }

    public async attached(): Promise<void> {
        this.book = this.bookService.book;

        if (!this.book) {
            throw new Error('Book has not been selected');
        }

        this.isMenuOpen = false;

        this.highlighter.loadHighlights(this.book.bookId, (event, highlight) => this.onHighlightClick(highlight));

        this.trackingService.event('openBook');

        let previousSection: SectionModel | undefined;

        this.totalCharacters = 0;

        for (const sectionData of this.book.sections) {
            const section = new SectionModel({
                url: sectionData.name,
                characters: sectionData.characters,
                previousSection: previousSection,
            });

            this.sections.push(section);

            previousSection = section;

            section.startLocation = this.totalCharacters;
            this.totalCharacters += section.characters;
            section.endLocation = this.totalCharacters;
        }

        const viewWidth = this.getViewWidthInPixels();

        for (const section of this.sections) {
            section.pageWidth = viewWidth;
        }

        const startLocation = await this.readingService.getLocation(this.book.bookId);
        this.jumpToLocation(startLocation);

        this.observers = this.sections.map(section => this.bindingEngine
            .propertyObserver(section, 'left')
            .subscribe((newLeft: number, oldLeft: number) => this.sectionLeftChanged(section, oldLeft)));

        this.setInativeTimeout();

        this.bookSectionsElement!.addEventListener('transitionend', this.onTransitionend, false);
        window.addEventListener('keydown', this.onKeyDown, false);
        window.addEventListener('wheel', this.onWheel, false);
        window.addEventListener('resize', this.onWindowResize, false);
    }

    public detached() {
        this.bookSectionsElement!.removeEventListener('transitionend', this.onTransitionend);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('resize', this.onWindowResize);

        this.clearInactiveTimeout();

        let observer: Disposable | undefined;
        while (observer = this.observers.pop()) {
            observer.dispose();
        }

        this.sections = [];
    }

    private jumpToLocation(location: number): void {
        if (this.sections.length == 0) {
            return;
        }

        const section = this.sections.find(i => i.startLocation <= location && i.endLocation > location);

        if (!section) {
            const bookEndLocation = this.sections[this.sections.length - 1].endLocation;
            if (location >= bookEndLocation) {
                return this.jumpToLocation(bookEndLocation - 1);
            } else {
                throw Error("Invalid location");
            }
        }

        if (section.isLoaded) {
            this.jumpToLocationInSection(section, location - section.startLocation);
        } else {
            const observer = this.bindingEngine.propertyObserver(section, 'isLoaded').subscribe(() => {
                this.jumpToLocationInSection(section, location - section.startLocation);
                observer.dispose();
            });
        }

        section.shouldLoad = true;
    }

    private jumpToLocationInSection(section: SectionModel, sectionLocation: number) {
        const offsetFromCurrentView = this.domUtility.findOffsetForLocation(section.element, sectionLocation);
        const offsetFromStart = offsetFromCurrentView + this.currentViewOffset;

        this.jumpToOffset(offsetFromStart);
    }

    private isLink(target: EventTarget | null): boolean {
        if (!target || !(target instanceof HTMLElement)) {
            return false;
        }

        if (target instanceof HTMLAnchorElement) {
            return target.hasAttribute('href');
        }

        return this.isLink(target.parentElement);
    }

    private mouseDown(event: MouseEvent) {
        this.canTriggerPageTurn =
            event.button === 0 &&
            !this.isLink(event.target) &&
            this.isSelectionEmpty();

        this.setInativeTimeout();

        return true;
    }

    private mouseMove(event: MouseEvent) {
        if (!this.canTriggerPageTurn) {
            return true;
        }

        if (!this.isSelectionEmpty()) {
            this.canTriggerPageTurn = false;
        }

        return true;
    }

    private mouseLeave(event: MouseEvent) {
        this.canTriggerPageTurn = false;
    }

    private mouseUp(event: MouseEvent) {
        this.setInativeTimeout();

        if (this.handleHighlight(event.clientX, event.clientY)) {
            return;
        }

        if (!this.canTriggerPageTurn) {
            return true; // Revert to default action
        }

        this.canTriggerPageTurn = false;

        if (event.clientX > document.body.clientWidth / 2) {
            this.moveForward('click');
        } else {
            this.moveBack('click');
        }
    }

    private handleWheel(event: WheelEvent) {
        if (this.isContentHidden || this.isTransitioning) {
            return true;
        }

        this.setInativeTimeout();

        if (event.deltaY > 0) {
            this.moveForward('wheel');
        } else {
            this.moveBack('wheel');
        }
    }

    private touchStart(event: TouchEvent) {
        if (event.changedTouches.length !== 1) {
            return true;
        }

        this.touchStartX = event.changedTouches[0].clientX;
        this.touchStartY = event.changedTouches[0].clientY;
        this.touchStartTime = new Date();

        return true;
    }

    private touchMove(event: TouchEvent) {
        this.setInativeTimeout();

        if (!this.touchStartX) {
            return true;
        }

        if (event.changedTouches.length !== 1 || !this.touchStartY) {
            this.endTouchHandling();
            return true;
        }

        const swipeX = event.changedTouches[0].clientX - this.touchStartX;
        const swipeY = event.changedTouches[0].clientY - this.touchStartY;
        if (Math.abs(swipeY) > Math.abs(swipeX) + HorizontalScrollThreshold) {
            this.endTouchHandling();

            if (swipeY > 0) {
                this.trackingService.event('swipeUp');
            } else {
                this.trackingService.event('swipeDown');
            }

            return true;
        }

        this.touchEndX = event.changedTouches[0].clientX;

        return true;
    }

    private touchEnd(event: TouchEvent) {
        this.setInativeTimeout();

        if (this.touchStartX === null) {
            return true;
        }

        if (this.handleLongTouch(event)) {
            this.endTouchHandling();
            return false;
        }

        if (event.changedTouches.length !== 1) {
            this.endTouchHandling();
            return true;
        }

        this.touchEndX = event.changedTouches[0].clientX;

        const swipeX = this.touchEndX - this.touchStartX;

        if (Math.abs(swipeX) > SwipeThreshold) {
            if (swipeX < 0) {
                this.moveForward('swipe');
            } else if (swipeX > 0) {
                this.moveBack('swipe');
            }
        } else if (this.handleHighlight(this.touchEndX, event.changedTouches[0].clientY)) {
            // The touch event was handled by highlighting
        } else if (this.isLink(event.target)) {
            return true;
        } else if (this.touchEndX > document.body.clientWidth / 2) {
            this.moveForward('touch');
        } else if (this.touchEndX < document.body.clientWidth / 2) {
            this.moveBack('touch');
        }

        this.endTouchHandling();

        return false;
    }

    private handleLongTouch(event: TouchEvent): boolean {
        if (!this.touchStartTime) {
            return false;
        }
        const touchDuration = new Date().valueOf() - this.touchStartTime.valueOf();

        if (touchDuration < LongTouchThreshold) {
            return false;
        }

        if (this.handleHighlight(event.changedTouches[0].clientX, event.changedTouches[0].clientY)) {
            return true;
        }

        return false
    }

    private touchCancel(event: TouchEvent) {
        this.endTouchHandling();
    }

    private endTouchHandling() {
        this.touchStartX = null;
        this.touchEndX = null;
        this.touchStartY = null;
    }

    private progressBarClick(event: MouseEvent) {
        this.setInativeTimeout();

        const progressBar = event.currentTarget as HTMLDivElement;
        const targetPercentage = event.offsetX / progressBar.clientWidth;
        const targetLocation = Math.round(this.totalCharacters * targetPercentage);

        this.trackingService.event('progressBarJump');

        this.taskQueue.queueTask(() => {
            this.jumpToLocation(targetLocation);
        });
    }

    private overlayClick() {
        this.setInativeTimeout();
        this.isMenuOpen = false;
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (this.isContentHidden || this.isTransitioning) {
            this.setInativeTimeout();

            return true;
        }

        this.setInativeTimeout();

        if (event.key == "ArrowRight" || event.key == "Right") {
            this.moveForward('keyboard');
        }

        if (event.key == "ArrowLeft" || event.key == "Left") {
            this.moveBack('keyboard');
        }

        this.handleDebugKey(event);
    }

    private moveForward(source: string) {
        this.move(this.getViewWidthInPixels(), source + 'Forward');
    }

    private moveBack(source: string) {
        this.move(-this.getViewWidthInPixels(), source + 'Backward');
    }

    private getViewWidthInPixels(): number {
        if (!this.bookContentElement) {
            throw new Error("Book is not yet initialized");
        }

        // Distance to the next view is book content width - paddings + one column gap
        return this.bookContentElement.clientWidth - bookConfig.padding * 2 + bookConfig.columnGap;
    }

    private move(moveByPixels: number, source: string) {
        if (this.sections.some(section => section.isLoading)) {
            // Do not allow moving while loading
            return;
        }

        if (!this.readingState.section) {
            // Cannot turn page if we are not within a section
            return;
        }

        if (this.isTransitioning) {
            // Only allow one transition at the time
            return;
        }

        const newViewOffset = this.currentViewOffset + moveByPixels;

        if (!this.readingState.section.previousSection && this.readingState.section.left > newViewOffset) {
            // Trying to turn page before the start of the book
            return;
        }

        if (!this.readingState.section.nextSection && Math.round(this.readingState.section.right) <= newViewOffset) {
            // Trying to turn page after the end of the book
            return;
        }

        this.trackingService.event(source);

        this.startTransitionTo(newViewOffset, 'turn');

        this.taskQueue.queueTask(() => {
            this.updateSectionVisibility(Math.abs(moveByPixels));
        });
    }

    private jumpToOffset(offset: number) {
        const viewWidth = this.getViewWidthInPixels();
        const jumpToPage = Math.floor(offset / viewWidth);
        const jumpToPixels = jumpToPage * viewWidth;

        this.startTransitionTo(jumpToPixels, 'jump');

        this.updateSectionVisibility(viewWidth);
    }

    private updateSectionVisibility(movementSize: number) {
        for (const section of this.sections) {
            if (section.right < this.currentViewOffset - movementSize) {
                // Page is past the view
                section.shouldLoad = false;
                continue;
            }

            if (section.left > this.currentViewOffset + movementSize) {
                // Page is not yet in the view
                section.shouldLoad = false;
                continue;
            }

            if (!section.shouldLoad) {
                // The section is visible (or almost visible) but not loaded, set it to load
                section.shouldLoad = true;
            }
        }
    }

    private startTransitionTo(offset: number, browseStyle: BrowseStyle) {
        this.closeHighlightMenu();

        this.isTransitioning = true;

        if (this.currentViewOffset !== offset) {
            this.browseStyle = browseStyle;
            this.currentViewOffset = offset;
        } else {
            this.handleTransitionend();
        }
    }

    private handleTransitionend() {
        if (!this.isInitialized) {
            this.isInitialized = true;
        }

        this.isTransitioning = false;

        this.taskQueue.queueTask(() => {
            this.updateReadingStateAndProgress();

            this.trackingService.event('openPage');

            this.setInativeTimeout();
        });
    }

    private updateReadingStateAndProgress() {
        if (!this.book || !this.bookContentElement) {
            return;
        }

        this.readingState.setCurrentView(this.bookContentElement.getBoundingClientRect(), this.sections);

        if (!this.readingState.section) {
            return;
        }

        this.readingService.setLocation(this.book.bookId, this.readingState.startLocation);
    }

    private sectionLeftChanged(section: SectionModel, oldLeft: number) {
        if (this.readingState.section === section) {
            // Section left from current view has moved, so move the current view as well
            this.currentViewOffset += section.left - oldLeft;
        }
    }

    private isSelectionEmpty(): boolean {
        const selection = window.getSelection();

        return !(selection.toString().length > 0);
    }

    private setInativeTimeout() {
        this.isInactive = false;

        this.timeoutService.debounce('inactive', InactiveTimeoutInMinutes * 60 * 1000, async () => {
            if (this.isContentHidden) {
                return;
            }

            await this.trackingService.event('inactiveTimeout');

            this.isInactive = true;
        });
    }

    private clearInactiveTimeout() {
        this.timeoutService.cancel('inactive');
    }

    private handleWindowResize() {
        this.taskQueue.queueTask(() => {
            this.timeoutService.debounce('resize', 500, async () => {
                this.refreshIfWindowIsResized();
            });
        });
    }

    private async refreshIfWindowIsResized() {
        await this.trackingService.event('resize');

        this.setInativeTimeout();

        if (!this.readingState.view || !this.bookContentElement) {
            return;
        }

        const currentView = this.bookContentElement.getBoundingClientRect();

        if (this.readingState.view.width === currentView.width &&
            this.readingState.view.height === currentView.height) {
            return;
        }

        if (currentView.height < 400 && currentView.width < 400 || currentView.height < 150) {
            // Prevent resizing on mobile when keyboard shown
            return;
        }

        const viewWidth = this.getViewWidthInPixels();

        for (const section of this.sections) {
            section.pageWidth = viewWidth;
        }

        this.jumpToLocation(this.readingState.startLocation);
    }

    private handleHighlight(mouseX: number, mouseY: number): boolean {
        if (!this.readingState.section) {
            return false;
        }

        const selection = document.getSelection();
        const range = !!selection && !selection.isCollapsed ? selection.getRangeAt(0) : null;

        if (!selection || !range || range.collapsed) {
            if (this.isHighlightMenuOpen) {
                this.closeHighlightMenu();
                return true; // Prevent navigating when closing highlight menu
            } else if (this.selectedHighlight) {
                // Clicking existing highlight
                this.trackingService.event("openSelection");
                this.openHighlightMenu(mouseX, mouseY);
                return true; // Prevent navigating when opening existing highlight
            } else {
                return false;
            }
        }

        if (this.selectedHighlight) {
            // Clear current selection before selecting a new range
            this.selectedHighlight.setIsSelected(false);
            this.highlighter.updateHighlight(this.selectedHighlight);
            this.selectedHighlight = null;
        }

        const startLocation = this.readingState.getLocation(range.startContainer, range.startOffset);
        const endLocation = this.readingState.getLocation(range.endContainer, range.endOffset);

        if (startLocation === null || endLocation === null) {
            return false;
        }

        const highlight = this.highlighter.createHighlight(this.readingState.section, {
            startLocation: startLocation,
            endLocation: endLocation,
            isHighlighted: false,
            isUnderlined: false,
            text: range.toString(),
        });

        if (!highlight) {
            return false;
        }

        this.selectedHighlight = highlight;
        this.selectedHighlight.setIsSelected(true);

        this.openHighlightMenu(mouseX, mouseY);

        this.trackingService.event("newSelection");

        selection.removeAllRanges();

        return true;
    }

    private onHighlightClick(highlight: HighlightedText) {
        if (!this.selectedHighlight) {
            this.selectedHighlight = highlight;
            this.selectedHighlight.setIsSelected(true);
        }
    }

    private openHighlightMenu(x: number, y: number) {
        this.highlightMenuX = x;
        this.highlightMenuY = y;

        if (this.highlightMenuX + HighlightMenuWidth > this.bookContentElement!.clientWidth) {
            this.highlightMenuX -= HighlightMenuWidth;
        }

        if (this.highlightMenuY + HighlightMenuHeight > this.bookContentElement!.clientHeight) {
            this.highlightMenuY -= HighlightMenuHeight;
        }

        this.isHighlightMenuOpen = true;
    }

    private closeHighlightMenu() {
        this.updateHighlight();

        if (this.selectedHighlight) {
            this.selectedHighlight.setIsSelected(false);
            this.selectedHighlight = null;
        }

        if (this.isHighlightMenuOpen) {
            this.isHighlightMenuOpen = false;
            this.trackingService.event("closeSelection");
        }

        this.setInativeTimeout();
    }

    private async updateHighlight() {
        if (!this.selectedHighlight) {
            return;
        }

        await this.highlighter.updateHighlight(this.selectedHighlight);
    }

    private handleDebugKey(event: KeyboardEvent) {
        if (!event.shiftKey || !event.key) {
            return;
        }

        // Debugging tools
        const key = event.key.toLowerCase();
        if (key !== 't') {
            return;
        }

        const selection = document.getSelection();

        if (!selection) {
            return;
        }

        const range = selection.getRangeAt(0);
        if (range.collapsed) {
            return;
        }
        const start =
            this.readingState.getLocation(range.startContainer, range.startOffset);
        const end =
            this.readingState.getLocation(range.endContainer, range.endOffset);

        if (start === null || end === null) {
            return;
        }

        alert(`
Selection start: ${start}
Selection end: ${end}
Selection characters: ${end - start}

View words: ${this.readingState.wordCount}
View characters: ${this.readingState.characterCount}

Section characters: ${this.readingState.sectionCharacterCount}`
        );
    }

}