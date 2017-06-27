echo Hello, welcome!
echo Enter the relative filepath where you want your blog directory to live:
read filepath
echo Building the directory structure at $filepath
cd $filepath
mkdir blog
mkdir config
mkdir drafts
mkdir page
mkdir static
cd blog
touch postList.json
cd ../config
touch app-config.json
touch description.md
touch navbar.md
touch site-config.json
export AM_FILEPATH=$filepath
echo Done!