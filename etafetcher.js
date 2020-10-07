/* Magic Mirror
 * Node Helper: MMM-HK-Transport - ETAFetcher
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */
const Log = require("../../js/logger.js");
const got = require('got');

/**
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * @param {string} url URL of the news feed.
 * @param {number} reloadInterval Reload interval in milliseconds.
 * @class
 */
const ETAFetcher = function (url, reloadInterval) {
    const self = this;

    let reloadTimer = null;
    let item = null;

    let fetchFailedCallback = function () { };
    let itemsReceivedCallback = function () { };

    if (reloadInterval < 1000) {
        reloadInterval = 1000;
    }

    /* private methods */

    /**
     * Request the ETA
     */
    const fetchETAs = function () {
        clearTimeout(reloadTimer);
        reloadTimer = null;
        item = [];

        (async () => {
            try {
                const {body} = await got(url, {
                    responseType: 'json'
                });
                item = body;
                self.broadcastItems();
                scheduleTimer();
            } catch (error) {
                console.log(error.response.body);
                fetchFailedCallback(self, error);
                scheduleTimer();
            }
        })();
    };

	/**
	 * Schedule the timer for the next update.
	 */
	const scheduleTimer = function () {
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function () {
			fetchETAs();
		}, reloadInterval);
	};

    /* public methods */

	/**
	 * Update the reload interval, but only if we need to increase the speed.
	 *
	 * @param {number} interval Interval for the update in milliseconds.
	 */
	this.setReloadInterval = function (interval) {
		if (interval > 1000 && interval < reloadInterval) {
			reloadInterval = interval;
		}
	};

	/**
	 * Initiate fetchETAs();
	 */
    this.startFetch = function () {
        fetchETAs();
    };

	/**
	 * Broadcast the existing item.
	 */
    this.broadcastItems = function () {
		if (item.length <= 0) {
			Log.info("ETA-Fetcher: No item to broadcast yet.");
			return;
        }
        Log.info(`ETA-Fetcher: Broadcasting item for stop ID ${item.stops[0].id}`);
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
        return item;
    };
};

module.exports = ETAFetcher;