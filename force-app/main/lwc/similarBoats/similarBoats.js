import { NavigationMixin } from 'lightning/navigation';
import {
    LightningElement,
    api,
    wire
} from 'lwc';
import getSimilarBoats from '@salesforce/apex/BoatDataService.getSimilarBoats';

export default class SimilarBoats extends NavigationMixin(LightningElement) {
    currentBoat;
    relatedBoats;
    boatId;
    error;

    @api
    get recordId() {
        return this.boatId;
    }
    set recordId(value) {
        this.setAttribute('boatId', value);
        this.boatId = value;
    }

    @api similarBy = '';

    // Wire custom Apex call, using the import named getSimilarBoats
    // Populates the relatedBoats list
    @wire(getSimilarBoats, {
        boatId: '$boatId',
        similarBy: '$similarBy'
    })
    similarBoats({
        error,
        data
    }) {
        if (data && data != undefined) {
            this.relatedBoats = data;
        } else if (error && error != undefined) {
            this.error = error.body.message;
        }
    }

    @api
    get getTitle() {
        return 'Similar boats by ' + this.similarBy;
    }

    @api
    get noBoats() {
        return !(this.relatedBoats && this.relatedBoats != undefined && this.relatedBoats.length > 0);
    }

    // Navigate to record page
    openBoatDetailPage(event) {
        console.log(event.detail.boatId);
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: event.detail.boatId,
                objectApiName: 'Boat__c',
                actionName: 'view',
            },
        });
    }
}