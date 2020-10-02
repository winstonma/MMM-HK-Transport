/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const validUrl = require("valid-url");
const Fetcher = require("./fetcher.js");
const NodeHelper = require("node_helper");
const got = require('got');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node helper for: " + this.name);
        this.fetchers = [];
    },

    socketNotificationReceived: function (notification, payload) {
        // Request for information
        if (notification === 'ADD_STOP') {
            this.getStopInfo(payload.stop, payload.config);
            return;
        }
    },

    /* getStopInfo(stopInfo, config)
     * Obtain the stop id from the URL
     *
     * attribute stopInfo object - A stopInfo object.
     * attribute config object - A configuration object containing reload interval in milliseconds.
     */
    getStopInfo: function (stopInfo, config) {
        const self = this;
        const baseURL = "https://citymapper.com/api/3/stopinfo?region_id=hk-hongkong&ids=";

        const url = baseURL + stopInfo.stopID;
        (async () => {
            try {
                const response = await got(url, {
                    responseType: 'json'
                });
                this.createFetcher(response.body.stops[0].id, config);
            } catch (error) {
                console.log(error.response.body);
            }
        })();
    },

    /* createFetcher(feed, config)
     * Creates a fetcher for a new feed if it doesn't exist yet.
     * Otherwise it reuses the existing one.
     *
     * attribute feed object - A feed object.
     * attribute config object - A configuration object containing reload interval in milliseconds.
     */
    createFetcher: function (stopID, config) {
        var self = this;

        var url = config.cityMapperURL + stopID;
        var url = url || "";
        var reloadInterval = config.reloadInterval || 5 * 60 * 1000;

        if (!validUrl.isUri(url)) {
            console.log("invalid url");
            self.sendSocketNotification("INCORRECT_URL", url);
            return;
        }

        var fetcher;
        if (typeof self.fetchers[stopID] === "undefined") {
            console.log("Create new CityMapper fetcher for url: " + url + " - Interval: " + reloadInterval);
            fetcher = new Fetcher(url, reloadInterval);

            fetcher.onReceive(function (fetcher) {
                self.broadcastFeeds();
            });

            fetcher.onError(function (fetcher, error) {
                self.sendSocketNotification("FETCH_ERROR", {
                    url: fetcher.url(),
                    error: error
                });
            });

            self.fetchers[stopID] = fetcher;
        } else {
            console.log("Use existing CityMapper fetcher for url: " + url);
            fetcher = self.fetchers[stopID];
            fetcher.setReloadInterval(reloadInterval);
            fetcher.broadcastItems();
        }

        fetcher.startFetch();
    },

    /* broadcastFeeds()
     * Creates an object with all feed items of the different registered feeds,
     * and broadcasts these using sendSocketNotification.
     */
    broadcastFeeds: function () {
        const self = this;

        const feeds = Object.entries(self.fetchers)
            .map(([key, fetcher]) => [key, fetcher.items()])
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        this.sendSocketNotification("STOP_ITEMS", feeds);
    },
});