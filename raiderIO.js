/* Magic Mirror
 * Module: RaiderIO
 * By Jonathan Newton
 */
Module.register("raiderIO", {
    // Default module config.
    defaults: {
        data: {},

        region: "eu",
        realm: "stormscale",
        name: "icecrispies",
        apiBase: "https://raider.io/api/v1/characters/profile",
        iconUni: {
            "U+02197": "better",
            "U+02198": "worse"
        },

        updateInterval: 10 * 60 * 1000, // every 10 minutes
        retryDelay: 2500,
        initialLoadDelay: 2500,
        animationSpeed: 1000
    },

    getStyles: function () {
        return ["raiderIO.css"];
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.scheduleUpdate(this.config.initialLoadDelay);
        this.updateTimer = null;
    },

    normalizeTitle: function (title) {
        return title.replace(/(^|[\s-])\S/g, function (match) {
            return match.toUpperCase();
        }).replace(/-/g, ' ');
    },

    getDom: function () {
        var wrapper = document.createElement("ul");
        wrapper.className = "mmm-rio-wrapper";

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var listItemNode = document.createElement("li");
        listItemNode.className = "mmm-rio-wrapper-inner";

        wrapper.appendChild(listItemNode);

        var rioImg = document.createElement("img");
        rioImg.className = "mmm-rio-wrapper-img";
        rioImg.src = this.data.thumbnail_url;

        listItemNode.appendChild(rioImg);

        var textWrapperNode = document.createElement("div");
        textWrapperNode.className = "mmm-rio-wrapper-text-wrapper";
        listItemNode.appendChild(textWrapperNode);

        var textWrapperNodeTextNode = document.createElement("div");
        textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
        textWrapperNodeTextNode.innerHTML = this.data.name
        textWrapperNode.appendChild(textWrapperNodeTextNode);

        var textWrapperNodeTextNode = document.createElement("div");
        textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
        textWrapperNodeTextNode.innerHTML = this.data.race
        textWrapperNode.appendChild(textWrapperNodeTextNode);

        var textWrapperNodeTextNode = document.createElement("div");
        textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
        textWrapperNodeTextNode.innerHTML = this.data.active_spec_name + " " + this.data.class
        textWrapperNode.appendChild(textWrapperNodeTextNode);


        for (const [key, value] of Object.entries(this.data.raid_progression)) {
            var textWrapperNode = document.createElement("div");
            textWrapperNode.className = "mmm-rio-wrapper-text-wrapper";
            listItemNode.appendChild(textWrapperNode);

            var textWrapperNodeTextNode = document.createElement("div");
            textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
            textWrapperNodeTextNode.innerHTML = this.normalizeTitle(key)
            textWrapperNode.appendChild(textWrapperNodeTextNode);

            var textWrapperNodeTextNode = document.createElement("div");
            textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
            textWrapperNodeTextNode.innerHTML = "Mythic: \t" + value.mythic_bosses_killed + "/" + value.total_bosses;

            if (value.mythic_bosses_killed == value.total_bosses) {
                textWrapperNodeTextNode.className += " mmm-rio-complete"
            }

            textWrapperNode.appendChild(textWrapperNodeTextNode);

            var textWrapperNodeTextNode = document.createElement("div");
            textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
            textWrapperNodeTextNode.innerHTML = "Heroic: \t" + value.heroic_bosses_killed + "/" + value.total_bosses;

            if (value.heroic_bosses_killed == value.total_bosses) {
                textWrapperNodeTextNode.className += " mmm-rio-complete"
            }

            textWrapperNode.appendChild(textWrapperNodeTextNode);

            var textWrapperNodeTextNode = document.createElement("div");
            textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
            textWrapperNodeTextNode.innerHTML = "Normal: \t" + value.normal_bosses_killed + "/" + value.total_bosses;

            if (value.normal_bosses_killed == value.total_bosses) {
                textWrapperNodeTextNode.className += " mmm-rio-complete"
            }

            textWrapperNode.appendChild(textWrapperNodeTextNode);
        }

        var rioScoreNode = document.createElement("div");
        rioScoreNode.className = "mmm-rio-wrapper-score";

        if (this.data.mythic_plus_scores_by_season[0]) {
            var rioScore = this.data.mythic_plus_scores_by_season[0].scores.all;
            rioScoreNode.innerHTML = rioScore;
        }

        listItemNode.appendChild(rioScoreNode);

        return wrapper;
    },

    updateScore: function () {
        var url = this.config.apiBase + getParams();
        var self = this;
        var retry = true;
        var raiderRequest = new XMLHttpRequest();
        raiderRequest.open("GET", url, true);
        raiderRequest.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    self.processResponse(JSON.parse(this.response));
                } else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    retry = true;
                } else {
                    console.log(self.name + ": Could not load Raider IO Score.");
                }

                if (retry) {
                    self.scheduleUpdate(self.loaded ? -1 : self.config.retryDelay);
                }
            }
        };
        raiderRequest.send();
    },

    getParams: function () {
        var params = "?";
        if (this.config.region) {
            params += "region=" + this.config.region;
        }
        if (this.config.realm) {
            if (params.substring(params.length - 1) != "?") {
                params += "&";
            }
            params += "realm=" + this.config.realm;
        }
        if (this.config.name) {
            if (params.substring(params.length - 1) != "?") {
                params += "&";
            }
            params += "name=" + this.config.name;
        } else {
            this.hide(this.config.animationSpeed, { lockString: this.identifier });
            return;
        }
    
        params += "&fields=raid_progression%2Cmythic_plus_scores_by_season%3Acurrent"
        return params;
    },

    processResponse: function (data) {
        //Log.log(data);
        this.data = data;
        this.show(this.config.animationSpeed, { lockString: this.identifier });
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
    },

    scheduleUpdate: function (delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }
        var self = this;
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(function () {
            self.updateScore();
        }, nextLoad);
    }
});