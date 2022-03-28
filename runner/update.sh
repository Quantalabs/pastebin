# Update repository with latest scripts

git pull
rm latest
rm -rf templates
cp ../dist/linux.zip ./latest.zip
unzip latest.zip
rm latest.zip
mv dist/pastebin-linux ./latest
rm -rf dist
echo 'Successfully installed latest'
