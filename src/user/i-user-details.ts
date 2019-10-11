export interface IUserDetails {
    deadline: string,
    isInformationSheetConfirmed: boolean;
    isConsentConfirmed: boolean;
    isDebriefConfirmed: boolean;
    readingSpeedWordsPerMinute: number;
    answeredQuestionnaires: string[];
}