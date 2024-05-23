const { parseFile } = require("music-metadata");
const express = require("express");
const Throttle = require("throttle");
const Fs = require("fs");
const { PassThrough } = require("stream");

const app = express();
let filePath = "./audio.mp3"; // put your favorite audio file
let bitRate = 0;
const streams = new Map();
// app.use(express.static("public"));

app.get("/stream", (req, res) => {
  const { id, stream } = generateStream(); // We create a new stream for each new client
  res.setHeader("Content-Type", "audio/mpeg");
  stream.pipe(res); // the client stream is piped to the response
  res.on("close", () => {
    streams.delete(id);
  });
});

app.get("/life", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const init = async () => {
  const fileInfo = await parseFile(filePath);
  bitRate = fileInfo.format.bitrate / 8;
};

const playFile = (filePath) => {
  const songReadable = Fs.createReadStream(filePath);
  const throttleTransformable = new Throttle(bitRate);
  songReadable.pipe(throttleTransformable);
  throttleTransformable.on("data", (chunk) => {
    broadcastToEveryStreams(chunk);
  });
  throttleTransformable.on("error", (e) => console.log(e));
  throttleTransformable.on("end", () => {
    playFile(filePath); // Replay the file once it ends
  });
};

const broadcastToEveryStreams = (chunk) => {
  for (let [id, stream] of streams) {
    stream.write(chunk); // We write to the client stream the new chunk of data
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
