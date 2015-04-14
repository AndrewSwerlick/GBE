var dispatcher = require('../dispatcher/BudgetAppDispatcher');
var EventEmitter = require('events').EventEmitter;

var assign = require('object-assign');

var BudgetAppConstants = require('../constants/BudgetAppConstants');
var ActionTypes = BudgetAppConstants.ActionTypes;

var DataFormConstants = require('../constants/DataFormConstants');
var DataForms = DataFormConstants.DataForms;

var DatasetStatusConstants = require('../constants/DatasetStatusConstants');
var DatasetStatus = DatasetStatusConstants.DatasetStatus;

var DataSet = require('../data/DataSet');

var DS_CHANGE_EVENT = 'ds_change';
var _cards = {};



var MainDatasetStore = assign({}, EventEmitter.prototype, {

    idCounter: 0,

    versionCounter: 1, // Let's components optimize whether they need to redraw

    dataObjects: [],

    registerDataset: function (datasetId) {
        var ds = new DataSet(this.versionCounter++, datasetId);
        this.dataObjects[this.idCounter] = ds;
        return this.idCounter++;
    },

    getDatasetIfUpdated: function (id, version, dataform=null)
    {
        if (dataform == null || dataform == Dataforms.RAW) {
            return this.getDataIfUpdated(id, version);
        }
        else {

        }
        return null;
    },

    dataHasUpdated: function (id, version) {
        if (id >= 0 && id < this.dataObjects.length) {
            return (this.dataObjects[id].version > version);
        }
        return false;
    },

    receiveData: function (r) {
        for (var i=0; i<r.data.length; ++i) {
            dispatcher.dispatch({
                actionType: ActionTypes.DATASET_RECEIVED,
                payload: r.data[i]
            });
        }
    },

    receiveError: function(r) {
        console.log("ERROR - failed to get the data: " + JSON.stringify(r));
    },

    getData: function (id) {
        var data = null;
        if (id >= 0 && id < this.dataObjects.length) {
            var object = this.dataObjects[id];
            if (object.isReady()) {
                data = object.data;
            }
            else if (! object.isRequested()) {
                var source =GBEVars.apiPath + "/datasets/" + object.datasetId;
                $.get( source, function( r ) {
                }).done(this.receiveData).fail(this.receiveError);

                object.setRequested();
            }
        }
        return data;
    },

    getDataIfUpdated: function (id, version) {
        if (this.dataHasUpdated(id,version)) {
            return this.getData(id);
        }
        console.log(" ... and return");
        return null;
    },

    emitChange: function() {
        this.emit(DS_CHANGE_EVENT);
    },
    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(DS_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(DS_CHANGE_EVENT, callback);
    }
});

MainDatasetStore.dispatchToken = dispatcher.register(function (action) {
    switch (action.actionType)
    {
        case ActionTypes.DATASET_RECEIVED:
            var dsId = action.payload.id;
            console.log("DATASET_RECEIVED - ID = " + dsId);
            for (var j=0; j<MainDatasetStore.dataObjects.length; ++j) {
                if (MainDatasetStore.dataObjects[j].datasetId == dsId) {
                    MainDatasetStore.dataObjects[j].data = action.payload;
                    MainDatasetStore.dataObjects[j].version = MainDatasetStore.versionCounter++;
                    MainDatasetStore.dataObjects[j].setReady();
                }
            }
            MainDatasetStore.emitChange()
            break;

        default:
            // Nothing
            break;
    }
});

module.exports = MainDatasetStore;
