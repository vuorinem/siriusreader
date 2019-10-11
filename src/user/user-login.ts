import { UserService } from './user-service';
import { BookService } from './../book/book-service';
import { AuthService } from '../auth/auth-service';
import { autoinject, bindable } from 'aurelia-framework';
import { TrackingService } from '../tracking/tracking-service';

@autoinject
export class UserLogin {

    @bindable private emailAddress: string = "";
    @bindable private resetPassword?: () => void;

    private password: string = "";

    private isError: boolean = false;
    private isConnectionError: boolean = false;
    private isLoading: boolean = false;

    constructor(
        private authService: AuthService,
        private userService: UserService,
        private bookService: BookService,
        private trackingService: TrackingService) {
    }

    private async signIn() {
        this.isError = false;
        this.isConnectionError = false;

        try {
            this.isLoading = true;
            const isAuthenticateSuccessful = await this.authService.authenticate(this.emailAddress, this.password);

            this.password = "";

            if (isAuthenticateSuccessful) {
                await this.userService.load();
                await this.bookService.loadSelectedBook();
            } else {
                this.isError = true;
            }
        } catch(error){
            this.isConnectionError = true;
        } finally {
            this.isLoading = false;
        }

        this.trackingService.event('login');
    }

}