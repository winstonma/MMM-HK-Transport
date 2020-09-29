/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

Module.register("MMM-HK-Transport", {

    defaults: {
        stops: [
            {
                stopID: 'HKStop_KowloonCentralPostOffice_N_1'
            }
        ],
        stopName: 'MMM-HK-Transport',
        lines: '',
        direction: '',
        labelRow: true,
        cityMapperURL: 'https://citymapper.com/api/1/departures?headways=1&region_id=hk-hongkong&ids=',
        reloadInterval: 1 * 60 * 1000       // every minute
    },

    getTranslations: function () {
        return {
            "en": "translations/en.json",
            "zh-tw": "translations/zh.json"
        };
    },

    getStyles: function () {
        return ["MMM-HK-Transport.css"];
    },

    start: function () {
        var self = this;
        Log.info("Starting module: " + this.name);

        this.cityMapperData = {};

        this.registerStops();
    },

    /* registerStops()
     * registers the stops to be used by the backend.
     */
    registerStops: function () {
        for (var f in this.config.stops) {
            var stop = this.config.stops[f];
            this.sendSocketNotification("ADD_STOP", {
                stop: stop,
                config: this.config
            });
        }
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "STOP_ITEMS") {
            this.cityMapperData = payload;
            this.updateDom();
        }
    },

    getDom: function () {
        var wrapper = document.createElement("div");

        if (Object.keys(this.cityMapperData).length === 0) {
            wrapper.appendChild(this.createStopHeader(null));
            var text = document.createElement("div");
            text.innerHTML = this.translate("LOADING");
            text.className = "small dimmed";
            wrapper.appendChild(text);
            return wrapper;
        }

        Object.values(this.cityMapperData).forEach(stop => {
            wrapper.appendChild(this.createStopHeader(stop.stops[0]));
            wrapper.appendChild(this.createStops(stop.stops[0]));
        });

        return wrapper;
    },

    createStopHeader: function (stop) {
        // Auto-create MagicMirror header
        var header = document.createElement("header");
        if (stop == null) {
            header.innerHTML = this.config.stopName;
        } else {
            header.innerHTML = stop.name;
        }

        return header;
    },

    createStops: function (stop) {
        // Start creating connections table
        var table = document.createElement("table");
        table.classList.add("small", "table");
        table.border = '0';

        if (this.config.labelRow) {
            table.appendChild(this.createLabelRow());
        }

        table.appendChild(this.createSpacerRow());

        const stopInfo = stop.routes.map(route => {
            const service = stop.services.find(element => element.route_id == route.id);
            return {
                route: route,
                service: service
            }
        });

        // This loop create the table that display the content
        stopInfo.forEach(element => {
            const rowContent = this.createDataRow(element);
            if (rowContent)
                table.appendChild(rowContent);
        });

        return table;

    },

    createLabelRow: function () {
        var labelRow = document.createElement("tr");

        var lineLabel = document.createElement("th");
        lineLabel.className = "line";
        lineLabel.innerHTML = this.translate("LINE");
        labelRow.appendChild(lineLabel);

        var destinationLabel = document.createElement("th");
        destinationLabel.className = "destination";
        destinationLabel.innerHTML = this.translate("DESTINATION");
        labelRow.appendChild(destinationLabel);

        var departureLabel = document.createElement("th");
        departureLabel.className = "departure";
        departureLabel.innerHTML = this.translate("DEPARTURE");
        labelRow.appendChild(departureLabel);

        return labelRow;
    },

    createSpacerRow: function () {
        var spacerRow = document.createElement("tr");

        var spacerHeader = document.createElement("th");
        spacerHeader.className = "spacerRow";
        spacerHeader.setAttribute("colSpan", "3");
        spacerHeader.innerHTML = "";
        spacerRow.appendChild(spacerHeader);

        return spacerRow;
    },


    createNoTramRow: function () {
        var noTramRow = document.createElement("tr");

        var noTramHeader = document.createElement("th");
        noTramHeader.className = "noTramRow";
        noTramHeader.setAttribute("colSpan", "3");
        noTramHeader.innerHTML = this.translate("NO-TRAMS");
        noTramRow.appendChild(noTramHeader);

        return noTramRow;
    },

    createDataRow: function (routeObj) {
        if ("next_departures" in routeObj.service && "headway_seconds_range" in routeObj.service && "live_departures_seconds" in routeObj.service)
            return null;

        var row = document.createElement("tr");

        var line = document.createElement("td");
        line.className = "line";
        line.innerHTML = routeObj.route.name;
        row.appendChild(line);

        var destination = document.createElement("td");
        destination.className = "destination";
        const REGEX_CHINESE = /[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u3300-\u33ff]|[\ufe30-\ufe4f]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]/u;
        const splitStr = routeObj.service.headsign.split(' ')
        const chiWords = splitStr.filter((string) => REGEX_CHINESE.test(string))
        const engWords = splitStr.filter((string) => !REGEX_CHINESE.test(string))

        if (chiWords.length > 0) {
            destination.innerHTML = chiWords.join(' ');
        } else {
            destination.innerHTML = engWords.join(' ');
        }
        row.appendChild(destination);

        var departure = document.createElement("td");
        departure.className = "departure";
        let etaArray;

        if (routeObj.service.next_departures) {
            etaArray = routeObj.service.next_departures.map(etaStr => moment(etaStr).format('h:mm'));
        } else if (routeObj.service.headway_seconds_range) {
            const [rangeBottom, rangeTop] = routeObj.service.headway_seconds_range;
            const midStr = (rangeBottom == rangeTop) ? Math.floor(rangeBottom / 60) : Math.floor(rangeBottom / 60) + "—" + Math.floor(rangeTop / 60);
            etaArray = this.translate("EVERY") + midStr + this.translate("MINUTES");
        } else if (routeObj.service.live_departures_seconds) {
            etaArray = routeObj.service.live_departures_seconds.map(seconds => moment().add(seconds, 'seconds').format('h:mm'));
        }
        departure.innerHTML = etaArray.toString();
        row.appendChild(departure);

        return row;
    }

});