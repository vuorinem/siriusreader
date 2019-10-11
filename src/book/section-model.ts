import { observable, computedFrom } from 'aurelia-framework';
import { bookConfig } from './book-config';

export class SectionModel {
    public element!: HTMLElement;
    public url: string;
    public characters: number;
    public shouldLoad: boolean = false;
    public isLoading: boolean = false;
    public isLoaded: boolean = false;
    public startLocation: number = 0;
    public endLocation: number = 0;

    public previousSection?: SectionModel;
    public nextSection?: SectionModel;

    @observable public pageWidth?: number;
    @observable public left: number = 0;

    private width: number = 0;

    @computedFrom('left', 'width')
    public get right(): number {
        return this.left + this.width;
    }

    constructor({ url, characters, previousSection }: { url: string, characters: number, previousSection?: SectionModel }) {
        this.url = url;
        this.characters = characters;
        this.previousSection = previousSection;

        if (previousSection) {
            previousSection.nextSection = this;
        }
    }

    public refreshWidth() {
        if (!this.pageWidth) {
            return;
        }

        if (!this.element.lastElementChild || !this.element.firstElementChild) {
            this.width = this.pageWidth;
            
            return;
        }

        const oldWidth = this.width;

        let newWidth = this.getRight(this.element.lastElementChild)
            - this.element.firstElementChild.getBoundingClientRect().left
            + bookConfig.columnGap;

        // Make sure the width is a multiple of half page width
        const widthOverflow = newWidth % (this.pageWidth / 2);
        if (widthOverflow > 0.1) {
            newWidth += this.pageWidth / 2 - widthOverflow;
        }

        if (oldWidth !== newWidth) {
            this.width = newWidth;

            this.moveNextSection(newWidth - oldWidth);
        }
    }

    private getRight(element: Element): number {
        const rect = element.getBoundingClientRect();

        if (rect.width > 0) {
            return rect.right;
        }

        if (element.previousElementSibling != null) {
            return this.getRight(element.previousElementSibling);
        }

        return 0;
    }

    private leftChanged(newLeft: number, oldLeft: number) {
        if (oldLeft === undefined) {
            this.moveNextSection(newLeft);
        } else {
            this.moveNextSection(newLeft - oldLeft);
        }
    }

    private pageWidthChanged(newPageWidth: number, oldPageWidth?: number) {
        if (oldPageWidth !== undefined) {
            this.refreshWidth();
        }
    }

    private moveNextSection(moveBy: number) {
        if (this.nextSection) {
            this.nextSection.left += moveBy;
        }
    }
}