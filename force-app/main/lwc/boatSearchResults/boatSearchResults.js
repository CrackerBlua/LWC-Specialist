import { LightningElement, wire, api, track } from 'lwc';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import { MessageContext, publish } from 'lightning/messageService';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

const LOADING_EVENT = 'loading';
const DONE_LOADING_EVENT = 'doneloading';

const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT = 'Ship it!';
const SUCCESS_VARIANT = 'success';
const ERROR_TITLE = 'Error';
const ERROR_VARIANT = 'error';

export default class boatSearchResults extends LightningElement {
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
        const updatedFields = event.detail.draftValues;

        updateBoatList({data: updatedFields})
        .then(() => {
            this.refresh();
            const evt = new ShowToastEvent({
                title: SUCCESS_TITLE,
                message: MESSAGE_SHIP_IT,
                variant: SUCCESS_VARIANT
            });
            this.draftValues = [];
            this.dispatchEvent(evt);
            this.refresh();
            
        })
        .catch(error => {
            this.error = error;
            const evt = new ShowToastEvent({
                title: ERROR_TITLE,
                message:  error.body.message,
                variant: ERROR_VARIANT
            });
            this.dispatchEvent(evt);

        })
        .finally(() => {
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