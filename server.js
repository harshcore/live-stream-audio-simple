const { parseFile } = require("music-metadata");
const express = require("express");
const Throttle = require("throttle");
const Fs = require("fs");
const axios = require("axios");
const { http, https } = require("follow-redirects");
const urls = require("./urls.json");
const { PassThrough } = require("stream");

const app = express();
let filePath = "./audio.mp3";
let bitRate = 0;
const streams = new Map();

app.get("/stream", (req, res) => {
  const { id, stream } = generateStream();
  res.setHeader("Content-Type", "audio/mpeg");
  stream.pipe(res);
  res.on("close", () => {
    streams.delete(id);
  });
});

app.get("/life", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const init = async () => {};

const playFile = (filePath) => {
  var randomIndex = Math.floor(Math.random() * urls.length);
  const url = urls[randomIndex];
  const request = https.get(url, (response) => {
    if (response.statusCode === 200) {
      const songReadable = response;

      const bitRate = 128 * 1024;
      const throttleTransformable = new Throttle(bitRate);
      songReadable.pipe(throttleTransformable);

      throttleTransformable.on("data", (chunk) => {
        broadcastToEveryStreams(chunk);
      });
      throttleTransformable.on("error", (e) => console.log(e));
      throttleTransformable.on("end", () => {
        playFile(filePath);
      });
    } else {
      console.error(
        "Failed to download the file. Status code:",
        response.statusCode
      );
    }
  });

  request.on("error", (error) => {
    console.error("Error downloading the file:", error);
  });
};

const broadcastToEveryStreams = (chunk) => {
  for (let [id, stream] of streams) {
    stream.write(chunk);
  }
};

const generateStream = () => {
  const id = Math.random().toString(36).slice(2);
  const stream = new PassThrough();
  streams.set(id, stream);
  return { id, stream };
};

init()
  .then(() =>
    app.listen(8000, () => {
      console.log("Server running on 8000");
    })
  )
  .then(() => playFile(filePath))
  .catch((error) => console.log(error));
