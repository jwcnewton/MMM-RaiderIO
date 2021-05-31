/* Magic Mirror
 * Module: RaiderIO
 * By Jonathan Newton
 */
Module.register("MMM-RaiderIO", {
    // Default module config.
    defaults: {
        data: {},
        
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

        for (let i = 0; i < this.data.length; i++) {
            const result = this.data[i];

            var listItemNode = document.createElement("li");
            listItemNode.className = "mmm-rio-wrapper-inner";

            wrapper.appendChild(listItemNode);

            var rioImg = document.createElement("img");
            rioImg.className = "mmm-rio-wrapper-img";
            rioImg.src = result.thumbnail_url;

            listItemNode.appendChild(rioImg);

            var textWrapperNode = document.createElement("div");
            textWrapperNode.className = "mmm-rio-wrapper-text-wrapper";

            if (this.config.compact) {
                textWrapperNode.className += "mmm-rio-compact-text mmm-rio-compact"
            }

            listItemNode.appendChild(textWrapperNode);

            var textWrapperNodeTextNode = document.createElement("div");
            textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
            textWrapperNodeTextNode.innerHTML = result.name
            textWrapperNode.appendChild(textWrapperNodeTextNode);

            var textWrapperNodeTextNode = document.createElement("div");
            textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";
            textWrapperNodeTextNode.innerHTML = result.race
            textWrapperNode.appendChild(textWrapperNodeTextNode);

            var textWrapperNodeTextNode = document.createElement("div");
            textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text";

            textWrapperNodeTextNode.innerHTML = result.active_spec_name + " " + result.class
            textWrapperNode.appendChild(textWrapperNodeTextNode);

            if (!this.config.compact) {
                for (const [key, value] of Object.entries(result.raid_progression)) {
                    var textWrapperNode = document.createElement("div");
                    textWrapperNode.className = "mmm-rio-wrapper-text-wrapper";
                    listItemNode.appendChild(textWrapperNode);

                    var textWrapperNodeTextNode = document.createElement("div");
                    textWrapperNodeTextNode.className = "mmm-rio-wrapper-text-wrapper-text mmm-rio-wrapper-text-wrapper-text-underline";
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
            }
            var rioScoreNode = document.createElement("div");
            rioScoreNode.className = "mmm-rio-wrapper-score";

            if (result.mythic_plus_scores_by_season[0]) {
                var rioScore = result.mythic_plus_scores_by_season[0].scores.all;
                rioScoreNode.innerHTML = rioScore;
            }

            listItemNode.appendChild(rioScoreNode);
        }
        return wrapper;
    },

    updateScore: function () {
        var self = this;
        var retry = true;

        var getCharArr = [];

        for (let i = 0; i < this.config.characters.length; i++) {
            const character = this.config.characters[i];
            getCharArr.push(this.httpRequest(character));
        }

        Promise.all(getCharArr).then((values) => {
            self.processResponse(values);
        }, (err) => {
            retry = false;
            
            if (err === 401) {
                self.updateDom(self.config.animationSpeed);
                retry = true;
            } else {
                console.log(self.name + ": Could not load Raider IO Score.");
            }
            if (retry) {
                self.scheduleUpdate(self.loaded ? -1 : self.config.retryDelay);
            }
        });
    },

    getParams: function (characterConfig) {
        var params = "?";
        if (characterConfig.region) {
            params += "region=" + characterConfig.region;
        }
        if (characterConfig.realm) {
            if (params.substring(params.length - 1) != "?") {
                params += "&";
            }
            params += "realm=" + characterConfig.realm;
        }
        if (characterConfig.name) {
            if (params.substring(params.length - 1) != "?") {
                params += "&";
            }
            params += "name=" + characterConfig.name;
        }

        params += "&fields=raid_progression%2Cmythic_plus_scores_by_season%3Acurrent"
        return params;
    },

    processResponse: function (data) {
        //Log.log(data);
        this.data = data;
        this.data.position = true;
        this.show(this.config.animationSpeed, { lockString: this.identifier });
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
    },

    httpRequest: function (characterConfig) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var url = that.config.apiBase + that.getParams(characterConfig);
            var raiderRequest = new XMLHttpRequest();
            raiderRequest.open("GET", url, true);
            raiderRequest.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        resolve(JSON.parse(this.response));
                    } else if (this.status === 401) {
                        reject();
                        retry = true;
                    } else {
                        console.log(self.name + ": Could not load Raider IO Score.");
                        reject(this.status);
                    }
                }
            };
            raiderRequest.send();
        });
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