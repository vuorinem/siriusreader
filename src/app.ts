import { UserService } from './user/user-service';
import { WindowTrackingService } from './tracking/window-tracking-service';
import { autoinject, ComponentAttached, computedFrom } from 'aurelia-framework';
import { AuthService } from './auth/auth-service';
import { BookService } from './book/book-service';

@autoinject
export class App implements ComponentAttached {

    private isMenuOpen: boolean = false;
    private isInitialized: boolean = false;

    @computedFrom('authService.isAuthenticated')
    private get isSignedIn(): boolean {
        return this.authService.isAuthenticated;
    }

    @computedFrom('userService.user')
    private get hasUser(): boolean {
        return !!this.userService.user;
    }

    @computedFrom('userService.user.isInformationSheetConfirmed')
    private get isInformationSheetConfirmed(): boolean {
        return !!this.userService.user &&
            this.userService.user.isInformationSheetConfirmed;
    }

    @computedFrom('userService.user.isConsentConfirmed')
    private get isConsentConfirmed(): boolean {
        return !!this.userService.user &&
            this.userService.user.isConsentConfirmed;
    }

    @computedFrom('userService.user.isDebriefConfirmed')
    private get isDebriefConfirmed(): boolean {
        return !!this.userService.user &&
            this.userService.user.isDebriefConfirmed;
    }

    @computedFrom('userService.isDeadlinePassed')
    private get isDeadlinePassed(): boolean {
        return !!this.userService.user &&
            this.userService.isDeadlinePassed;
    }

    @computedFrom('bookService.isBookSelected')
    private get isBookSelected(): boolean {
        return this.bookService.isBookSelected;
    }

    @computedFrom('userService.user.answeredQuestionnaires')
    private get isAcademicQuestionnaireAnswered(): boolean {
        return !!this.userService.user &&
            this.userService.user.answeredQuestionnaires.some(i => i === 'academic-reading');
    }

    @computedFrom('userService.user.answeredQuestionnaires')
    private get isMotivationQuestionnaireAnswered(): boolean {
        return !!this.userService.user &&
            this.userService.user.answeredQuestionnaires.some(i => i === 'motivation');
    }

    @computedFrom('userService.user.answeredQuestionnaires')
    private get isReadingStrategiesQuestionnaireAnswered(): boolean {
        return !!this.userService.user &&
            this.userService.user.answeredQuestionnaires.some(i => i === 'reading-strategies');
    }

    @computedFrom('userService.isReadingSpeedTested')
    private get isReadingSpeedTested(): boolean {
        return this.userService.isReadingSpeedTested;
    }

    @computedFrom('authService.isAuthenticated')
    private get showSignIn(): boolean {
        return !this.isSignedIn;
    }

    @computedFrom('authService.isAuthenticated')
    private get showMenu(): boolean {
        return this.isSignedIn;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed')
    private get showInformationSheet(): boolean {
        return this.hasUser &&
            !this.isInformationSheetConfirmed;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed')
    private get showConsentForm(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            !this.isConsentConfirmed;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed', 'isReadingSpeedTested')
    private get showReadingSpeedTest(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            this.isConsentConfirmed &&
            !this.isReadingSpeedTested;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed',
        'isReadingSpeedTested', 'isBookSelected')
    private get showBookSelection(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            this.isConsentConfirmed &&
            this.isReadingSpeedTested &&
            !this.isBookSelected;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed',
        'isReadingSpeedTested', 'isBookSelected', 'isMotivationQuestionnaireAnswered')
    private get showMotivationQuestionnaire(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            this.isConsentConfirmed &&
            this.isReadingSpeedTested &&
            this.isBookSelected &&
            !this.isMotivationQuestionnaireAnswered;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed',
        'isReadingSpeedTested', 'isBookSelected', 'isMotivationQuestionnaireAnswered',
        'isAcademicQuestionnaireAnswered')
    private get showAcademicQuestionnaire(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            this.isConsentConfirmed &&
            this.isReadingSpeedTested &&
            this.isBookSelected &&
            this.isMotivationQuestionnaireAnswered &&
            !this.isAcademicQuestionnaireAnswered;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed',
        'isReadingSpeedTested', 'isAcademicQuestionnaireAnswered',
        'isMotivationQuestionnaireAnswered', 'isBookSelected')
    private get isStudyStartDone(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            this.isConsentConfirmed &&
            this.isReadingSpeedTested &&
            this.isAcademicQuestionnaireAnswered &&
            this.isMotivationQuestionnaireAnswered &&
            this.isBookSelected;
    }

    @computedFrom('hasUser', 'isReadingStrategiesQuestionnaireAnswered', 'isDebriefConfirmed')
    private get isStudyEndDone(): boolean {
        return this.hasUser &&
            this.isReadingStrategiesQuestionnaireAnswered &&
            this.isDebriefConfirmed ;
    }

    @computedFrom('isStudyStartDone', 'isStudyEndDone', 'isDeadlinePassed')
    private get showBook(): boolean {
        return this.isStudyStartDone &&
            (!this.isDeadlinePassed || this.isStudyEndDone);
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed',
        'isReadingSpeedTested', 'isBookSelected', 'isMotivationQuestionnaireAnswered',
        'isAcademicQuestionnaireAnswered', 'isDeadlinePassed', 'isReadingStrategiesQuestionnaireAnswered')
    private get showFinalQuestionnaire(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            this.isConsentConfirmed &&
            this.isReadingSpeedTested &&
            this.isBookSelected &&
            this.isMotivationQuestionnaireAnswered &&
            this.isAcademicQuestionnaireAnswered &&
            this.isDeadlinePassed &&
            !this.isReadingStrategiesQuestionnaireAnswered;
    }

    @computedFrom('hasUser', 'isInformationSheetConfirmed', 'isConsentConfirmed',
        'isReadingSpeedTested', 'isBookSelected', 'isMotivationQuestionnaireAnswered',
        'isAcademicQuestionnaireAnswered', 'isDeadlinePassed', 'isDebriefConfirmed')
    private get showDebriefSheet(): boolean {
        return this.hasUser &&
            this.isInformationSheetConfirmed &&
            this.isConsentConfirmed &&
            this.isReadingSpeedTested &&
            this.isBookSelected &&
            this.isMotivationQuestionnaireAnswered &&
            this.isAcademicQuestionnaireAnswered &&
            this.isDeadlinePassed &&
            this.isReadingStrategiesQuestionnaireAnswered &&
            !this.isDebriefConfirmed;
    }

    constructor(
        private authService: AuthService,
        private userService: UserService,
        private bookService: BookService,
        private windowTrackingService: WindowTrackingService) {
    }

    public async attached() {
        if (this.authService.isAuthenticated) {
            await this.userService.load();
            await this.bookService.loadSelectedBook();
        }

        this.isInitialized = true;
    }

}