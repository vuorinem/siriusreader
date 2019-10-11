import { autoinject } from 'aurelia-framework';
import { IBookmark } from './i-bookmark';
import { HttpClient, json } from 'aurelia-fetch-client';
import { IHighlight } from './i-highlight';

@autoinject
export class ReadingService {

    constructor(private http: HttpClient) {
    }

    public async getLocation(bookId: number): Promise<number> {
        const response = await this.http.fetch(`/book/${bookId}/bookmark`);

        const bookmark: IBookmark = await response.json();

        return bookmark.location;
    }

    public async setLocation(bookId: number, location: number | undefined) {
        if (location) {
            this.http.fetch(`/book/${bookId}/bookmark`, {
                body: json(<IBookmark>{
                    location: location,
                }),
                method: 'post',
            });
        } else {
            this.http.fetch(`/book/${bookId}/bookmark`, {
                method: 'delete',
            });
        }
    }

    public async getHighlights(bookId: number): Promise<IHighlight[]> {
        const response = await this.http.fetch(`/book/${bookId}/highlight`);

        return response.json();
    }

    public async setHighlight(bookId: number, highlight: IHighlight): Promise<IHighlight> {
        const response = await this.http.fetch(`/book/${bookId}/highlight`, {
            body: json(highlight),
            method: 'post',
        });

        return response.json();
    }

    public async deleteHighlight(bookId: number, highlight: IHighlight): Promise<void> {
        await this.http.fetch(`/book/${bookId}/highlight/${highlight.highlightId}`, {
            method: 'delete',
        });
    }

}