import { HttpClient } from 'aurelia-fetch-client';
import { IBookDetails } from './i-book-details';
import { autoinject, computedFrom } from "aurelia-framework";

@autoinject
export class BookService {
    @computedFrom('bookDetails')
    public get isBookSelected(): boolean {
        return !!this.bookDetails;
    }

    @computedFrom('bookDetails')
    public get book(): IBookDetails | undefined {
        return this.bookDetails;
    }

    private bookDetails?: IBookDetails;
    private domParser: DOMParser = new DOMParser();

    constructor(private http: HttpClient) {
    }

    public async loadSelectedBook() {
        const response = await this.http
            .fetch(`/book/selected`);

        if (response.status === 204) {
            // Selected book returned no content
            this.bookDetails = undefined;

            return;
        }

        this.bookDetails = await response.json();
    }

    public clearSelectedBook() {
        this.bookDetails = undefined;
    }

    public async selectBook(bookId: number) {
        const response = await this.http
            .fetch(`/book/select/${bookId}`, {
                method: 'post',
            });

        if (response.ok) {
            this.bookDetails = await response.json();
        } else {
            throw new Error('Error loading selected book');
        }
    }

    public async getSection(sectionName: string): Promise<NodeList> {
        if (!this.book) {
            throw new Error("Book has not been selected");
        }

        const response = await this.http
            .fetch(`/book/${this.book.bookId}/${sectionName}`);

        const responseHtml = await response.text();
        const document = this.domParser.parseFromString(responseHtml, "text/html");
        const bodyElements = document.getElementsByTagName("body");

        if (bodyElements.length !== 1) {
            throw new Error('Invalid HTML returned by API');
        }

        return bodyElements[0].childNodes;
    }

    public async getImage(imageUrl: string): Promise<Blob> {
        if (!this.book) {
            throw new Error("Book has not been selected");
        }

        const response = await this.http
            .fetch(`/book/${this.book.bookId}/image/${imageUrl}`);

        return response.blob();
    }
}