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

module.exports = NodeHelper.create({
    // Override start method.
    start: function () {
        Log.log("Starting node helper for: " + this.name);
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
			        headers : {apikey : 'slsveMui7bnEciEv4lDi49yefA76UXE1'}
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
            fetcher = new ETAFetcher(url, stopInfo.stopID, reloadInterval);

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
