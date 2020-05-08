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
                stopID: 'HKStop_KowloonCentralPostOffice_N_3_1',        // Which stop would you like to have displayed?
                stopName: 'Kownloon Post Office'
            }
        ],
        stopName: 'MMM-HK-Transport',
        lines: '',
        direction: '',
        labelRow: true,
        cityMapperURL: 'https://hk-hongkong-api.citymapper.com/2/departures?headways=1&ids=',
        reloadInterval: 1 * 60 * 1000       // every minute
    },

    getTranslations: function () {
        return {
            en: "translations/en.json",
            zh: "translations/zh.json"
        };
    },

    getStyles: function () {
        return ["MMM-HK-Transport.css"];
    },

    start: function () {
        var self = this;
        Log.info("Starting module: " + this.name);

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

        if (!this.cityMapperData) {
            wrapper.appendChild(this.createStopHeader(null));
            var text = document.createElement("div");
            text.innerHTML = this.translate("LOADING");
            text.className = "small dimmed";
            wrapper.appendChild(text);
            return wrapper;
        }

        for (c in this.cityMapperData) {
            stop = this.cityMapperData[c];
            if (stop === null) {
                continue;
            }
            wrapper.appendChild(this.createStopHeader(stop));
            wrapper.appendChild(this.createStops(stop));
        }
        return wrapper;
    },

    createStopHeader: function (stop) {
        // Auto-create MagicMirror header
        var header = document.createElement("header");
        if (stop == null) {
            header.innerHTML = this.config.stopName;
        } else {
            var targetStop = this.config.stops.find(function findStop(configStop) {
                return (configStop.stopID == stop.stops[0].id)
            });
            header.innerHTML = targetStop.stopName;
        }

        return header;
    },

    createStops: function (stop) {
        // Start creating connections table
        var table = document.createElement("table");
        table.classList.add("small", "table");
        table.border = '0';

        // Listing selected connections
        var counter = 0;

        // This loop create the table that display the content
        for (var f in stop.stops) {

            var tram = stop.stops[f];

            //if (counter > 0 && this.config.labelRow) {
            if (this.config.labelRow) {
                table.appendChild(this.createLabelRow());
            }

            table.appendChild(this.createSpacerRow());

            for (t in tram.services) {
                var routeObj = tram.services[t];
                var result = tram.departures.filter(function (obj) {
                    return obj.service_id == routeObj.id;
                });
                const rowContent = this.createDataRow(routeObj, result);
                if (rowContent) {
                    table.appendChild(rowContent);
                    counter = counter + 1;
                }
            }
        }

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

    createDataRow: function (routeObj, result) {
        var row = document.createElement("tr");

        var line = document.createElement("td");
        line.className = "line";
        line.innerHTML = routeObj.display_name;
        row.appendChild(line);

        var destination = document.createElement("td");
        destination.className = "destination";
        const REGEX_CHINESE = /[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u3300-\u33ff]|[\ufe30-\ufe4f]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]/u;
        const hasChinese = REGEX_CHINESE.test(routeObj.headsign);
        if (hasChinese) {
            destination.innerHTML = routeObj.headsign.split(" ")[0];
        } else {
            destination.innerHTML = routeObj.headsign;
        }
        row.appendChild(destination);

        if (result.length > 0) {
            var departure = document.createElement("td");
            departure.className = "departure";
            etaArray = [];
            for (r in result) {
                var etaObj = result[r];
                if (etaObj.wait_time_seconds) {
                    etaArray.push(moment().add(etaObj.wait_time_seconds, 'seconds').format('h:mm'));
                } else if (etaObj.wait_scheduled_time) {
                    timeObj = moment(etaObj.wait_scheduled_time);
                    if (timeObj.diff(moment(), 'hour') < 1) {
                        etaArray.push(timeObj.format('h:mm'));
                    }
                } else if (etaObj.wait_headway_seconds_range) {
                    var [rangeBottom, rangeTop] = etaObj.wait_headway_seconds_range;
                    var midStr = (rangeBottom == rangeTop) ? Math.floor(rangeBottom / 60) : Math.floor(rangeBottom / 60) + "—" + Math.floor(rangeTop / 60);
                    etaArray.push(this.translate("EVERY") + midStr + this.translate("MINUTES"));
                }
            }
            if (etaArray.length == 0) {
                return null;
            }
            departure.innerHTML = etaArray.toString();
            row.appendChild(departure);
        }
        return row;
    }

});