export interface ITrackingEvent {
    bookId: number;
    time: Date;
    timezoneOffset: number;
    type: string;
    startLocation: number;
    visibleCharacterCount: number;
    visibleWordCount: number;
    windowWidth: number;
    windowHeight: number;
}
