export class TextUtility {

    public calculateWords(text: string) {
        const trimmedText = text.trim();

        if (trimmedText.length === 0) {
            return 0;
        }

        return text
            .trim()
            .split(/[^\w\.,\-'"´`]+/) // Count these as the same word
            .length;
    }

    public calculateVisibleCharacters(text: string) {
        return text
            .replace(/\s+/g, '') // Remove all non-visible characters
            .length;
    }

}