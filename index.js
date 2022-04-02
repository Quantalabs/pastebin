// Imports (native)
const http = require( 'http' )
const fs = require( 'fs' )

// Imports (external)
const formidable = require( 'formidable' )
const mime = require( 'mime-types' )
const path = require( 'path' )
const open = require( 'open' )
const qr = require( 'qrcode' )
const ip = require( 'ip' )
const mv = require( 'mv' )

// Constants (args)
const port = process.argv[2] || 8080
const host = process.argv[3] || ip.address()


// If uploads/ directory doesn't exist,
// create it
if ( !fs.existsSync( './uploads' ) ) fs.mkdirSync( './uploads' )

// Start the server
http.createServer( ( req, res ) => {

	console.log( `${req.method} ${req.url}` )

	// If request url is not '/',
	// host the file
	if ( req.url == '/fileupload' ) {

		var form = new formidable.IncomingForm()
		form.parse( req, ( err, fields, files ) => {

			var oldpath = files.filetoupload.filepath
			var newpath = './uploads/' + files.filetoupload.originalFilename
			mv( oldpath, newpath, ( err ) => {

				if ( err ) throw err

				// Generate QR code
				const fullURL = 'http://' + host + ':' + port + '/uploads/'
						      + files.filetoupload.originalFilename
				const shortURL = host + ':' + port + '/uploads/'
								 + files.filetoupload.originalFilename
				qr.toFile( './qrcode.png', fullURL )

				const html = '<img src=\'/qrcode.png\'/><br>'
							 + '<a href=\'/uploads/'
							 + `${files.filetoupload.originalFilename}'>`
							 + `${shortURL}</a><br>`
							 + '<p>File uploaded and moved!</p>'
							 + '<a href=\'/\'>Back to home</a>'

				// Read upload.html
				fs.readFile(

					'./templates/upload.html',
					'utf8',
					( err, data ) => {

						if ( err ) throw err
						const content = data.replace( '%CONTENT%', html )

						res.write( content )
						res.end()

					}
				)

			} )

		} )

	} else if ( req.url == '/download' ) {

		// If request url is '/download',
		// display links to download files

		let html = '<ul>'
		fs.readdir( './uploads', ( err, files ) => {

			if ( err ) throw err
			files.forEach( ( file ) => {

				html += `<li><a href="/uploads/${file}" download>${file}`
						+ '</a><br></li>'

			} )

		} )
		html += '</ul>'

		// Read home.html file
		fs.readFile(
			'./templates/download.html',
			'utf8',
			( err, data ) => {

				if ( err ) throw err
				let content = data

				content = content.replace( '%CONTENT%', html )
				res.write( content )
				res.end()

			}
		)

	} else if ( req.url !== '/' ) {

		// parse URL
		const parsedURL = new URL( req.url, 'http://' + host + ':' + port )

		// extract URL path
		const pathName = `.${parsedURL.pathname}`

		// based on the URL path, extract the file extension.
		// e.g. .js, .doc, ...
		const ext = path.parse( pathName ).ext

		if ( fs.existsSync( pathName ) ) {

			// Read file from system and prompt user to download the file
			fs.readFile( pathName, ( err, data ) => {

				if ( err ) {

					res.statusCode = 500
					res.end(
						`Error retrieving the file: ${err}.`
						+ `(Error: ${res.statusCode})`
					)

				} else {

					// If the file is found,
					// set Content-type and send data
					res.setHeader(
						'Content-type',
						mime.lookup( ext ) || 'text/plain'
					)
					res.end( data )

				}

			} )

		} else {

			// if the file is not found, return 404
			res.statusCode = 404
			res.end(
				`File ${pathName} not found! `
				+ `(Error: ${res.statusCode})`
			)

		}

	} else {

		res.writeHead( 200, { 'Content-Type': 'text/html' } )

		// Read template.html file synchronously
		fs.readFile( './templates/home.html', 'utf8', ( err, data ) => {

			if ( err ) throw err
			const content = data.replace(

				'%CONTENT%',

				'<form class="paste" action="fileupload" '
				+ 'method="post" enctype="multipart/form-data">\n'
				+ '<div class=\'input\'><input type="file" '
				+ 'name="filetoupload"><div>\n'
				+ '<br>\n'
				+ '<input type="submit">\n'
				+ '</for>'

			)
			res.write( content )
			res.end()

		} )

	}

} ).listen( parseInt( port ), host )

console.log( `Server listening on port http://${host}:${port}` )
open( `http://${host}:${port}` )
