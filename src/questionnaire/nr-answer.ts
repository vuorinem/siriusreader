import { Disposable, observable } from 'aurelia-binding';
import { IQuestionDetails } from './i-question-details';
import { bindable, bindingMode, ComponentBind, ComponentUnbind, autoinject, BindingEngine } from 'aurelia-framework';

@autoinject
export class NrAnswer implements ComponentBind, ComponentUnbind {

    @bindable private question!: IQuestionDetails;
    @bindable({ defaultBindingMode: bindingMode.twoWay }) private value?: string;

    private observsers: Disposable[] = [];

    private likertOptions = [
        'Strongly Agree',
        'Agree',
        'Neutral',
        'Disagree',
        'Strongly Disagree',
    ];

    private frequencyOptions = [
        'Always',
        'Often',
        'Sometimes',
        'Rarely',
        'Never',
    ];

    private likemeOptions = [
        'Very much like me',
        'Somewhat like me',
        'Neutral',
        'Not much like me',
        'Not at all like me',
    ];

    private trueOfMeOptions = [
        '1 <br/> Not at all <br/> true of me',
        '2',
        '3',
        '4 <br/> Neutral',
        '5',
        '6',
        '7 <br/> Very true <br/> of me',
    ];

    private genders = [
        'Female',
        'Male',
        'Other',
        'Prefer not to say',
    ];

    private yesno = [
        'Yes',
        'No',
    ];

    private yesnounsure = [
        'Yes',
        'No',
        'Unsure',
    ];

    private gpaOptions = [
        'Mostly A - First/1st',
        'Mostly A or B - 1st or 2:1',
        'Mostly B - Upper Second/2:1',
        'Mostly B or C - 2:1 or 2:2',
        'Mostly C - Lower Second/2:2',
        'Mostly C or D - 2:2 or 3:1',
        'Mostly D - Third/3:1',
    ];

    private taughtInOptions = [
        'Yes, in school',
        'Yes, in university',
        'No',
        'Not sure',
    ];

    private devices = [
        'Desktop computer',
        'Laptop computer',
        'iPad/Tablet computer',
        'Dedicated e-reader (e.g. Kindle)',
        'With an audio application',
        'I never read course material electronically'
    ];

    private selectedDevices: string[] = [];
    private isOtherSelected: boolean = false;
    @observable private deviceOther: string = "";

    private articleParts = [
        'The abstract',
        'The introduction',
        'The method',
        'The results',
        'The discussion',
        'The conclusion',
        'The references',
    ];

    private selectedArticleParts: string[] = [];

    private get name(): string {
        return 'question-' + this.question.number;
    }

    constructor(private bindingEngine: BindingEngine) {

    }

    public bind() {
        if (this.question.questionType === 'devices') {
            this.observsers.push(this.bindingEngine.collectionObserver(this.selectedDevices).subscribe(() => {
                this.value = this.selectedDevices.join(',');

                if (this.isOtherSelected && this.deviceOther.length > 0) {
                    this.value += "," + this.deviceOther;
                }
            }));
        }
        if (this.question.questionType === 'articleparts') {
            this.observsers.push(this.bindingEngine.collectionObserver(this.selectedArticleParts).subscribe(() => {
                this.value = this.selectedArticleParts.join(',');
            }));
        }
    }

    public unbind() {
        let observer;
        while (observer = this.observsers.pop()) {
            observer.dispose();
        }
    }

    private deviceOtherChanged() {
        this.isOtherSelected = this.deviceOther.length > 0;
    }

}