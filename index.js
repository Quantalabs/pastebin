var http = require("http");
var formidable = require("formidable");
const url = require("url");
const fs = require("fs");
const path = require("path");
const port = process.argv[2] || 9000;

http
  .createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);

    // If request url is not '/', then host the file
    if (req.url == "/fileupload") {
      var form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        var oldpath = files.filetoupload.filepath;
        var newpath = "uploads" + files.filetoupload.originalFilename;
        fs.rename(oldpath, newpath, function (err) {
          if (err) throw err;
          res.write("File uploaded and moved!");
          res.end();
        });
      });
    }
    // If request url is '/download'
    else if (req.url == "/download") {
      // Display links to download files
      fs.readdir("./uploads", function (err, files) {
        if (err) throw err;
        files.forEach(function (file) {
          res.write(`<a href="/uploads/${file}" download>${file}</a><br>`);
        });
        res.end();
      });
    } else if (req.url !== "/") {
      // parse URL
      const parsedUrl = url.parse(req.url);
      // extract URL path
      let pathname = `.${parsedUrl.pathname}`;
      // based on the URL path, extract the file extension. e.g. .js, .doc, ...
      const ext = path.parse(pathname).ext;
      // maps file extension to MIME typere
      const map = {
        ".ico": "image/x-icon",
        ".html": "text/html",
        ".js": "text/javascript",
        ".json": "application/json",
        ".css": "text/css",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".svg": "image/svg+xml",
        ".pdf": "application/pdf",
        ".doc": "application/msword",
      };

      fs.exists(pathname, function (exist) {
        if (!exist) {
          // if the file is not found, return 404
          res.statusCode = 404;
          res.end(`File ${pathname} not found!`);
          return;
        }

        // Read file from system and prompt user to download the file
        fs.readFile(pathname, function (err, data) {
          if (err) {
            res.statusCode = 500;
            res.end(`Error getting the file: ${err}.`);
          } else {
            // if the file is found, set Content-type and send data
            res.setHeader("Content-type", map[ext] || "text/plain");
            res.end(data);
          }
        });
      });
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(
        '<form action="fileupload" method="post" enctype="multipart/form-data">'
      );
      res.write('<input type="file" name="filetoupload"><br>');
      res.write('<input type="submit">');
      res.write("</form>");
      return res.end();
    }
  })
  .listen(parseInt(port));

console.log(`Server listening on port ${port}`);
