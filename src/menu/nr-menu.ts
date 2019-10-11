import { InformationSheetDialog } from './../information-sheet/information-sheet-dialog';
import { DialogService } from 'aurelia-dialog';
import { BookService } from '../book/book-service';
import { TrackingService } from './../tracking/tracking-service';
import { bindingMode } from 'aurelia-binding';
import { autoinject, bindable } from 'aurelia-framework';
import { AuthService } from '../auth/auth-service';
import { WithdrawDialog } from '../withdrawal/withdraw-dialog';

@autoinject
export class NrMenu {

    @bindable({ defaultBindingMode: bindingMode.twoWay }) private isOpen: boolean = false;
    @bindable private isBookOpen: boolean = false;

    constructor(
        private dialogService: DialogService,
        private authService: AuthService,
        private bookService: BookService,
        private trackingService: TrackingService) {
    }

    private async openInformationSheet() {
        await this.dialogService.open({
            viewModel: InformationSheetDialog,
            overlayDismiss: true,
            lock: true,
        }).whenClosed();

        this.isOpen = false;
    }

    private async withdraw() {
        const dialogResult = await this.dialogService.open({
            viewModel: WithdrawDialog,
            overlayDismiss: true,
            lock: true,
        }).whenClosed();

        if (dialogResult.wasCancelled) {
            return;
        }

        await this.bookService.clearSelectedBook();
        await this.authService.logout();
    }

    private async logout() {
        this.isOpen = false;

        await this.trackingService.event('logout');

        await this.bookService.clearSelectedBook();
        await this.authService.logout();
    }

    private isOpenChanged(newValue?: boolean, oldValue?: boolean) {
        if (oldValue === undefined) {
            return;
        }

        if (this.isOpen) {
            this.trackingService.event('openMenu');
        } else {
            this.trackingService.event('closeMenu');
        }
    }

}