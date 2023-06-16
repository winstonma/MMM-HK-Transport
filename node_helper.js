/* Magic Mirror
 * Node Helper: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

const ETAFetcher = require("./etafetcher.js");
const NodeHelper = require("node_helper");
const got = require('got');
const Log = require("../../js/logger");
const csv = require('csv-parser')
const fs = require('fs')

let lines = {};

const linesReference = function() {
    Log.log("Start Reference");
    const results = [];
    fs.createReadStream('modules/MMM-IdF-Transport/referentiel-des-lignes-de-transport-en-commun-dile-de-france.csv')
        .pipe(csv({ separator: '\;'}))
        .on('data', (data) => results.push(data))
        .on('end', () => {
            results.forEach(function(item){
                let busImage = "https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets/referentiel-des-lignes-de-transport-en-commun-dile-de-france/files/37b0b83646222f1e3a45084a6eb6a7f7";
                let imgScale = "50%";
                item.lineHtml = item.ShortName_Line;
        
                if (item.Picto) {
                    item.lineHtml = `<div class="container"><img src="${item.Picto}" alt="Snow" style="width:${imgScale};"></div>`;
                } else {
                    if (item.TransportMode.normalize() === 'bus') {
                        item.lineHtml =  `<div class="bus">
                            <img src=${busImage} alt="Snow" style="width:${imgScale}; background-color:white">
                            <sup>${item.ShortName_Line}</sup>
                        </div>`;
                    }
                }

                lines[`STIF\:Line\:\:${item.ID_Line}\:`] = item;
           });
        });
}

module.exports = NodeHelper.create({
    

    // Override start method.
    start: function () {
        Log.log("Starting node helper for: " + this.name);
        linesReference();
        this.fetchers = [];
    },

    // Override socketNotificationReceived received.
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'ADD_STOP') {
            this.getStopInfo(payload.stop, payload.config);
            return;
        }
    },

    /**
     * Obtain the stop id from the URL
     *
     * @param {object} stopInfo The stopInfo.
     * @param {object} config The configuration object.
     */
    getStopInfo: function (stopInfo, config) {
        const baseURL = "https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=";

        const url = baseURL + stopInfo.stopID;
        // TODO remove debug log
        Log.log("Connecting to : " + url);
        // TODO remove debug log
        Log.log(stopInfo);
        (async () => {
            try {
                const {body} = await got(url, {
                    responseType : 'json',
			        headers : {apikey : config.apiKey}
                });
                // TODO remove debug log
                Log.log(body.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit[0].MonitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime)
                this.createFetcher(stopInfo.stopID, stopInfo, config);
            } catch (error) {
                this.sendSocketNotification("FETCH_ERROR", {
                    stopID: stopInfo.stopID,
                    error: error
                });
            }
        })();
    },

    /**
     * Creates a fetcher for a ETA feed if it doesn't exist yet.
     * Otherwise it reuses the existing one.
     *
     * @param {object} stopID The stopID.
     * @param {object} stopInfo The stopInfo.
     * @param {object} config The configuration object.
     */
    createFetcher: function (stopID, stopInfo, config) {
        Log.log("Create Fetcher")
        const url = config.primURL + stopID || "";
        const reloadInterval = stopInfo.reloadInterval || config.reloadInterval || 5 * 60 * 1000;

        try {
			new URL(url);
		} catch (error) {
            this.sendSocketNotification("INCORRECT_URL", url);
            return;
        }

        let fetcher;
        if (this.fetchers[stopInfo.stopID] === undefined) {
            Log.log("Create new PRIM fetcher for url: " + url + " - Interval: " + reloadInterval);
            fetcher = new ETAFetcher(url, stopInfo.stopID, reloadInterval, config.apiKey, lines);

            fetcher.onReceive(() => {
				this.broadcastFeeds();
			});

            fetcher.onError((fetcher, error) => {
                this.sendSocketNotification("FETCH_ERROR", {
                    url: fetcher.url(),
                    error: error
                });
            });

            this.fetchers[stopInfo.stopID] = fetcher;
        } else {
            Log.log("Use existing PRIM fetcher for url: " + url);
            fetcher = this.fetchers[stopInfo.stopID];
            fetcher.setReloadInterval(reloadInterval);
            fetcher.broadcastItems();
        }

        fetcher.startFetch();
    },

	/**
	 * Creates an object with all ETA items of the different registered stopID,
	 * and broadcasts these using sendSocketNotification.
	 */
    broadcastFeeds: function () {
        const feeds = Object.entries(this.fetchers)
            .map(([key, fetcher]) => [key, fetcher.items()])
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        this.sendSocketNotification("STOP_ITEMS", feeds);
    },
});
