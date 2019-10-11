import { bindable, autoinject, ComponentAttached } from 'aurelia-framework';

import { BookService } from './../book/book-service';
import { ITopicDetails } from './i-topic-details';
import { CourseService } from './course-service';
import { ICourseDetails } from './i-course-details';

@autoinject
export class NrBookSelection implements ComponentAttached {
    private courses?: ICourseDetails[];
    private selectedCourse?: ICourseDetails;

    private isLoading: boolean = false;

    constructor(
        private courseService: CourseService,
        private bookService: BookService) {
    }

    public async attached() {
        this.courses = undefined;
        this.selectedCourse = undefined;
    }

    private async selectYear(year?: number) {
        if (!year) {
            this.courses = undefined;
            this.selectedCourse = undefined;
            return;
        }

        try {
            this.isLoading = true;
            this.courses = await this.courseService.getCourses(year);
        } finally {
            this.isLoading = false;
        }
    }

    private async selectCourse(course?: ICourseDetails) {
        if (course && course.topics.length === 1) {
            await this.selectTopic(course.topics[0]);
        }

        this.selectedCourse = course;
    }

    private async selectTopic(topic: ITopicDetails) {
        try {
            this.isLoading = true;
            await this.bookService.selectBook(topic.bookId);
        } finally {
            this.isLoading = false;
        }
    }
}