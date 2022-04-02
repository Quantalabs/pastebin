pkg index.js -o dist/pastebin --targets node16-linux-x64,node16-macos-x64,node16-win-x64 --compress GZip
zip -r dist/linux.zip templates dist/pastebin-linux
zip -r dist/mac.zip templates dist/pastebin-macos
zip -r dist/win.zip templates dist/pastebin-win.exe
