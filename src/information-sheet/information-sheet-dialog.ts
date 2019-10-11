import { autoinject } from 'aurelia-framework';
import { DialogController, DialogComponentActivate } from 'aurelia-dialog';

@autoinject
export class InformationSheetDialog {

    constructor(private dialogController: DialogController) {
    }

}