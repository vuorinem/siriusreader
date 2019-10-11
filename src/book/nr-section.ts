import { ContentDialog } from './content-dialog';
import { DialogService } from 'aurelia-dialog';
import { Highlighter } from './../reading/highlighter';
import { Disposable } from 'aurelia-binding';
import { SectionModel } from './section-model';
import { autoinject, BindingEngine, bindingMode } from 'aurelia-framework';
import { BookService } from './book-service';
import { bindable } from 'aurelia-framework';

@autoinject
export class NrSection {
    @bindable private section!: SectionModel;
    @bindable({ defaultBindingMode: bindingMode.fromView }) private isDialogOpen: boolean = false;

    private element: HTMLElement;

    private shouldLoadObserver?: Disposable;

    private dialogs = new Map<string, HTMLElement>();

    constructor(
        element: Element,
        private bindingEngine: BindingEngine,
        private dialogService: DialogService,
        private bookService: BookService,
        private highlighter: Highlighter) {

        this.element = element as HTMLElement;
    }

    public bind() {
        this.section.element = this.element;

        this.shouldLoadObserver = this.bindingEngine
            .propertyObserver(this.section, 'shouldLoad')
            .subscribe(() => this.shouldLoadChanged());
    }

    public unbind() {
        if (this.shouldLoadObserver) {
            this.shouldLoadObserver.dispose();
        }
    }

    public attached() {
        this.update();
    }

    public detached() {
        this.clear();
    }

    private shouldLoadChanged() {
        this.update();
    }

    private update() {
        if (!this.section.shouldLoad) {
            this.clear();
            return;
        }

        if (this.section.isLoaded) {
            return;
        }

        this.load();
    }

    private clear() {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild)
        }

        this.dialogs.clear();

        this.section.isLoaded = false;
    }

    private async load() {
        if (!this.section.url) {
            return;
        }

        this.section.isLoading = true;

        const sectionNodes = await this.bookService.getSection(this.section.url);

        const loaderPromises: Promise<void>[] = [];

        while (sectionNodes.length > 0) {
            const node = sectionNodes.item(0);

            loaderPromises.push(...this.replaceContent(node!));

            this.element.appendChild(node!);
        }

        await Promise.all(loaderPromises);

        if (!this.element.lastElementChild || !this.element.firstElementChild) {
            this.section.isLoading = false;

            return;
        }

        this.checkForDialogs(this.element);

        this.section.refreshWidth();

        this.section.isLoading = false;
        this.section.isLoaded = true;

        this.highlighter.showSectionHighlights(this.section);
    }

    private replaceContent(node: Node): Promise<void>[] {
        const loadPromises: Promise<void>[] = [];

        if (node instanceof HTMLImageElement) {
            loadPromises.push(this.replaceImageSrcWithBlobUrl(node));
        } else if (node instanceof HTMLAnchorElement) {
            this.checkForLink(node);
        }

        for (let i = 0; i < node.childNodes.length; i++) {
            loadPromises.push(...this.replaceContent(node.childNodes.item(i)));
        }

        return loadPromises;
    }

    private async replaceImageSrcWithBlobUrl(img: HTMLImageElement) {
        // Get original src without baseUrl
        const imageSrc = img.getAttribute("src");

        if (!imageSrc) {
            return;
        }

        // Clear node src to prevent trying to load wrong url
        img.src = "";

        const blob = await this.bookService.getImage(imageSrc);

        await this.setImgSrc(img, URL.createObjectURL(blob));
    }

    private async setImgSrc(img: HTMLImageElement, src: string): Promise<void> {
        return new Promise<void>((resolve) => {
            const onImgLoaded = () => {
                img.removeEventListener('load', onImgLoaded);

                resolve();
            };

            img.addEventListener('load', onImgLoaded);

            img.src = src;
        });
    }

    private checkForLink(a: HTMLAnchorElement) {
        const href = a.getAttribute('href');

        if (!href) {
            return;
        }

        if (href.charAt(0) === '#') {
            a.addEventListener('click', async (event: MouseEvent) => {
                event.preventDefault();

                this.openDialog(href.substr(1));
            });
        } else {
            a.removeAttribute('href');
        }
    }

    private checkForDialogs(node: Node) {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        for (let i = 0; i < node.childNodes.length; i++) {
            const childNode = node.childNodes.item(i);

            if (this.isDialog(node)) {
                this.dialogs.set(node.id, node);
                node.parentNode!.replaceChild(document.createElement('span'), node)
                return;
            }

            this.checkForDialogs(childNode);
        }
    }

    private isDialog(node: HTMLElement) {
        return node.classList.contains("Reader-figure") ||
            node.classList.contains("Reader-footnote");
    }

    private async openDialog(id: string) {
        if (!this.dialogs.has(id)) {
            return;
        }

        this.isDialogOpen = true;

        await this.dialogService.open({
            viewModel: ContentDialog,
            model: this.dialogs.get(id),
            overlayDismiss: true,
            lock: true,
        }).whenClosed();

        this.isDialogOpen = false;
    }
}
