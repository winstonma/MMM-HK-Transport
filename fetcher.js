/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const got = require('got');

/* Fetcher
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * attribute url string - URL of the news feed.
 * attribute reloadInterval number - Reload interval in milliseconds.
 */

var Fetcher = function (url, reloadInterval) {
    var self = this;
    if (reloadInterval < 1000) {
        reloadInterval = 1000;
    }

    var reloadTimer = null;
    var items = null;

    var fetchFailedCallback = function () { };
    var itemsReceivedCallback = function () { };

    /* private methods */

    /* fetchETAs()
     * Request the new items.
     */

    var fetchETAs = function () {
        clearTimeout(reloadTimer);
        reloadTimer = null;
        items = null;

        (async () => {
            try {
                const response = await got(url, {
                    responseType: 'json'
                });
                items = response.body;
                self.broadcastItems();
            } catch (error) {
                console.log(error.response.body);
                fetchFailedCallback(self, error);
                scheduleTimer();
            }
        })();
    };

    /* scheduleTimer()
     * Schedule the timer for the next update.
     */

    var scheduleTimer = function () {
        //console.log('Schedule update timer.');
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(function () {
            fetchETAs();
        }, reloadInterval);
    };

    /* public methods */

    /* setReloadInterval()
     * Update the reload interval, but only if we need to increase the speed.
     *
     * attribute interval number - Interval for the update in milliseconds.
     */
    this.setReloadInterval = function (interval) {
        if (interval > 1000 && interval < reloadInterval) {
            reloadInterval = interval;
        }
    };

    /* startFetch()
     * Initiate fetchETAs();
     */
    this.startFetch = function () {
        fetchETAs();
    };

    /* broadcastItems()
     * Broadcast the existing items.
     */
    this.broadcastItems = function () {
        if (typeof items === "undefined") {
            //console.log('No items to broadcast yet.');
            return;
        }
        //console.log('Broadcasting ' + items.length + ' items.');
        itemsReceivedCallback(self);
    };

    this.onReceive = function (callback) {
        itemsReceivedCallback = callback;
    };

    this.onError = function (callback) {
        fetchFailedCallback = callback;
    };

    this.url = function () {
        return url;
    };

    this.items = function () {
        return items;
    };
};

module.exports = Fetcher;