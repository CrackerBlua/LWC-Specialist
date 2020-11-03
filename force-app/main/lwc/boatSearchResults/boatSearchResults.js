import { LightningElement, wire, api, track } from 'lwc';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import { MessageContext, publish } from 'lightning/messageService';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

const LOADING_EVENT = 'loading';
const DONE_LOADING_EVENT = 'doneloading';

export default class BoatSearchResults extends LightningElement {
    @track 
    boats;

    @track 
    draftValues = [];

    @track 
    isLoading = false;
    
    selectedBoatId;
    boatTypeId = '';
    error;
    columns = [
        { label: 'Name',        fieldName: 'Name',              type: 'text',       editable: 'true'  },
        { label: 'Length',      fieldName: 'Length__c',         type: 'number',     editable: 'true' },
        { label: 'Price',       fieldName: 'Price__c',          type: 'currency',   editable: 'true' },
        { label: 'Description', fieldName: 'Description__c',    type: 'text',       editable: 'true' }
    ];

    // wired message context
    @wire(MessageContext)
    messageContext;

    @wire(getBoats, { boatTypeId: '$boatTypeId' })
    wiredBoats(result) {
        console.log('getBoats sResults', result);
        if (result.data) {
            this.boats = result;
        } else if (result.error) {
            this.error = result.error;
            this.boats = null;
        }

        this.notifyLoading(false);
    }

    // public function that updates the existing boatTypeId property
    // uses notifyLoading
    @api
    searchBoats(boatTypeId) {
        this.boatTypeId = boatTypeId;
        this.notifyLoading(true);
    }

    // this public function must refresh the boats asynchronously
    // uses notifyLoading
    @api
    async refresh() {
        this.notifyLoading(true);
        
        await refreshApex(this.boats).then(response => {
            console.log('Refresh Apex', response);
        }).catch( error => {
            this.showToastEvent('Error Refresh', error.message, 'error');
        }).finally( () => {
            this.notifyLoading(false);
        });
    }

    // this function must update selectedBoatId and call sendMessageService
    updateSelectedTile(event) {
        this.selectedBoatId = event.detail.boatId;
        this.sendMessageService(this.selectedBoatId);
    }

    // Publishes the selected boat Id on the BoatMC.
    sendMessageService(boatId) {
        publish(this.messageContext,
            BOATMC, {
                recordId: boatId,
                recordData: 'Current Boat Location'
            });
    }

    // This method must save the changes in the Boat Editor
    // Show a toast message with the title
    // clear lightning-datatable draft values
    handleSave(event) {
        const recordInputs = event.detail.draftValues.slice().map(draft => {
            const fields = Object.assign({}, draft);
            return { fields };
        });
        const promises = recordInputs.map(recordInput =>updateRecord(recordInput));

        Promise.all(promises)
            .then(() => {
                this.refresh();
                this.showToastEvent('Success', 'Ship It!', 'success');
            })
            .catch(error => {
                this.error = error;
                this.showToastEvent('Error', error.body.message, 'error');
            })
            .finally(() => {
                // clear lightning-datatables draft values
                this.draftValues = [];
            });
    }

    // Check the current value of isLoading before dispatching the doneloading or loading custom event
    notifyLoading(isLoading) {
        const eventName = isLoading ? LOADING_EVENT : DONE_LOADING_EVENT;
        const spinnerEvent = new CustomEvent(eventName);

        this.dispatchEvent(spinnerEvent);
    }

    showToastEvent(title, message, variant) {
        const toastEvent = new ShowToastEvent({
            title : title,
            message : message,
            variant : variant
        });
        this.dispatchEvent(toastEvent);
    }
}
