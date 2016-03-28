# blogengine
A repo for a home-built blog engine, mostly just to experiment and get better at webdev (especially Node.js)


### Done

* Basic routing up and running, routing to index ('/'), blog permalinks ('/blog/:year/:month/:day/:filename), static pages ('/:pageFileName')
, and 404s.
* Dead-simple rendering engine, literally just replaces {{title}} and {{body}} and date things with stuff.
* A grossly-implemented blogroll with 5 posts on the main page, but NEEDS TO BE MANUALLY UPDATED IN postList.json!
* Metadata: at the top of all markdown pages for blog posts, include (IN ONE LINE!!!) '@@: "Title": "title", "OtherMetadata": "Other" :@@
* Month archive blogroll thing (like marco.org) though with same metadata problem as the index page.
* The weird metadata bug fixed
* Link posts/permalinks


### To do

* Literally 100% of the styling. It looks like garbage.
* Theme handling?
* Metadata
* Tags
* Search?
* Archive page
* ideally some sort of caching so it doesnt have to do a file read every goddamn time, and 5+ times whenever the index is hit. 
* Some sort of automaticity to the post updating, so it doesn't 
* Footnotes, probably.

### Post Formatting:

Start every post with post metadata, namely: 

* "@@: "Title": "PostTitle", "Date": "PostDate", "Link": "Link", "LinkPost": bool :@@"

If LinkPost is true, then also include the "Permalink": "PostPermalink" info in the meta data

Then start a separate line, and write whatever content you want in markdown (or html if ya nasty.)

