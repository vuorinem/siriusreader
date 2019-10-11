export class NumberValueConverter {

    public toView(value: number): string {
        return Math.round(value).toString();
    }

}