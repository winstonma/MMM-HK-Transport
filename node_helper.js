/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By yo-less
 * MIT Licensed.
 */

var validUrl = require("valid-url");
var Fetcher = require("./fetcher.js");
var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.fetchers = [];
    },
	
    socketNotificationReceived: function(notification, payload) {
        // Request for information
        if(notification === 'ADD_STOP'){
            this.createFetcher(payload.stop, payload.config);
            return;
        }
    },

    /* createFetcher(feed, config)
     * Creates a fetcher for a new feed if it doesn't exist yet.
     * Otherwise it reuses the existing one.
     *
     * attribute feed object - A feed object.
     * attribute config object - A configuration object containing reload interval in milliseconds.
     */
    createFetcher: function(stopInfo, config) {
        var self = this;

        var url = config.cityMapperURL + stopInfo.stopID;
        var url = url || "";
        var reloadInterval = config.reloadInterval || 5 * 60 * 1000;

        if (!validUrl.isUri(url)) {
            console.log("invalid url");
            self.sendSocketNotification("INCORRECT_URL", url);
            return;
        }

        var fetcher;
        if (typeof self.fetchers[stopInfo.stopID] === "undefined") {
            console.log("Create new CityMapper fetcher for url: " + url + " - Interval: " + reloadInterval);
            fetcher = new Fetcher(url, reloadInterval);

            fetcher.onReceive(function(fetcher) {
                self.broadcastFeeds();
            });

            fetcher.onError(function(fetcher, error) {
                self.sendSocketNotification("FETCH_ERROR", {
                    url: fetcher.url(),
                    error: error
                });
            });

            self.fetchers[stopInfo.stopID] = fetcher;
        } else {
            console.log("Use existing CityMapper fetcher for url: " + url);
            fetcher = self.fetchers[stopInfo.stopID];
            fetcher.setReloadInterval(reloadInterval);
            fetcher.broadcastItems();
        }

        fetcher.startFetch();
    },

    /* broadcastFeeds()
     * Creates an object with all feed items of the different registered feeds,
     * and broadcasts these using sendSocketNotification.
     */
    broadcastFeeds: function() {
        var feeds = {};
        for (var f in this.fetchers) {
            feeds[f] = this.fetchers[f].items();
        }
        this.sendSocketNotification("STOP_ITEMS", feeds);
    },
});