/* Magic Mirror
 * Module: KMB
 *
 * By yo-less
 * MIT Licensed.
 */

const request = require('request');
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting node helper for: " + this.name);
    },
	
    socketNotificationReceived: function(notification, payload) {
        // Request for information
        if(notification === 'CONFIG'){
            this.config = payload;
            //url = this.config.busStopBase + this.config.stopID + '.json';
            url = this.config.cityMapperURL + this.config.stopID;
			this.getData(url, this.config.stopID);
        }
    },

    getData: function(options, stopID) {
		request(options, (error, response, body) => {
	        if (response.statusCode === 200) {
				this.sendSocketNotification("KMB" + stopID, JSON.parse(body));
				} else {
                console.log("Error getting tram connections " + response.statusCode);
            }
        });
    }
});