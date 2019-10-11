import { HttpClient } from 'aurelia-fetch-client';
import { bindable, ComponentAttached, autoinject } from 'aurelia-framework';
import { IQuestionnaireDetails } from './i-questionnaire-details';
import { QuestionnaireService } from './questionnaire-service';
import { QuestionAndAnswer } from './question-and-answer';

@autoinject
export class NrQuestionnaire implements ComponentAttached {

    @bindable private name!: string;

    private questionnaire!: IQuestionnaireDetails;
    private questionsAndAndswers: QuestionAndAnswer[] = [];

    constructor(
        private http: HttpClient,
        private questionnaireService: QuestionnaireService) {
    }

    public async attached() {
        this.questionnaire = await this.questionnaireService.getQuestionnaire(this.name);

        this.questionsAndAndswers = this.questionnaire.questions
            .map(question => new QuestionAndAnswer(question, { questionNumber: question.number }));
    }

    private async submit() {
        await this.questionnaireService.sendAnswers(this.name,
            this.questionsAndAndswers.map(i => i.answer));
    }

}