const NodeHelper = require("node_helper");
const Jimp = require("jimp");
const path = require('path');
const fs = require('fs');

module.exports = NodeHelper.create({

    createBwImage: function (payload) {
        var createBwImages = [];
        var self = this;
        for (let i = 0; i < payload.length; i++) {
            const character = payload[i];
            let outImgName = character.name + "_" + character.realm;
            const outFile = path.join(__dirname, "/public/", outImgName + ".png");
            createBwImages.push(this.createFile(character, outFile));
        }

        Promise.all(createBwImages).then((values) => {
            self.sendSocketNotification("CREATED", values);
        });
    },

    createFile: function (character, outFile) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(outFile)) {
                Jimp.read(character.thumbnail_url, (err, image) => {
                    if (err) throw reject(err);
                    image.greyscale().write(outFile);
                    const regex = "\modules(.*)";
                    character.thumbnail_url = outFile.match(regex)[0];
                    resolve(character);
                });
            } else {
                const regex = "\modules(.*)";
                character.thumbnail_url = outFile.match(regex)[0];
                resolve(character);
            }

        });
    },

    //Subclass socketNotificationReceived received.
    socketNotificationReceived: function (notification, payload) {
        if (notification === "CREATE") {
            this.createBwImage(payload);
        }
    }
});