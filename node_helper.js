/* Magic Mirror
 * Node Helper: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

const validUrl = require("valid-url");
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
        const baseURL = "https://citymapper.com/api/3/stopinfo?region_id=hk-hongkong&ids=";

        const url = baseURL + stopInfo.stopID;
        (async () => {
            try {
                const {body} = await got(url, {
                    responseType: 'json'
                });
                this.createFetcher(body.stops[0].id, stopInfo, config);
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
        const url = config.cityMapperURL + stopID || "";
        const reloadInterval = stopInfo.reloadInterval || config.reloadInterval || 5 * 60 * 1000;

        if (!validUrl.isUri(url)) {
            this.sendSocketNotification("INCORRECT_URL", url);
            return;
        }

        let fetcher;
        if (this.fetchers[stopInfo.stopID] === undefined) {
            Log.log("Create new CityMapper fetcher for url: " + url + " - Interval: " + reloadInterval);
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
            Log.log("Use existing CityMapper fetcher for url: " + url);
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