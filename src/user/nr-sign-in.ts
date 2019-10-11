import { ComponentAttached } from 'aurelia-framework';

export class NrSignIn implements ComponentAttached {

    private emailAddress: string = "";
    private isExistingUser: boolean = true;
    private isPasswordSet: boolean = false;

    public attached(): void {
        this.isExistingUser = true;
        this.isPasswordSet = false;
    }

    private resetPassword() {
        this.isExistingUser = false;
    }

    private registered() {
        this.isExistingUser = true;
        this.isPasswordSet = true;
    }

}