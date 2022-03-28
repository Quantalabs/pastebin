# Update repository with latest scripts

git pull
rm latest
cp ../dist/pastebin-linux ./latest
rm -rf templates/; mkdir templates/
cp ../templates/* templates/
echo 'Successfully installed latest'
