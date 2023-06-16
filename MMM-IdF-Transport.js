/* Magic Mirror
 * Module: MMM-IdF-Transport
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

Module.register("MMM-IdF-Transport", {

    defaults: {
        stops: [
            {
                stopID: 'STIF:StopPoint:Q:473921:'
            }
        ],
        timeFormat: (config.timeFormat !== 24) ? "h:mm" : "HH:mm",
        showLabelRow: true,
        primURL: 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=',
        reloadInterval: 1 * 60 * 1000       // every minute
    },

    // Define required scripts.
    getScripts: function () {
        return ["moment.js"];
    },

    getTranslations: function () {
        return {
            "fr": "translations/fr.json",
            "en": "translations/en.json",
            "zh-hk": "translations/zh.json",
            "zh-tw": "translations/zh.json"
        };
    },

    getStyles: function () {
        return ["MMM-IdF-Transport.css", "font-awesome.css"];
    },

    start: function () {
        Log.info("Starting module: " + this.name);

        this.primData = {};

        this.registerStops();
    },

    /**
     * Registers the stops to be used by the backend.
     */
    registerStops: function () {
        // TODO remove debug log
        Log.log("Config is \:\n" + config);
        this.config.stops.forEach(stop => {
            this.sendSocketNotification("ADD_STOP", {
                stop: stop,
                config: this.config
            });
        });
    },

    /**
    * Generate an ordered list of items for this configured module.
    *
    * @param {object} etas An object with ETAs returned by the node helper.
    */
    generateETA: function (etas) {
        this.primData = Object.entries(etas)
            .filter(([stopID, value]) => this.subscribedToETA(stopID) && value.Siri)
            .map(([k, v]) => {
                    const stop = v;
                    // Merge sevices and routes into one
                    const stopInfo = stop.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit.map(service => {
                        return {
                            route: service.MonitoredVehicleJourney.LineRef,
                            service: service.MonitoredVehicleJourney.MonitoredCall
                        }
                    }).sort((a, b) => (a.route > b.route) ? 1 : -1);

                    stop.stopID = stop.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit[0].MonitoringRef.value;
                    stop.stopInfo = stopInfo;
                    delete stop.Siri;

                    return [k, v];
            })
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
},

    /**
     * Check if this module is configured to show this ETA.
     *
     * @param {string} stopID stopID to check.
     * @returns {boolean} True if it is subscribed, false otherwise
     */
    subscribedToETA: function (stopID) {
        return this.config.stops.some(stop => stop.stopID === stopID);
    },

    // Override socket notification handler.
    socketNotificationReceived: function (notification, payload) {
        if (notification === "STOP_ITEMS") {
            this.generateETA(payload);
            this.updateDom();
        }
    },

    // Override dom generator.
    getDom: function () {
        const wrapper = document.createElement("div");

        if (Object.keys(this.primData).length === 0) {
            let text = document.createElement("div");
            text.innerHTML = this.translate("LOADING");
            text.className = "small dimmed";
            wrapper.appendChild(text);
            return wrapper;
        }

        Object.entries(this.primData).forEach(([stopID, stop]) => {
            const stopConfig = this.config.stops.find(stop => stop.stopID == stopID);
            wrapper.appendChild(this.createStops(stopConfig, stop));
        });

        return wrapper;
    },

    // Override getHeader method.
	getHeader: function () {
        return (Object.keys(this.primData).length === 0) ? this.name : this.getDisplayString(Object.entries(this.primData)[0][1].stopInfo[0].service.StopPointName[0].value);
	},

    getDisplayString: function (input) {
        const langTable = {
            'zh-tw': 'zh',
            'zh-hk': 'zh',
            'zh-cn': 'zh'
        }

        const REGEX_CHINESE = /[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u3300-\u33ff]|[\ufe30-\ufe4f]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]/u;
        const splitStr = input.split(' ');
        const chiWords = splitStr.filter((string) => REGEX_CHINESE.test(string));
        const engWords = splitStr.filter((string) => !REGEX_CHINESE.test(string)).join(' ');

        if (langTable[config.language] && chiWords.length)
            return chiWords;
        return engWords;
    },

    createStops: function (stopConfig, stop) {
        // Start creating connections table
        let table = document.createElement("table");
        table.classList.add("small", "table");
        table.border = '0';

        const showLabelRow = (typeof stopConfig.showLabelRow !== 'undefined') ? stopConfig.showLabelRow : this.config.showLabelRow;

        if (showLabelRow) {
            table.appendChild(this.createLabelRow());
        }

        table.appendChild(this.createSpacerRow());

        // This loop create the table that display the content
        stop.stopInfo.forEach(element => {
            const rowContent = this.createDataRow(element);
            if (rowContent)
                table.appendChild(rowContent);
        });

        return table;

    },

    createLabelRow: function () {
        let labelRow = document.createElement("tr");

        let lineLabel = document.createElement("th");
        lineLabel.className = "line";
        lineLabel.innerHTML = this.translate("LINE");
        labelRow.appendChild(lineLabel);

        let destinationLabel = document.createElement("th");
        destinationLabel.className = "destination";
        destinationLabel.innerHTML = this.translate("DESTINATION");
        labelRow.appendChild(destinationLabel);

        let departureLabel = document.createElement("th");
        departureLabel.className = "departure";
        departureLabel.innerHTML = this.translate("DEPARTURE");
        labelRow.appendChild(departureLabel);

        return labelRow;
    },

    createSpacerRow: function () {
        let spacerRow = document.createElement("tr");

        let spacerHeader = document.createElement("th");
        spacerHeader.className = "spacerRow";
        spacerHeader.setAttribute("colSpan", "3");
        spacerHeader.innerHTML = "";
        spacerRow.appendChild(spacerHeader);

        return spacerRow;
    },

    createNoTramRow: function () {
        let noTramRow = document.createElement("tr");

        let noTramHeader = document.createElement("th");
        noTramHeader.className = "noTramRow";
        noTramHeader.setAttribute("colSpan", "3");
        noTramHeader.innerHTML = this.translate("NO-TRAMS");
        noTramRow.appendChild(noTramHeader);

        return noTramRow;
    },

    createDataRow: function (routeObj) {
        if (!routeObj.service.ExpectedDepartureTime)
            return null;
        let etaArray = new Date(routeObj.service.ExpectedDepartureTime);
        const options = {
            hour: "2-digit",
            minute: "2-digit"
          };
          const timetable = new Intl.DateTimeFormat("fr", options).format;
        // etaArray = etaArray.match(/(\d{2}:){2}\d{2}/)[0]

        /*if (routeObj.service.ExpectedDepartureTime) {
            etaArray = routeObj.service.ExpectedDepartureTime
                .filter(data => moment.duration(moment(data).diff(moment())).asHours() < 1)
                .map(etaStr => moment(etaStr).format(this.config.timeFormat));
        } else if (routeObj.service.headway_seconds_range) {
            const [rangeBottom, rangeTop] = routeObj.service.headway_seconds_range.map(seconds => Math.floor(seconds / 60));
            const midStr = (rangeBottom == rangeTop) ? rangeBottom : `${rangeBottom}—${rangeTop}`;
            etaArray = this.translate("EVERY") + midStr + this.translate("MINUTES");
        } else if (routeObj.service.live_departures_seconds) {
            etaArray = routeObj.service.live_departures_seconds.map(seconds => moment().seconds(seconds).format(this.config.timeFormat));
        }*/

        if (etaArray.length == 0)
            return null;

        let row = document.createElement("tr");

        let line = document.createElement("td");
        
        line.className = "line";

        line.innerHTML = routeObj.route.ID_Line
        if (line.innerHTML)
            line.innerHTML = routeObj.route.lineHtml;
        /*if (routeObj.route.brand === "GMBBus")
            line.innerHTML += '<sup><i class="fas fa-shuttle-van"></i></sup>';*/
        row.appendChild(line);

        let destination = document.createElement("td");
        destination.className = "destination";
        destination.innerHTML = this.getDisplayString(routeObj.service.DestinationDisplay[0].value);
        row.appendChild(destination);

        let departure = document.createElement("td");
        departure.className = "departure";
        departure.innerHTML = timetable(etaArray);
        row.appendChild(departure);

        return row;
    }

});
