import { autoinject, TaskQueue } from 'aurelia-framework';
import { TrackingService } from './tracking-service';

@autoinject
export class WindowTrackingService {

    public isFocused: boolean = true;

    private onFocus: () => void = () => this.handleFocus(true);
    private onBlur: () => void = () => this.handleFocus(false);
    private onBeforeUnload: () => void = async () => await this.triggerEvent('close');
    
    constructor(
        private taskQueue: TaskQueue,
        private trackingService: TrackingService) {
        this.attach();
    }

    public attach() {
        window.addEventListener('focus', this.onFocus, false);
        window.addEventListener('blur', this.onBlur, false);
        window.addEventListener('beforeunload', this.onBeforeUnload, false);
    }

    public detach() {
        window.removeEventListener('focus', this.onFocus, false);
        window.removeEventListener('blur', this.onBlur, false);
        window.removeEventListener('beforeunload', this.onBeforeUnload, false);
    }

    private handleFocus(isFocused: boolean) {
        this.triggerEvent(isFocused ? 'focus' : 'blur');

        // Set isFocused only after handling task queue so that initial click handlers
        // see the non-focused state
        this.taskQueue.queueTask(() => {
            this.isFocused = isFocused;
        });
    }

    private triggerEvent(type: string) {
        this.trackingService.event(type);
    }

}