export interface IHighlight {
    highlightId?: number;
    startLocation: number;
    endLocation: number;
    isHighlighted: boolean;
    isUnderlined: boolean;
    text: string;
    annotation?: string;
}
