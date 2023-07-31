// Imports (native)
const http = require("http")
const fs = require("fs");
const path = require("path");

// Imports (external)
const formidable = require("formidable");
const mime = require("mime-types");
const open = require("open");
const arg = require("arg");
const qr = require("qrcode");
const mv = require("mv");

// Helper funcs
const say = (msg, v = 1) => {
  if (v >= verbosity) console.log(msg);
};
const bool = () => true;
const ip = () => {
  const { networkInterfaces } = require("os");

  const networks = networkInterfaces();
  const res = {};

  for (const name of Object.keys(networks)) {
    for (const net of networks[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family == 4 && !net.internal) {
        if (!res[name]) res[name] = [];
        res[name].push(net.address);
      }
    }
  }

  let best = null;
  for (const name of Object.keys(res)) best = best || res[name];

  return best;
};

// Constants (args)
const args = arg({
  // long
  "--host": String,
  "--port": Number,
  "--quiet": arg.flag(bool),
  "--silent": arg.flag(bool),
  "--no-wipe": arg.flag(bool),
  "--no-open": arg.flag(bool),

  // short
  "-p": "--port",
  "-h": "--host",
  "-q": "--quiet",
  "-s": "--silent",
  "-w": "--no-wipe",
  "-o": "--no-open"
});

while (args._.length < 2) args._.push(null);

const host =
  process.env.PASTEBIN_HOST ||
  args["--host"] ||
  args._[0] ||
  ip() ||
  "localhost";
const port = process.env.PASTEBIN_PORT || 
  args["--port"] ||
  args._[1] || 
  8080;

const quiet = args["--quiet"] || false;
const silent = args["--silent"] || false;
const verbosity = silent ? 2 : quiet ? 1 : 0;

let wipe = !args["--no-wipe"];
let auto = !args["--no-open"];
if (wipe === null) wipe = true;
if (auto === null) auto = true;

// If uploads/ directory doesn't exist, create it
// Otherwise, wipe the directory
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
else if (wipe) {
  say("For security reasons, wiping uploads/ directory...");
  fs.readdirSync("./uploads").forEach(file =>
    fs.unlinkSync(`./uploads/${file}`)
  );
}

// Start the server
http
  .createServer((req, res) => {
    say(`${req.method} ${req.url}`, 0);

    // If request url is not '/',
    // host the file
    if (req.url == "/fileupload") {
      const form = new formidable.IncomingForm();
      form.parse(req, (_err, _fields, files) => {
        const oldpath = files.filetoupload.filepath;
        const newpath = "./uploads/" + files.filetoupload.originalFilename;
        mv(oldpath, newpath, err => {
          if (err) throw err;

          // Generate QR code
          const fullURL =
            "http://" +
            host +
            ":" +
            port +
            "/uploads/" +
            files.filetoupload.originalFilename;
          const shortURL =
            host +
            ":" +
            port +
            "/uploads/" +
            files.filetoupload.originalFilename;
          qr.toFile("./qrcode.png", fullURL);

          const html =
            "<img src='/qrcode.png'/><br>" +
            "<a href='/uploads/" +
            `${files.filetoupload.originalFilename}'>` +
            `${shortURL}</a><br>` +
            "<p>File uploaded and moved!</p>" +
            "<a href='/'>Back to home</a>";

          // Read upload.html
          fs.readFile("./templates/upload.html", "utf8", (err, data) => {
            if (err) throw err;
            const content = data.replace("%CONTENT%", html);

            res.write(content);
            res.end();
          });
        });
      });
    } else if (req.url == "/paste") {
      const form = new formidable.IncomingForm();
      form.parse(req, (_err, fields, _files) => {
        const bin = fields.bin;
        const filename = "uploads/_bin.txt";
        fs.writeFile(filename, bin, err => {
          if (err) throw err;
        });

        // Generate QR code
        const fullURL = "http://" + host + ":" + port + "/pasted";
        qr.toFile("./qrcode.png", fullURL);

        const html =
          "<img src='/qrcode.png'/><br>" +
          "<a href='/pasted'>" +
          "View upload</a><br>" +
          "<p>Content pasted and ready!</p>" +
          "<a href='/'>Back to home</a>";

        // Read upload.html
        fs.readFile("./templates/upload.html", "utf8", (err, data) => {
          if (err) throw err;
          const content = data.replace("%CONTENT%", html);

          res.write(content);
          res.end();
        });
      });
    } else if (req.url == "/download") {
      // If request url is '/download',
      // display links to download files

      let html = "<ul>";
      fs.readdir("./uploads", (err, files) => {
        if (err) throw err;
        files.forEach(file => {
          html +=
            `<li><a href="/uploads/${file}" download>${file}` + "</a><br></li>";
        });
      });
      html += "</ul>";

      // Read download.html file
      fs.readFile("./templates/download.html", "utf8", (err, data) => {
        if (err) throw err;
        let content = data;

        content = content.replace("%CONTENT%", html);
        res.write(content);
        res.end();
      });
    } else if (req.url == "/pasted") {
      // If request url is '/pasted',
      // display the pasted content

      let html = "";
      fs.readFile("./uploads/_bin.txt", "utf8", (err, data) => {
        if (err) throw err;
        html += data;
      });

      // Read pasted.html file
      fs.readFile("./templates/pasted.html", "utf8", (err, data) => {
        if (err) throw err;
        let content = data;

        content = content.replace("%CONTENT%", html);
        res.write(content);
        res.end();
      });
    } else if (req.url != "/") {
      // parse URL
      const parsedURL = new URL(req.url, "http://" + host + ":" + port);

      // extract URL path
      const pathName = `.${parsedURL.pathname}`;

      // based on the URL path, extract the file extension.
      // e.g. .js, .doc, ...
      const ext = path.parse(pathName).ext;

      if (fs.existsSync(pathName)) {
        // Read file from system and prompt user to download the file
        fs.readFile(pathName, (err, data) => {
          if (err) {
            res.statusCode = 500;
            res.end(
              `Error retrieving the file: ${err}.` +
                `(Error: ${res.statusCode})`
            );
          } else {
            // If the file is found,
            // set Content-type and send data
            res.setHeader("Content-type", mime.lookup(ext) || "text/plain");
            res.end(data);
          }
        });
      } else {
        // if the file is not found, return 404
        res.statusCode = 404;
        res.end(`File ${pathName} not found! ` + `(Error: ${res.statusCode})`);
      }
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });

      // Read template.html file synchronously
      fs.readFile("./templates/home.html", "utf8", (err, data) => {
        if (err) throw err;
        const content = data.replace(
          "%CONTENT%",

          `
				<form class="paste" action="paste" method="post" >
					<textarea id="bin" name="bin" 
					placeholder="Paste here with Ctrl+V">
					</textarea>
					<input id="go" type="submit" value="Go">
				</form>
				<br><br>
				<p id="sep">
					or
				</p>
				<div>
					<form class="file" action="fileupload" method="post" 
					enctype="multipart/form-data">
						<div class="input">
							<input id="file" type="file" name="filetoupload">
						</div>
						<span id="label" onclick="showInfo()">
							Click to upload
						</span>
						<br>
						<input type="submit">
					</form>
				</div>
				`
        );
        res.write(content);
        res.end();
      });
    }
  })
  .listen(parseInt(port), host);

say(`Server listening on port http://${host}:${port}`);
if (auto) open(`http://${host}:${port}`);

// End the server
process.on("SIGINT", () => {
  say("\nCaught interrupt signal; aborting...", 0);
  process.exit();
});
