/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 * 
 * v1.0.0
 */

Module.register("MMM-HK-Transport", {

    defaults: {
        stopID: 'HKStop_KowloonCentralPostOffice_N_3_1',
        lines: '',
        direction: '',
        labelRow: true,
        stopName: 'Stop',
        cityMapperURL: 'https://hk-hongkong-api.citymapper.com/2/departures?headways=1&ids=',
        reload: 1 * 60 * 1000       // every minute
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

        this.sendSocketNotification("CONFIG", this.config);
        setInterval(
            function()
            {self.sendSocketNotification("CONFIG", self.config);}
            ,this.config.reload);
    },

		
    socketNotificationReceived: function (notification, payload) {
        if (notification === "KMB" + this.config.stopID) {
            this.kmb_data = payload;
            this.updateDom();			
	    }
	},

    getDom: function () {
					
        // Auto-create MagicMirror header
        var wrapper = document.createElement("div");
        var header = document.createElement("header");
        header.innerHTML = this.config.stopName;
        wrapper.appendChild(header);

        // Loading data notification
        if (!this.kmb_data) {
            var text = document.createElement("div");
            text.innerHTML = this.translate("LOADING");
            text.className = "small dimmed";
            wrapper.appendChild(text);
            return wrapper;
        }

        // Start creating connections table
        var table = document.createElement("table");
        table.classList.add("small", "table");
        table.border='0';

        // Listing selected connections
        var counter = 0;

        // This loop create the table that display the content
        for (var f in this.kmb_data.stops){

            var tram = this.kmb_data.stops[f];

            //if (counter > 0 && this.config.labelRow) {
            if (this.config.labelRow) {
                table.appendChild(this.createLabelRow());
            }
                
            table.appendChild(this.createSpacerRow());

            for (t in tram.services) {
                var routeObj = tram.services[t];
                var result = tram.departures.filter(function( obj ) {
                    return obj.service_id == routeObj.id;
                });
                table.appendChild(this.createDataRow(routeObj, result));
                counter = counter + 1;
            }

        }

        if (counter == 0) {

            if (!this.hidden) {
                table.appendChild(this.createNoTramRow());
                wrapper.appendChild(table);
                this.hide(10000);
            }

        } else {

            if (this.hidden) {
                this.show(5000);
            }

            wrapper.appendChild(table);
        }

        return wrapper;

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
        destination.innerHTML = routeObj.headsign.split(" ")[0];
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
                    var midStr = (rangeBottom == rangeTop)? Math.floor(rangeBottom/60): Math.floor(rangeBottom/60) + "—" + Math.floor(rangeTop/60);
                    etaArray.push(this.translate("EVERY") + midStr + this.translate("MINUTES"));
                }
            }
            departure.innerHTML = etaArray.toString();
            row.appendChild(departure);
        }
        return row;
    }

});