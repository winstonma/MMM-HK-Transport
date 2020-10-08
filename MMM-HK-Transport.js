/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

Module.register("MMM-HK-Transport", {

    defaults: {
        stops: [
            {
                stopID: 'HKStop_KowloonCentralPostOffice_N_1'
            }
        ],
        timeFormat: (config.timeFormat !== 24) ? "h:mm" : "HH:mm",
        showLabelRow: true,
        cityMapperURL: 'https://citymapper.com/api/1/departures?headways=1&region_id=hk-hongkong&ids=',
        reloadInterval: 1 * 60 * 1000       // every minute
    },

    // Define required scripts.
    getScripts: function () {
        return ["moment.js"];
    },

    getTranslations: function () {
        return {
            "en": "translations/en.json",
            "zh-hk": "translations/zh.json",
            "zh-tw": "translations/zh.json"
        };
    },

    getStyles: function () {
        return ["MMM-HK-Transport.css", "font-awesome.css"];
    },

    start: function () {
        Log.info("Starting module: " + this.name);

        this.cityMapperData = {};

        this.registerStops();
    },

    /**
     * Registers the stops to be used by the backend.
     */
    registerStops: function () {
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
        this.cityMapperData = Object.entries(etas)
            .filter(([stopID,]) => this.subscribedToETA(stopID))
            .map(([k, v]) => {
                const stop = v.stops[0];

                // Merge sevices and routes into one
                const stopInfo = stop.services.map(service => {
                    return {
                        route: stop.routes.find(element => element.id == service.route_id),
                        service: service
                    }
                }).sort((a, b) => (a.route.id > b.route.id) ? 1 : -1);

                stop.stopInfo = stopInfo;
                delete stop.services;
                delete stop.routes;

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

        if (Object.keys(this.cityMapperData).length === 0) {
            wrapper.appendChild(this.createStopHeader(null));
            let text = document.createElement("div");
            text.innerHTML = this.translate("LOADING");
            text.className = "small dimmed";
            wrapper.appendChild(text);
            return wrapper;
        }

        Object.entries(this.cityMapperData).forEach(([stopID, stop]) => {
            wrapper.appendChild(this.createStopHeader(stop.stops[0]));
            const stopConfig = this.config.stops.find(stop => stop.stopID == stopID);
            wrapper.appendChild(this.createStops(stopConfig, stop.stops[0]));
        });

        return wrapper;
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

    createStopHeader: function (stop) {
        // Auto-create MagicMirror header
        let header = document.createElement("header");
        header.innerHTML = (stop == null) ? this.name : this.getDisplayString(stop.name);
        return header;
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
        let etaArray;

        if (routeObj.service.next_departures) {
            const hoursFromNow = moment.duration(moment(routeObj.service.next_departures[0]).diff(moment()))
                .asHours();
            if (hoursFromNow < 1) {
                etaArray = routeObj.service.next_departures.map(etaStr => moment(etaStr).format(this.config.timeFormat));
            }
        } else if (routeObj.service.headway_seconds_range) {
            const [rangeBottom, rangeTop] = routeObj.service.headway_seconds_range.map(seconds => Math.floor(seconds / 60));
            const midStr = (rangeBottom == rangeTop) ? rangeBottom : `${rangeBottom}—${rangeTop}`;
            etaArray = this.translate("EVERY") + midStr + this.translate("MINUTES");
        } else if (routeObj.service.live_departures_seconds) {
            etaArray = routeObj.service.live_departures_seconds.map(seconds => moment().seconds(seconds).format(this.config.timeFormat));
        }

        if (!etaArray)
            return null;

        let row = document.createElement("tr");

        let line = document.createElement("td");
        line.className = "line";
        line.innerHTML = routeObj.route.name;
        if (routeObj.route.brand === "GMBBus")
            line.innerHTML += '<sup><i class="fas fa-shuttle-van"></i></sup>';
        row.appendChild(line);

        let destination = document.createElement("td");
        destination.className = "destination";
        destination.innerHTML = this.getDisplayString(routeObj.service.headsign);
        row.appendChild(destination);

        let departure = document.createElement("td");
        departure.className = "departure";
        departure.innerHTML = etaArray.toString();
        row.appendChild(departure);

        return row;
    }

});